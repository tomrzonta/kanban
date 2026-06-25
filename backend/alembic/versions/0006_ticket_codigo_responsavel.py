"""add codigo_interno and responsavel_id to tickets

Adiciona a numeração interna (GAR-ANO-NNNN) e o responsável pelo ticket.
Tickets já existentes recebem um código retroativo (pela ordem de criação) e
ficam sem responsável (são anteriores à regra de obrigatoriedade).

Revision ID: 0006_ticket_codigo_responsavel
Revises: 0005_attachment_name
Create Date: 2026-01-06
"""
from alembic import op
import sqlalchemy as sa

revision = "0006_ticket_codigo_responsavel"
down_revision = "0005_attachment_name"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tickets",
                  sa.Column("codigo_interno", sa.String(20), nullable=True))
    op.add_column("tickets",
                  sa.Column("responsavel_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_ticket_responsavel", "tickets", "users",
                          ["responsavel_id"], ["id"])
    op.create_unique_constraint("uq_ticket_codigo", "tickets", ["codigo_interno"])

    # Numeração retroativa: atribui GAR-<ano de criação>-NNNN aos tickets que já
    # existem, na ordem de criação, com o contador zerando por ano.
    op.execute("""
        WITH numerados AS (
            SELECT id,
                   EXTRACT(YEAR FROM created_at)::int AS ano,
                   ROW_NUMBER() OVER (
                       PARTITION BY EXTRACT(YEAR FROM created_at)
                       ORDER BY created_at
                   ) AS seq
            FROM tickets
        )
        UPDATE tickets t
        SET codigo_interno = 'GAR-' || n.ano || '-' || LPAD(n.seq::text, 4, '0')
        FROM numerados n
        WHERE t.id = n.id
    """)


def downgrade() -> None:
    op.drop_constraint("uq_ticket_codigo", "tickets", type_="unique")
    op.drop_constraint("fk_ticket_responsavel", "tickets", type_="foreignkey")
    op.drop_column("tickets", "responsavel_id")
    op.drop_column("tickets", "codigo_interno")
