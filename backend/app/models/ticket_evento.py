"""Eventos do ticket: a linha do tempo de atividades, combinando anotações
manuais (comentários) e eventos automáticos (mudou de coluna, recebeu RMA,
definiu desfecho).

Um único fluxo cronológico, diferenciado pelo campo 'tipo'.
"""
from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


# Tipos de evento na timeline.
TIPO_COMENTARIO = "comentario"   # anotação manual de um usuário
TIPO_MOVIMENTO = "movimento"     # mudança de coluna
TIPO_RECEBIMENTO = "recebimento" # entrada de RMA
TIPO_DESFECHO = "desfecho"       # desfecho definido/alterado
TIPO_CONTATO = "contato"         # contato com cliente registrado


class TicketEvento(Base):
    __tablename__ = "ticket_eventos"

    id = Column(Integer, primary_key=True)
    ticket_id = Column(UUID(as_uuid=True),
                       ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(String(20), nullable=False, default=TIPO_COMENTARIO)
    texto = Column(Text, nullable=False)        # conteúdo / descrição do evento
    autor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    criado_em = Column(DateTime(timezone=True), default=datetime.utcnow)

    autor = relationship("User")
