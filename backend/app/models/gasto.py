"""Gastos discriminados por ticket.

Um ticket pode ter vários gastos (frete reverso, reenvio, peça, mão de obra…),
cada um com categoria, valor e descrição. A soma dos gastos de um ticket é o
prejuízo efetivo dele quando o desfecho tem impacto parcial ou total.

As categorias são gerenciáveis no Catálogo (tabela própria).
"""
from datetime import datetime

from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class CategoriaGasto(Base):
    __tablename__ = "categorias_gasto"

    id = Column(Integer, primary_key=True)
    name = Column(String(80), nullable=False, unique=True)
    active = Column(Integer, nullable=False, default=1)


class GastoTicket(Base):
    __tablename__ = "gastos_ticket"

    id = Column(Integer, primary_key=True)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"),
                       nullable=False, index=True)
    categoria_id = Column(Integer, ForeignKey("categorias_gasto.id"),
                          nullable=True)
    valor = Column(Numeric(10, 2), nullable=False, default=0)
    descricao = Column(String(300), nullable=True)
    criado_em = Column(DateTime(timezone=True), default=datetime.utcnow)
