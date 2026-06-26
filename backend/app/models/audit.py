"""Log de auditoria: registra ações dos usuários (quem fez o quê e quando).

Tabela central e simples. Cada linha = uma ação relevante no sistema, com o
autor, o tipo de ação, a entidade afetada e uma descrição legível.
"""
from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    autor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    autor_nome = Column(String(120), nullable=True)  # snapshot do nome (caso o user suma)
    acao = Column(String(40), nullable=False)        # ex: criar, editar, excluir, login
    entidade = Column(String(40), nullable=False)    # ex: ticket, usuario, catalogo
    descricao = Column(Text, nullable=False)         # texto legível do que ocorreu
    criado_em = Column(DateTime(timezone=True), default=datetime.utcnow)

    autor = relationship("User")
