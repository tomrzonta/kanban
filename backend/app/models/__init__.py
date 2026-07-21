"""Reexporta todos os modelos para que Base.metadata os conheça ao criar tabelas."""
from app.models.catalog import (
    PrinterBrand, PrinterModel, Supplier, DefectType, Desfecho,
    IMPACTO_SEM_PREJUIZO, IMPACTO_TOTAL, IMPACTO_PARCIAL, IMPACTO_INFORMATIVO, IMPACTOS,
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
from app.models.compra import Compra
from app.models.gasto import CategoriaGasto, GastoTicket
from app.models.retida import (EstadoRetida, ImpressoraRetida, RetidaHistorico,
                                RetidaPeca, RetidaNota, PecaPadrao)
from app.models.checklist import (ChecklistComponente, ModeloChecklist,
                                   RecebimentoChecklist)

__all__ = [
    "PrinterBrand", "PrinterModel", "Supplier", "DefectType", "Desfecho",
    "IMPACTO_SEM_PREJUIZO", "IMPACTO_TOTAL", "IMPACTO_PARCIAL", "IMPACTO_INFORMATIVO", "IMPACTOS",
    "BoardColumn", "StatusTag", "Attachment", "Ticket", "TicketHistory",
    "OrigemReclamacao", "ticket_tags", "User", "Recebimento", "CONDICOES",
    "TicketEvento", "TIPO_COMENTARIO", "TIPO_MOVIMENTO", "TIPO_RECEBIMENTO",
    "TIPO_DESFECHO", "TIPO_CONTATO", "AuditLog", "KbArtigo", "Compra",
    "CategoriaGasto", "GastoTicket",
    "EstadoRetida", "ImpressoraRetida", "RetidaHistorico", "RetidaPeca",
    "RetidaNota", "PecaPadrao",
    "ChecklistComponente", "ModeloChecklist", "RecebimentoChecklist",
]
