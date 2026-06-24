"""remove distribuidora (unificada com fabricante = marca)

O conceito de Fabricante passou a ser a marca do modelo (printer_brands), então
o campo distributor_id, a tabela distributors e o texto legado 'distribuidora'
deixam de existir.

Revision ID: 0003_unify_fabricante
Revises: 0002_catalog_entities
Create Date: 2026-01-03
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_unify_fabricante"
down_revision = "0002_catalog_entities"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Remove o vínculo e a coluna de distribuidora do ticket.
    op.drop_constraint("fk_ticket_distributor", "tickets", type_="foreignkey")
    op.drop_column("tickets", "distributor_id")
    op.drop_column("tickets", "distribuidora")
    # Remove a tabela de distribuidoras (substituída pela marca).
    op.drop_table("distributors")


def downgrade() -> None:
    # Recria a estrutura anterior (caso precise reverter).
    op.create_table(
        "distributors",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False, unique=True),
        sa.Column("active", sa.Integer(), server_default="1"),
    )
    op.add_column("tickets",
                  sa.Column("distribuidora", sa.String(120), nullable=True))
    op.add_column("tickets",
                  sa.Column("distributor_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_ticket_distributor", "tickets", "distributors",
                          ["distributor_id"], ["id"])
