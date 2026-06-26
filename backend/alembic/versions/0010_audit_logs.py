"""add audit_logs table

Cria a tabela de auditoria (registro de ações dos usuários: quem fez o quê e
quando), consultável na aba Auditoria (admin).

Revision ID: 0010_audit_logs
Revises: 0009_ticket_eventos
Create Date: 2026-01-10
"""
from alembic import op
import sqlalchemy as sa

revision = "0010_audit_logs"
down_revision = "0009_ticket_eventos"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("autor_id", sa.Integer(),
                  sa.ForeignKey("users.id"), nullable=True),
        sa.Column("autor_nome", sa.String(120), nullable=True),
        sa.Column("acao", sa.String(40), nullable=False),
        sa.Column("entidade", sa.String(40), nullable=False),
        sa.Column("descricao", sa.Text(), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True),
                  server_default=sa.func.now()),
    )
    op.create_index("ix_audit_logs_criado_em", "audit_logs", ["criado_em"])


def downgrade() -> None:
    op.drop_index("ix_audit_logs_criado_em", "audit_logs")
    op.drop_table("audit_logs")
