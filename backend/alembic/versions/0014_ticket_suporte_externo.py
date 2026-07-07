"""add ticket_suporte_externo to tickets

Nº do ticket de suporte da Bambu Lab / importadora (protocolo externo),
vinculado ao caso interno.

Revision ID: 0014_ticket_suporte_externo
Revises: 0013_compras
Create Date: 2026-01-14
"""
from alembic import op
import sqlalchemy as sa

revision = "0014_ticket_suporte_externo"
down_revision = "0013_compras"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tickets",
                  sa.Column("ticket_suporte_externo", sa.String(120),
                            nullable=True))


def downgrade() -> None:
    op.drop_column("tickets", "ticket_suporte_externo")
