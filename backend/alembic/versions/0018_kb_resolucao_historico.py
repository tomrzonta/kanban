"""add resolucao_historico to kb_artigos

Histórico de versões da resolução (lista de {texto, data}), para grifar o que
mudou nos últimos dias com cada trecho tendo seu próprio prazo.

Revision ID: 0018_kb_resolucao_historico
Revises: 0017_kb_resolucao_anterior
Create Date: 2026-01-18
"""
from alembic import op
import sqlalchemy as sa

revision = "0018_kb_resolucao_historico"
down_revision = "0017_kb_resolucao_anterior"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("kb_artigos",
                  sa.Column("resolucao_historico", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("kb_artigos", "resolucao_historico")
