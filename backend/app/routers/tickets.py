"""Endpoints de tickets: CRUD e movimentação no quadro (drag-and-drop)."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.database import get_db

router = APIRouter(prefix="/api/tickets", tags=["tickets"])


@router.get("")
def list_tickets(db: Session = Depends(get_db)):
    # Devolve dados achatados (com marca e modelo) que o card do front consome.
    rows = db.execute(text("""
        SELECT t.id, t.titulo, t.problema, t.origem,
               t.numero_nf, t.codigo_rastreio, t.notas, t.serial_number,
               t.requer_contato_cliente, t.retorno_horas, t.retorno_definido_em,
               t.printer_model_id, t.quantidade, t.custo_unitario,
               t.supplier_id, t.defect_type_id,
               t.column_id, t.order_index, t.created_at, t.last_moved_at,
               b.name AS marca, b.name AS fabricante, m.name AS modelo,
               s.name AS fornecedor_nome,
               df.name AS defeito_nome
        FROM tickets t
        JOIN printer_models m ON m.id = t.printer_model_id
        JOIN printer_brands b ON b.id = m.brand_id
        LEFT JOIN suppliers s ON s.id = t.supplier_id
        LEFT JOIN defect_types df ON df.id = t.defect_type_id
        ORDER BY t.order_index
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.post("", response_model=schemas.TicketOut)
def create_ticket(p: schemas.TicketIn, db: Session = Depends(get_db)):
    model = db.query(models.PrinterModel).get(p.printer_model_id)
    if not model:
        raise HTTPException(400, "Modelo de impressora inválido.")

    ticket = models.Ticket(
        **p.model_dump(),
        # Snapshot: congela o preço atual do modelo dentro do ticket.
        # A partir daqui o prejuízo deste ticket não muda com reajustes.
        custo_unitario=model.current_price,
    )
    # Se já vem com prazo de retorno, marca o instante de referência (a contagem
    # das horas começa daqui).
    if p.retorno_horas:
        ticket.retorno_definido_em = datetime.utcnow()
    db.add(ticket)
    db.flush()  # garante o ticket.id antes de gravar o histórico

    # Histórico: linha inicial. from_column=None indica a entrada no fluxo.
    db.add(models.TicketHistory(
        ticket_id=ticket.id,
        from_column_id=None,
        to_column_id=ticket.column_id,
    ))
    db.commit()
    db.refresh(ticket)
    return ticket


@router.patch("/{ticket_id}", response_model=schemas.TicketOut)
def update_ticket(ticket_id: str, p: schemas.TicketUpdate,
                  db: Session = Depends(get_db)):
    t = db.query(models.Ticket).get(ticket_id)
    if not t:
        raise HTTPException(404, "Ticket não encontrado.")

    dados = p.model_dump(exclude_unset=True)
    # Se o prazo de retorno mudou, reinicia a contagem a partir de agora.
    if "retorno_horas" in dados and dados["retorno_horas"] != t.retorno_horas:
        t.retorno_definido_em = datetime.utcnow() if dados["retorno_horas"] else None

    for k, v in dados.items():
        setattr(t, k, v)
    db.commit()
    db.refresh(t)
    return t


@router.put("/{ticket_id}/move", response_model=schemas.TicketOut)
def move_ticket(ticket_id: str, p: schemas.MoveIn,
                db: Session = Depends(get_db)):
    """Move o card ao ser solto em outra coluna ou reordenado.

    Só grava no histórico se a COLUNA mudou — reordenar dentro da mesma
    coluna não conta como transição de etapa e não afeta os cálculos de SLA.
    """
    t = db.query(models.Ticket).get(ticket_id)
    if not t:
        raise HTTPException(404, "Ticket não encontrado.")

    if t.column_id != p.to_column_id:
        db.add(models.TicketHistory(
            ticket_id=t.id,
            from_column_id=t.column_id,
            to_column_id=p.to_column_id,
        ))
        t.column_id = p.to_column_id
        t.last_moved_at = datetime.utcnow()  # reseta o cronômetro de inatividade

    t.order_index = p.new_order_index
    db.commit()
    db.refresh(t)
    return t


@router.put("/reorder")
def reorder_tickets(p: schemas.ReorderIn, db: Session = Depends(get_db)):
    """Regrava a ordem (order_index) dos tickets de uma coluna, em lote.

    Recebe a sequência completa de IDs na nova ordem e atribui índices 0, 1, 2…
    conforme a posição. É só priorização visual: NÃO grava histórico nem mexe
    no SLA. Garante índices únicos e consistentes (evita duplicados).
    """
    for posicao, tid in enumerate(p.ticket_ids):
        (db.query(models.Ticket)
         .filter_by(id=tid, column_id=p.column_id)
         .update({"order_index": posicao}))
    db.commit()
    return {"ok": True, "total": len(p.ticket_ids)}
