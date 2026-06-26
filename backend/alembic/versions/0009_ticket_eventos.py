"""add ticket_eventos table (timeline)

Cria a tabela de eventos/comentários do ticket — a linha do tempo de atividades
(anotações manuais + eventos automáticos).

Revision ID: 0009_ticket_eventos
Revises: 0008_desfechos
Create Date: 2026-01-09
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0009_ticket_eventos"
down_revision = "0008_desfechos"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ticket_eventos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ticket_id", UUID(as_uuid=True),
                  sa.ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tipo", sa.String(20), nullable=False,
                  server_default="comentario"),
        sa.Column("texto", sa.Text(), nullable=False),
        sa.Column("autor_id", sa.Integer(),
                  sa.ForeignKey("users.id"), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True),
                  server_default=sa.func.now()),
    )
    op.create_index("ix_ticket_eventos_ticket", "ticket_eventos", ["ticket_id"])


def downgrade() -> None:
    op.drop_index("ix_ticket_eventos_ticket", "ticket_eventos")
    op.drop_table("ticket_eventos")
