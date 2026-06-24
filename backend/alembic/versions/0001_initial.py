"""initial schema

Cria todas as tabelas do sistema na ordem correta de dependências.
Esta é a migração base; as próximas alterações de schema virão depois desta.

Revision ID: 0001_initial
Revises:
Create Date: 2026-01-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# Identificadores da revisão.
revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- columns ---
    op.create_table(
        "columns",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("sla_hours", sa.Integer(), nullable=True),
        sa.Column("is_waiting_client", sa.Integer(), server_default="0"),
        sa.Column("is_done", sa.Integer(), server_default="0"),
    )

    # --- printer_brands ---
    op.create_table(
        "printer_brands",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False, unique=True),
        sa.Column("active", sa.Integer(), server_default="1"),
    )

    # --- status_tags ---
    op.create_table(
        "status_tags",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(60), nullable=False, unique=True),
        sa.Column("color", sa.String(7), server_default="#999999"),
    )

    # --- printer_models ---
    op.create_table(
        "printer_models",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("brand_id", sa.Integer(),
                  sa.ForeignKey("printer_brands.id"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("sku", sa.String(60), nullable=True),
        sa.Column("current_price", sa.Numeric(10, 2), nullable=False,
                  server_default="0"),
        sa.Column("active", sa.Integer(), server_default="1"),
    )

    # --- tickets ---
    op.create_table(
        "tickets",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("titulo", sa.String(255), nullable=False),
        sa.Column("problema", sa.Text(), nullable=False),
        sa.Column("distribuidora", sa.String(120), nullable=False),
        sa.Column("numero_nf", sa.String(60), nullable=True),
        sa.Column("notas", sa.Text(), nullable=True),
        sa.Column("origem",
                  sa.Enum("reclame_aqui", "atendimento_interno", "redes_sociais",
                          "email", "telefone", name="origemreclamacao"),
                  nullable=False),
        sa.Column("codigo_rastreio", sa.String(120), nullable=True),
        sa.Column("requer_contato_cliente", sa.Integer(), server_default="0"),
        sa.Column("retorno_horas", sa.Integer(), nullable=True),
        sa.Column("retorno_definido_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("printer_model_id", sa.Integer(),
                  sa.ForeignKey("printer_models.id"), nullable=False),
        sa.Column("serial_number", sa.String(120), nullable=True),
        sa.Column("quantidade", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("custo_unitario", sa.Numeric(10, 2), nullable=False),
        sa.Column("column_id", sa.Integer(),
                  sa.ForeignKey("columns.id"), nullable=False),
        sa.Column("order_index", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_moved_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now()),
    )

    # --- attachments ---
    op.create_table(
        "attachments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ticket_id", UUID(as_uuid=True),
                  sa.ForeignKey("tickets.id", ondelete="CASCADE")),
        sa.Column("file_url", sa.String(500), nullable=False),
        sa.Column("file_type", sa.String(50), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now()),
    )

    # --- ticket_history ---
    op.create_table(
        "ticket_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ticket_id", UUID(as_uuid=True),
                  sa.ForeignKey("tickets.id", ondelete="CASCADE")),
        sa.Column("from_column_id", sa.Integer(),
                  sa.ForeignKey("columns.id"), nullable=True),
        sa.Column("to_column_id", sa.Integer(),
                  sa.ForeignKey("columns.id"), nullable=False),
        sa.Column("moved_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now()),
    )

    # --- ticket_tags (N:N) ---
    op.create_table(
        "ticket_tags",
        sa.Column("ticket_id", UUID(as_uuid=True),
                  sa.ForeignKey("tickets.id", ondelete="CASCADE"),
                  primary_key=True),
        sa.Column("tag_id", sa.Integer(),
                  sa.ForeignKey("status_tags.id", ondelete="CASCADE"),
                  primary_key=True),
    )


def downgrade() -> None:
    # Ordem inversa por causa das dependências de FK.
    op.drop_table("ticket_tags")
    op.drop_table("ticket_history")
    op.drop_table("attachments")
    op.drop_table("tickets")
    op.execute("DROP TYPE IF EXISTS origemreclamacao")
    op.drop_table("printer_models")
    op.drop_table("status_tags")
    op.drop_table("printer_brands")
    op.drop_table("columns")
