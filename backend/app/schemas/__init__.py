"""Schemas Pydantic: contratos de entrada/saída da API.

Separar os schemas dos models evita expor a estrutura interna do banco e
permite validar payloads antes de tocar no ORM.
"""
from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, ConfigDict

from app.models.kanban import OrigemReclamacao


# ---------- Catálogo ----------
class BrandIn(BaseModel):
    name: str


class BrandOut(BrandIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    active: int


class ModelIn(BaseModel):
    brand_id: int
    name: str
    sku: str | None = None
    current_price: Decimal


class ModelUpdate(BaseModel):
    name: str | None = None
    sku: str | None = None
    current_price: Decimal | None = None
    active: int | None = None


class ModelOut(ModelIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    active: int


# ---------- Colunas ----------
class ColumnIn(BaseModel):
    name: str
    order_index: int = 0
    sla_hours: int | None = None
    is_waiting_client: int = 0
    is_done: int = 0
    is_received: int = 0


class ColumnUpdate(BaseModel):
    name: str | None = None
    sla_hours: int | None = None
    is_waiting_client: int | None = None
    is_done: int | None = None
    is_received: int | None = None


class ColumnOrder(BaseModel):
    id: int
    order_index: int


class ColumnOut(ColumnIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Tickets ----------
class TicketIn(BaseModel):
    titulo: str
    problema: str
    supplier_id: int | None = None
    defect_type_id: int | None = None
    responsavel_id: int | None = None
    numero_nf: str | None = None
    notas: str | None = None
    origem: OrigemReclamacao
    codigo_rastreio: str | None = None
    ticket_suporte_externo: str | None = None
    printer_model_id: int
    serial_number: str | None = None
    quantidade: int = 1
    requer_contato_cliente: int = 0
    retorno_horas: int | None = None
    column_id: int


class TicketUpdate(BaseModel):
    titulo: str | None = None
    problema: str | None = None
    supplier_id: int | None = None
    defect_type_id: int | None = None
    responsavel_id: int | None = None
    desfecho_id: int | None = None
    prejuizo_real: float | None = None
    numero_nf: str | None = None
    notas: str | None = None
    codigo_rastreio: str | None = None
    ticket_suporte_externo: str | None = None
    serial_number: str | None = None
    quantidade: int | None = None
    requer_contato_cliente: int | None = None
    retorno_horas: int | None = None


class MoveIn(BaseModel):
    to_column_id: int
    new_order_index: int


class ReorderIn(BaseModel):
    # Nova ordem completa dos tickets de UMA coluna, na sequência desejada.
    column_id: int
    ticket_ids: list[UUID]


class TicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    titulo: str
    origem: OrigemReclamacao
    printer_model_id: int
    quantidade: int
    custo_unitario: Decimal
    column_id: int
    order_index: int
    created_at: datetime
    last_moved_at: datetime
