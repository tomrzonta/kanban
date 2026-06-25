"""Entrada de recebimento (RMA): registra a chegada física de uma impressora
com defeito, sempre vinculada a um ticket existente.

Um ticket pode ter várias entradas (recebimentos parciais/repetidos). O
fabricante/modelo não são guardados aqui — vêm do ticket vinculado.
"""
import uuid
from datetime import date

from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


# Condições possíveis do item recebido (lista fixa).
CONDICOES = ["Conforme esperado", "Dano adicional", "Incompleto",
             "Sem defeito constatado", "Outro"]


class Recebimento(Base):
    __tablename__ = "recebimentos"

    id = Column(Integer, primary_key=True)
    ticket_id = Column(UUID(as_uuid=True),
                       ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    data_recebimento = Column(Date, nullable=False, default=date.today)
    numero_nf = Column(String(60), nullable=True)
    quantidade = Column(Integer, nullable=False, default=1)
    condicao = Column(String(60), nullable=False)       # um dos CONDICOES
    observacao = Column(Text, nullable=True)            # detalhe livre
    criado_por_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    ticket = relationship("Ticket")
    criado_por = relationship("User")
