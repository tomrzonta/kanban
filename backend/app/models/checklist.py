"""Checklist de recebimento por modelo de impressora.

- ChecklistComponente: lista de componentes disponíveis (gerenciável, separada
  das peças canibalizáveis).
- ModeloChecklist: quais componentes compõem o checklist de cada modelo.
- RecebimentoChecklist: o checklist preenchido no momento do recebimento
  (componente + estado + comentário).
"""
from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey

from app.core.database import Base


class ChecklistComponente(Base):
    """Componente que pode entrar em checklists (gerenciável no Catálogo)."""
    __tablename__ = "checklist_componentes"

    id = Column(Integer, primary_key=True)
    name = Column(String(160), nullable=False, unique=True)
    active = Column(Integer, nullable=False, default=1)
    ordem = Column(Integer, nullable=False, default=0)


class ModeloChecklist(Base):
    """Associação: um componente faz parte do checklist de um modelo."""
    __tablename__ = "modelo_checklist"

    id = Column(Integer, primary_key=True)
    modelo_id = Column(Integer, ForeignKey("printer_models.id"),
                       nullable=False, index=True)
    componente_id = Column(Integer, ForeignKey("checklist_componentes.id"),
                           nullable=False)
    ordem = Column(Integer, nullable=False, default=0)


class RecebimentoChecklist(Base):
    """Item de checklist preenchido num recebimento."""
    __tablename__ = "recebimento_checklist"

    id = Column(Integer, primary_key=True)
    recebimento_id = Column(Integer, ForeignKey("recebimentos.id"),
                            nullable=False, index=True)
    componente_nome = Column(String(160), nullable=False)  # snapshot do nome
    estado = Column(String(40), nullable=False)
    comentario = Column(Text, nullable=True)
    criado_em = Column(DateTime(timezone=True), default=datetime.utcnow)
