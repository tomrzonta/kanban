"""add is_received flag and recebimentos table

Adiciona a flag is_received nas colunas (marca a coluna destino ao receber RMA)
e a tabela de entradas de recebimento (RMA), vinculadas a tickets.

Revision ID: 0007_recebimentos
Revises: 0006_ticket_codigo_responsavel
Create Date: 2026-01-07
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0007_recebimentos"
down_revision = "0006_ticket_codigo_responsavel"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("columns",
                  sa.Column("is_received", sa.Integer(), server_default="0"))

    op.create_table(
        "recebimentos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ticket_id", UUID(as_uuid=True),
                  sa.ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("data_recebimento", sa.Date(), nullable=False),
        sa.Column("numero_nf", sa.String(60), nullable=True),
        sa.Column("quantidade", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("condicao", sa.String(60), nullable=False),
        sa.Column("observacao", sa.Text(), nullable=True),
        sa.Column("criado_por_id", sa.Integer(),
                  sa.ForeignKey("users.id"), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("recebimentos")
    op.drop_column("columns", "is_received")
