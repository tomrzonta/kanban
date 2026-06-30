"""add favorito flag to kb_artigos

Adiciona a flag favorito (global) aos materiais de atendimento. Favoritos sobem
ao topo da listagem.

Revision ID: 0012_kb_favorito
Revises: 0011_kb_artigos
Create Date: 2026-01-12
"""
from alembic import op
import sqlalchemy as sa

revision = "0012_kb_favorito"
down_revision = "0011_kb_artigos"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("kb_artigos",
                  sa.Column("favorito", sa.Integer(), nullable=False,
                            server_default="0"))


def downgrade() -> None:
    op.drop_column("kb_artigos", "favorito")
