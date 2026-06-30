"""Endpoints de tickets: CRUD e movimentação no quadro (drag-and-drop)."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.database import get_db
from app.core.security import usuario_atual
from app.services.eventos import registrar_evento
from app.services.auditoria import registrar_auditoria

router = APIRouter(prefix="/api/tickets", tags=["tickets"])


@router.get("")
def list_tickets(db: Session = Depends(get_db)):
    # Devolve dados achatados (com marca e modelo) que o card do front consome.
    rows = db.execute(text("""
        SELECT t.id, t.codigo_interno, t.titulo, t.problema, t.origem,
               t.numero_nf, t.codigo_rastreio, t.notas, t.serial_number,
               t.requer_contato_cliente, t.retorno_horas, t.retorno_definido_em,
               t.printer_model_id, t.quantidade, t.custo_unitario,
               t.supplier_id, t.defect_type_id, t.responsavel_id,
               t.desfecho_id, t.prejuizo_real,
               t.column_id, t.order_index, t.created_at, t.last_moved_at,
               b.name AS marca, b.name AS fabricante, m.name AS modelo,
               s.name AS fornecedor_nome,
               df.name AS defeito_nome,
               dsf.name AS desfecho_nome, dsf.impacto AS desfecho_impacto,
               u.nome AS responsavel_nome, u.username AS responsavel_username
        FROM tickets t
        JOIN printer_models m ON m.id = t.printer_model_id
        JOIN printer_brands b ON b.id = m.brand_id
        LEFT JOIN suppliers s ON s.id = t.supplier_id
        LEFT JOIN defect_types df ON df.id = t.defect_type_id
        LEFT JOIN desfechos dsf ON dsf.id = t.desfecho_id
        LEFT JOIN users u ON u.id = t.responsavel_id
        ORDER BY t.order_index
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.post("", response_model=schemas.TicketOut)
def create_ticket(p: schemas.TicketIn,
                  user: models.User = Depends(usuario_atual),
                  db: Session = Depends(get_db)):
    model = db.query(models.PrinterModel).get(p.printer_model_id)
    if not model:
        raise HTTPException(400, "Modelo de impressora inválido.")

    # Responsável é obrigatório e precisa ser um usuário válido.
    if not p.responsavel_id:
        raise HTTPException(400, "Informe o responsável pelo ticket.")
    if not db.query(models.User).get(p.responsavel_id):
        raise HTTPException(400, "Responsável inválido.")

    ticket = models.Ticket(
        **p.model_dump(),
        # Snapshot: congela o preço atual do modelo dentro do ticket.
        # A partir daqui o prejuízo deste ticket não muda com reajustes.
        custo_unitario=model.current_price,
        # Numeração interna legível (ex.: GAR-2026-0001), sequencial por ano.
        codigo_interno=_proximo_codigo(db),
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
    registrar_auditoria(db, user, "criar", "ticket",
                        f"Criou o ticket {ticket.codigo_interno} — \"{ticket.titulo}\".")
    db.commit()
    db.refresh(ticket)
    return ticket


def _proximo_codigo(db: Session) -> str:
    """Gera o próximo código interno do ano, no formato GAR-ANO-NNNN.

    O contador zera a cada ano. Conta quantos tickets do ano já existem e soma 1.
    """
    ano = datetime.utcnow().year
    prefixo = f"GAR-{ano}-"
    # Maior sequencial já usado neste ano (busca pelos códigos do ano).
    ultimo = (db.query(models.Ticket.codigo_interno)
              .filter(models.Ticket.codigo_interno.like(f"{prefixo}%"))
              .order_by(models.Ticket.codigo_interno.desc())
              .first())
    if ultimo and ultimo[0]:
        try:
            seq = int(ultimo[0].split("-")[-1]) + 1
        except ValueError:
            seq = 1
    else:
        seq = 1
    return f"{prefixo}{seq:04d}"


@router.patch("/{ticket_id}", response_model=schemas.TicketOut)
def update_ticket(ticket_id: str, p: schemas.TicketUpdate,
                  user: models.User = Depends(usuario_atual),
                  db: Session = Depends(get_db)):
    t = db.query(models.Ticket).get(ticket_id)
    if not t:
        raise HTTPException(404, "Ticket não encontrado.")

    dados = p.model_dump(exclude_unset=True)
    # Se o prazo de retorno mudou, reinicia a contagem a partir de agora.
    if "retorno_horas" in dados and dados["retorno_horas"] != t.retorno_horas:
        t.retorno_definido_em = datetime.utcnow() if dados["retorno_horas"] else None

    # Detecta mudança de desfecho para registrar na timeline.
    desfecho_mudou = ("desfecho_id" in dados
                      and dados["desfecho_id"] != t.desfecho_id)

    for k, v in dados.items():
        setattr(t, k, v)

    if desfecho_mudou and t.desfecho_id:
        desf = db.query(models.Desfecho).get(t.desfecho_id)
        registrar_evento(db, t.id, models.TIPO_DESFECHO,
                         f"Desfecho definido: \"{desf.name if desf else '—'}\".",
                         autor_id=user.id)

    registrar_auditoria(db, user, "editar", "ticket",
                        f"Editou o ticket {t.codigo_interno}.")
    db.commit()
    db.refresh(t)
    return t


@router.put("/{ticket_id}/move", response_model=schemas.TicketOut)
def move_ticket(ticket_id: str, p: schemas.MoveIn,
                user: models.User = Depends(usuario_atual),
                db: Session = Depends(get_db)):
    """Move o card ao ser solto em outra coluna ou reordenado.

    Só grava no histórico se a COLUNA mudou — reordenar dentro da mesma
    coluna não conta como transição de etapa e não afeta os cálculos de SLA.
    """
    t = db.query(models.Ticket).get(ticket_id)
    if not t:
        raise HTTPException(404, "Ticket não encontrado.")

    if t.column_id != p.to_column_id:
        # Ao mover para uma coluna de conclusão, o desfecho é obrigatório —
        # garante que nenhum ticket concluído fique sem classificação (e que as
        # análises de prejuízo não fiquem enviesadas).
        destino = db.query(models.BoardColumn).get(p.to_column_id)
        if destino and destino.is_done and not t.desfecho_id:
            raise HTTPException(
                400,
                "Para concluir este ticket, informe primeiro o desfecho "
                "(abra o ticket e selecione o desfecho).")
        origem = db.query(models.BoardColumn).get(t.column_id)
        db.add(models.TicketHistory(
            ticket_id=t.id,
            from_column_id=t.column_id,
            to_column_id=p.to_column_id,
        ))
        # Evento na timeline.
        registrar_evento(
            db, t.id, models.TIPO_MOVIMENTO,
            f"Movido de \"{origem.name if origem else '—'}\" para "
            f"\"{destino.name if destino else '—'}\".",
            autor_id=user.id)
        registrar_auditoria(
            db, user, "mover", "ticket",
            f"Moveu o ticket {t.codigo_interno} para "
            f"\"{destino.name if destino else '—'}\".")
        t.column_id = p.to_column_id
        t.last_moved_at = datetime.utcnow()  # reseta o cronômetro de inatividade

    t.order_index = p.new_order_index
    db.commit()
    db.refresh(t)
    return t


@router.put("/{ticket_id}/registrar-contato", response_model=schemas.TicketOut)
def registrar_contato(ticket_id: str,
                      user: models.User = Depends(usuario_atual),
                      db: Session = Depends(get_db)):
    """Registra que o contato com o cliente foi FEITO. Desliga a necessidade de
    contato (o aviso some) e o ticket volta a contar pelo SLA normal da coluna.

    Se o usuário quiser agendar um próximo contato, usa o campo de prazo de
    retorno (snooze) na edição do ticket — esse é o fluxo separado.
    """
    t = db.query(models.Ticket).get(ticket_id)
    if not t:
        raise HTTPException(404, "Ticket não encontrado.")
    # Contato realizado: desliga o aviso e limpa o prazo de retorno individual.
    t.requer_contato_cliente = 0
    t.retorno_horas = None
    t.retorno_definido_em = None
    t.last_moved_at = datetime.utcnow()  # reinicia o cronômetro do SLA da coluna
    registrar_evento(db, t.id, models.TIPO_CONTATO,
                     "Contato com o cliente registrado.",
                     autor_id=user.id)
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
