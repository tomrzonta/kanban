"""add faixa_prazo to tickets

Faixa de prazo do contato do cliente: 1-7 dias, 8-90 dias ou 91+ dias.
Escolhida manualmente na abertura; define o tipo de tratativa.

Revision ID: 0016_faixa_prazo
Revises: 0015_gastos
Create Date: 2026-01-16
"""
from alembic import op
import sqlalchemy as sa

revision = "0016_faixa_prazo"
down_revision = "0015_gastos"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tickets",
                  sa.Column("faixa_prazo", sa.String(10), nullable=True))


def downgrade() -> None:
    op.drop_column("tickets", "faixa_prazo")
