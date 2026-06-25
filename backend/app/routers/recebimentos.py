"""Endpoints de recebimento (RMA): registrar a chegada de impressoras com
defeito, vinculadas a tickets, e mover o ticket para a coluna de 'recebido'.
"""
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import models
from app.core.database import get_db
from app.core.security import usuario_atual

router = APIRouter(prefix="/api/recebimentos", tags=["recebimentos"])


class RecebimentoIn(BaseModel):
    ticket_id: str
    data_recebimento: date | None = None
    numero_nf: str | None = None
    quantidade: int = 1
    condicao: str
    observacao: str | None = None


@router.get("/condicoes")
def condicoes():
    """Lista fixa de condições possíveis (para o select do formulário)."""
    return models.CONDICOES


@router.get("/tickets-abertos")
def tickets_abertos(q: str | None = None, db: Session = Depends(get_db)):
    """Tickets que NÃO estão em coluna de conclusão — candidatos a receber RMA.

    Com `q`, filtra por código interno, título, nº de série ou modelo (busca no
    banco, sem trazer todos). Limita a 20 resultados para a lista ficar curta.
    """
    base = """
        SELECT t.id, t.codigo_interno, t.titulo, t.serial_number,
               b.name AS fabricante, m.name AS modelo
        FROM tickets t
        JOIN printer_models m ON m.id = t.printer_model_id
        JOIN printer_brands b ON b.id = m.brand_id
        JOIN columns c ON c.id = t.column_id
        WHERE COALESCE(c.is_done, 0) = 0
    """
    params = {}
    if q and q.strip():
        # ILIKE = busca sem diferenciar maiúsc/minúsc. Procura em vários campos.
        base += """
          AND (
            t.codigo_interno ILIKE :q OR t.titulo ILIKE :q
            OR t.serial_number ILIKE :q OR m.name ILIKE :q OR b.name ILIKE :q
          )
        """
        params["q"] = f"%{q.strip()}%"
    base += " ORDER BY t.codigo_interno DESC NULLS LAST LIMIT 20"
    rows = db.execute(text(base), params).mappings().all()
    return [dict(r) for r in rows]


@router.get("")
def listar(db: Session = Depends(get_db)):
    """Lista todas as entradas de recebimento, com dados do ticket."""
    rows = db.execute(text("""
        SELECT r.id, r.data_recebimento, r.numero_nf, r.quantidade,
               r.condicao, r.observacao,
               u.nome AS criado_por_nome, u.username AS criado_por_username,
               -- Dados completos do ticket, para abrir o detalhe ao clicar.
               t.id AS ticket_id, t.codigo_interno, t.titulo, t.problema,
               t.origem, t.numero_nf AS ticket_nf, t.codigo_rastreio, t.notas,
               t.serial_number, t.requer_contato_cliente, t.retorno_horas,
               t.retorno_definido_em, t.printer_model_id, t.quantidade AS ticket_qtd,
               t.custo_unitario, t.supplier_id, t.defect_type_id, t.responsavel_id,
               t.column_id, t.order_index, t.created_at, t.last_moved_at,
               b.name AS marca, b.name AS fabricante, m.name AS modelo,
               s.name AS fornecedor_nome, df.name AS defeito_nome,
               ru.nome AS responsavel_nome, ru.username AS responsavel_username
        FROM recebimentos r
        JOIN tickets t ON t.id = r.ticket_id
        JOIN printer_models m ON m.id = t.printer_model_id
        JOIN printer_brands b ON b.id = m.brand_id
        LEFT JOIN suppliers s ON s.id = t.supplier_id
        LEFT JOIN defect_types df ON df.id = t.defect_type_id
        LEFT JOIN users u ON u.id = r.criado_por_id
        LEFT JOIN users ru ON ru.id = t.responsavel_id
        ORDER BY r.data_recebimento DESC, r.id DESC
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.post("")
def criar(p: RecebimentoIn, user: models.User = Depends(usuario_atual),
          db: Session = Depends(get_db)):
    ticket = db.query(models.Ticket).get(p.ticket_id)
    if not ticket:
        raise HTTPException(404, "Ticket não encontrado.")
    if p.condicao not in models.CONDICOES:
        raise HTTPException(400, "Condição inválida.")

    rec = models.Recebimento(
        ticket_id=p.ticket_id,
        data_recebimento=p.data_recebimento or date.today(),
        numero_nf=p.numero_nf,
        quantidade=p.quantidade,
        condicao=p.condicao,
        observacao=p.observacao,
        criado_por_id=user.id,
    )
    db.add(rec)

    # Move o ticket para a coluna marcada como 'recebido', se houver uma.
    coluna_recebido = (db.query(models.BoardColumn)
                       .filter_by(is_received=1).first())
    moveu = False
    if coluna_recebido and ticket.column_id != coluna_recebido.id:
        origem = ticket.column_id
        ticket.column_id = coluna_recebido.id
        ticket.last_moved_at = datetime.utcnow()
        db.add(models.TicketHistory(
            ticket_id=ticket.id,
            from_column_id=origem,
            to_column_id=coluna_recebido.id,
        ))
        moveu = True

    db.commit()
    db.refresh(rec)
    return {"id": rec.id, "moveu_ticket": moveu,
            "coluna_destino": coluna_recebido.name if (coluna_recebido and moveu) else None,
            "aviso": None if coluna_recebido else
                     "Nenhuma coluna marcada como 'recebido' — a entrada foi "
                     "registrada, mas o ticket não foi movido."}
