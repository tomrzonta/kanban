"""Reexporta todos os modelos para que Base.metadata os conheça ao criar tabelas."""
from app.models.catalog import (
    PrinterBrand, PrinterModel, Supplier, DefectType,
)
from app.models.kanban import (
    BoardColumn, StatusTag, Attachment, Ticket, TicketHistory,
    OrigemReclamacao, ticket_tags,
)
from app.models.user import User
from app.models.recebimento import Recebimento, CONDICOES

__all__ = [
    "PrinterBrand", "PrinterModel", "Supplier", "DefectType",
    "BoardColumn", "StatusTag", "Attachment", "Ticket", "TicketHistory",
    "OrigemReclamacao", "ticket_tags", "User", "Recebimento", "CONDICOES",
]
