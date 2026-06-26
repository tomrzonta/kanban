"""Endpoints da timeline do ticket: listar eventos e adicionar comentários."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import models
from app.core.database import get_db
from app.core.security import usuario_atual
from app.services.eventos import registrar_evento

router = APIRouter(prefix="/api/tickets", tags=["eventos"])


class ComentarioIn(BaseModel):
    texto: str


@router.get("/{ticket_id}/eventos")
def listar_eventos(ticket_id: str, db: Session = Depends(get_db)):
    """Timeline do ticket: comentários + eventos automáticos, mais recentes 1º."""
    rows = db.execute(text("""
        SELECT e.id, e.tipo, e.texto, e.criado_em,
               COALESCE(u.nome, u.username) AS autor
        FROM ticket_eventos e
        LEFT JOIN users u ON u.id = e.autor_id
        WHERE e.ticket_id = :tid
        ORDER BY e.criado_em DESC, e.id DESC
    """), {"tid": ticket_id}).mappings().all()
    return [dict(r) for r in rows]


@router.post("/{ticket_id}/eventos")
def adicionar_comentario(ticket_id: str, p: ComentarioIn,
                         user: models.User = Depends(usuario_atual),
                         db: Session = Depends(get_db)):
    if not p.texto.strip():
        raise HTTPException(400, "O comentário não pode ficar vazio.")
    if not db.query(models.Ticket).get(ticket_id):
        raise HTTPException(404, "Ticket não encontrado.")
    registrar_evento(db, ticket_id, models.TIPO_COMENTARIO,
                     p.texto.strip(), autor_id=user.id)
    db.commit()
    return {"ok": True}
