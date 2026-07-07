"""Modelos do quadro Kanban: colunas dinâmicas, tickets, tags, anexos e histórico.

Pontos centrais da lógica de SLA e rastreabilidade:
- Column.sla_hours       -> limite de tempo da etapa (alimenta a cor do card).
- Column.is_waiting_client -> separa "tempo aguardando cliente" de análise interna
                              nos relatórios de gargalo.
- Column.is_done         -> coluna terminal, usada no cálculo de MTTR.
- TicketHistory          -> uma linha por movimentação; o tempo numa coluna é
                            (movimentação seguinte) - (esta movimentação).
- Ticket.custo_unitario  -> snapshot do preço na criação (congela o prejuízo).
"""
import uuid
import enum

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, Numeric,
    Table, Enum as SAEnum, func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


# Relação N:N entre tickets e tags de status.
ticket_tags = Table(
    "ticket_tags", Base.metadata,
    Column("ticket_id", UUID(as_uuid=True),
           ForeignKey("tickets.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer,
           ForeignKey("status_tags.id", ondelete="CASCADE"), primary_key=True),
)


class OrigemReclamacao(str, enum.Enum):
    reclame_aqui = "Reclame Aqui"
    atendimento_interno = "Atendimento Interno"
    redes_sociais = "Redes Sociais"
    email = "E-mail"
    telefone = "Telefone"


class BoardColumn(Base):
    """Coluna dinâmica do Kanban — nada hardcoded; o admin cria/edita/reordena."""
    __tablename__ = "columns"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    order_index = Column(Integer, nullable=False, default=0)  # ordem horizontal
    sla_hours = Column(Integer, nullable=True)                # limite da etapa (h)
    is_waiting_client = Column(Integer, default=0)            # 0/1 espera externa
    is_done = Column(Integer, default=0)                      # 0/1 coluna terminal
    is_received = Column(Integer, default=0)                  # 0/1 destino ao receber RMA

    tickets = relationship("Ticket", back_populates="column")


class StatusTag(Base):
    __tablename__ = "status_tags"

    id = Column(Integer, primary_key=True)
    name = Column(String(60), nullable=False, unique=True)  # Aprovada, Negada...
    color = Column(String(7), default="#999999")            # hex para exibição


class Attachment(Base):
    """Anexos do ticket: PDF da NF, fotos do produto, etc."""
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True)
    ticket_id = Column(UUID(as_uuid=True),
                       ForeignKey("tickets.id", ondelete="CASCADE"))
    file_url = Column(String(500), nullable=False)  # caminho no storage do servidor
    original_name = Column(String(255), nullable=True)  # nome original (para download)
    file_type = Column(String(50))                  # "nf_pdf", "imagem", "outro"
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Numeração interna legível (ex.: GAR-2026-0001), para busca e referência.
    codigo_interno = Column(String(20), unique=True, nullable=True)

    # --- Dados do problema ---
    titulo = Column(String(255), nullable=False)
    problema = Column(Text, nullable=False)
    # Fornecedor e tipo de defeito padronizados. O FABRICANTE vem da marca do
    # modelo (printer_model -> brand), então não há campo próprio para ele.
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    defect_type_id = Column(Integer, ForeignKey("defect_types.id"), nullable=True)
    # Responsável pelo ticket (usuário cadastrado). Obrigatório nos novos.
    responsavel_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    # Desfecho do ticket (obrigatório ao concluir) e valor real perdido quando
    # o desfecho é de prejuízo parcial. Isso corrige o cálculo de prejuízo.
    desfecho_id = Column(Integer, ForeignKey("desfechos.id"), nullable=True)
    prejuizo_real = Column(Numeric(10, 2), nullable=True)
    numero_nf = Column(String(60), nullable=True)
    notas = Column(Text, nullable=True)             # rich text do atendimento
    origem = Column(SAEnum(OrigemReclamacao), nullable=False)
    codigo_rastreio = Column(String(120), nullable=True)
    # Nº do ticket de suporte da Bambu Lab / importadora (protocolo externo).
    ticket_suporte_externo = Column(String(120), nullable=True)

    # --- Interação com o cliente ---
    requer_contato_cliente = Column(Integer, default=0)  # 0/1 flag de sinalização
    retorno_horas = Column(Integer, nullable=True)        # prazo individual (horas)
    # Marco a partir do qual o retorno_horas conta. Atualizado ao definir o prazo.
    retorno_definido_em = Column(DateTime(timezone=True), nullable=True)

    # --- Produto e custo ---
    printer_model_id = Column(Integer, ForeignKey("printer_models.id"),
                              nullable=False)
    serial_number = Column(String(120), nullable=True)  # SN da impressora
    quantidade = Column(Integer, nullable=False, default=1)
    # Snapshot do preço no momento da criação. Congela o prejuízo histórico.
    custo_unitario = Column(Numeric(10, 2), nullable=False)

    # --- Posição no quadro ---
    column_id = Column(Integer, ForeignKey("columns.id"), nullable=False)
    order_index = Column(Integer, default=0)        # ordem vertical na coluna

    # --- Controle temporal ---
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    # last_moved_at: usado para o alerta visual de inatividade (tempo parado).
    last_moved_at = Column(DateTime(timezone=True), server_default=func.now())

    column = relationship("BoardColumn", back_populates="tickets")
    printer_model = relationship("PrinterModel")
    supplier = relationship("Supplier")
    defect_type = relationship("DefectType")
    responsavel = relationship("User")
    desfecho = relationship("Desfecho")
    tags = relationship("StatusTag", secondary=ticket_tags)
    attachments = relationship("Attachment", cascade="all, delete-orphan")
    history = relationship("TicketHistory", back_populates="ticket",
                           cascade="all, delete-orphan")


class TicketHistory(Base):
    """Rastreabilidade: uma linha POR movimentação de coluna.

    O tempo gasto numa coluna é calculado como a diferença entre o timestamp
    desta linha e o da linha seguinte do mesmo ticket (função LEAD no SQL).
    Para a coluna atual (sem linha seguinte), usa-se NOW() - timestamp.
    """
    __tablename__ = "ticket_history"

    id = Column(Integer, primary_key=True)
    ticket_id = Column(UUID(as_uuid=True),
                       ForeignKey("tickets.id", ondelete="CASCADE"))
    from_column_id = Column(Integer, ForeignKey("columns.id"), nullable=True)  # null na criação
    to_column_id = Column(Integer, ForeignKey("columns.id"), nullable=False)
    moved_at = Column(DateTime(timezone=True), server_default=func.now())

    ticket = relationship("Ticket", back_populates="history")
