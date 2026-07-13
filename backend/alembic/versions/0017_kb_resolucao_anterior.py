"""add resolucao_anterior to kb_artigos

Guarda a versão anterior da resolução, para destacar (grifar) o trecho que
mudou nas regras de negócio durante a janela de destaque.

Revision ID: 0017_kb_resolucao_anterior
Revises: 0016_faixa_prazo
Create Date: 2026-01-17
"""
from alembic import op
import sqlalchemy as sa

revision = "0017_kb_resolucao_anterior"
down_revision = "0016_faixa_prazo"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("kb_artigos",
                  sa.Column("resolucao_anterior", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("kb_artigos", "resolucao_anterior")
