"""Reexporta todos os modelos para que Base.metadata os conheça ao criar tabelas."""
from app.models.catalog import (
    PrinterBrand, PrinterModel, Supplier, DefectType, Desfecho,
    IMPACTO_SEM_PREJUIZO, IMPACTO_TOTAL, IMPACTO_PARCIAL, IMPACTOS,
)
from app.models.kanban import (
    BoardColumn, StatusTag, Attachment, Ticket, TicketHistory,
    OrigemReclamacao, ticket_tags,
)
from app.models.user import User
from app.models.recebimento import Recebimento, CONDICOES
from app.models.ticket_evento import (
    TicketEvento, TIPO_COMENTARIO, TIPO_MOVIMENTO, TIPO_RECEBIMENTO,
    TIPO_DESFECHO, TIPO_CONTATO,
)
from app.models.audit import AuditLog
from app.models.kb import KbArtigo

__all__ = [
    "PrinterBrand", "PrinterModel", "Supplier", "DefectType", "Desfecho",
    "IMPACTO_SEM_PREJUIZO", "IMPACTO_TOTAL", "IMPACTO_PARCIAL", "IMPACTOS",
    "BoardColumn", "StatusTag", "Attachment", "Ticket", "TicketHistory",
    "OrigemReclamacao", "ticket_tags", "User", "Recebimento", "CONDICOES",
    "TicketEvento", "TIPO_COMENTARIO", "TIPO_MOVIMENTO", "TIPO_RECEBIMENTO",
    "TIPO_DESFECHO", "TIPO_CONTATO", "AuditLog", "KbArtigo",
]
