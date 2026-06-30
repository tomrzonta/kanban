"""add kb_artigos table (base de conhecimento de atendimento)

Cria a tabela de material de atendimento (pitches, resolução, problema), com
busca por título/corpo e categoria.

Revision ID: 0011_kb_artigos
Revises: 0010_audit_logs
Create Date: 2026-01-11
"""
from alembic import op
import sqlalchemy as sa

revision = "0011_kb_artigos"
down_revision = "0010_audit_logs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "kb_artigos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("titulo", sa.String(200), nullable=False),
        sa.Column("categoria", sa.String(80), nullable=True),
        sa.Column("problema", sa.Text(), nullable=True),
        sa.Column("resolucao", sa.Text(), nullable=True),
        sa.Column("pitches", sa.JSON(), nullable=False,
                  server_default="[]"),
        sa.Column("pitches_texto", sa.Text(), nullable=True),
        sa.Column("autor_id", sa.Integer(),
                  sa.ForeignKey("users.id"), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True),
                  server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime(timezone=True),
                  server_default=sa.func.now()),
    )
    op.create_index("ix_kb_categoria", "kb_artigos", ["categoria"])


def downgrade() -> None:
    op.drop_index("ix_kb_categoria", "kb_artigos")
    op.drop_table("kb_artigos")
