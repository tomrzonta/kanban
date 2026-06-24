"""add distributors, suppliers, defect_types and ticket FKs

Adiciona as entidades padronizadas de análise e os vínculos no ticket.
Os campos novos no ticket são nullable, então tickets já existentes continuam
válidos (sem vínculo). O campo texto 'distribuidora' passa a ser opcional.

Revision ID: 0002_catalog_entities
Revises: 0001_initial
Create Date: 2026-01-02
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_catalog_entities"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def _simple_table(name):
    op.create_table(
        name,
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False, unique=True),
        sa.Column("active", sa.Integer(), server_default="1"),
    )


def upgrade() -> None:
    # Novas entidades de catálogo.
    _simple_table("distributors")
    _simple_table("suppliers")
    _simple_table("defect_types")

    # Novas colunas no ticket (nullable: tickets antigos seguem válidos).
    op.add_column("tickets",
                  sa.Column("distributor_id", sa.Integer(), nullable=True))
    op.add_column("tickets",
                  sa.Column("supplier_id", sa.Integer(), nullable=True))
    op.add_column("tickets",
                  sa.Column("defect_type_id", sa.Integer(), nullable=True))

    op.create_foreign_key("fk_ticket_distributor", "tickets", "distributors",
                          ["distributor_id"], ["id"])
    op.create_foreign_key("fk_ticket_supplier", "tickets", "suppliers",
                          ["supplier_id"], ["id"])
    op.create_foreign_key("fk_ticket_defect", "tickets", "defect_types",
                          ["defect_type_id"], ["id"])

    # 'distribuidora' texto deixa de ser obrigatória (substituída por distributor_id).
    op.alter_column("tickets", "distribuidora", nullable=True)


def downgrade() -> None:
    op.alter_column("tickets", "distribuidora", nullable=False)
    op.drop_constraint("fk_ticket_defect", "tickets", type_="foreignkey")
    op.drop_constraint("fk_ticket_supplier", "tickets", type_="foreignkey")
    op.drop_constraint("fk_ticket_distributor", "tickets", type_="foreignkey")
    op.drop_column("tickets", "defect_type_id")
    op.drop_column("tickets", "supplier_id")
    op.drop_column("tickets", "distributor_id")
    op.drop_table("defect_types")
    op.drop_table("suppliers")
    op.drop_table("distributors")
