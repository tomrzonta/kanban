"""add categorias_gasto e gastos_ticket

Gastos discriminados por ticket (frete reverso, reenvio, peça...), com
categorias gerenciáveis. A soma dos gastos alimenta o prejuízo efetivo.

Revision ID: 0015_gastos
Revises: 0014_ticket_suporte_externo
Create Date: 2026-01-15
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0015_gastos"
down_revision = "0014_ticket_suporte_externo"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "categorias_gasto",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(80), nullable=False, unique=True),
        sa.Column("active", sa.Integer(), nullable=False, server_default="1"),
    )
    op.create_table(
        "gastos_ticket",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ticket_id", UUID(as_uuid=True),
                  sa.ForeignKey("tickets.id"), nullable=False),
        sa.Column("categoria_id", sa.Integer(),
                  sa.ForeignKey("categorias_gasto.id"), nullable=True),
        sa.Column("valor", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("descricao", sa.String(300), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True),
                  server_default=sa.func.now()),
    )
    op.create_index("ix_gastos_ticket_id", "gastos_ticket", ["ticket_id"])

    # Categorias iniciais sugeridas.
    op.bulk_insert(
        sa.table("categorias_gasto",
                 sa.column("name", sa.String), sa.column("active", sa.Integer)),
        [{"name": n, "active": 1} for n in
         ["Frete reverso", "Reenvio ao cliente", "Peça de reposição",
          "Mão de obra", "Outros"]],
    )


def downgrade() -> None:
    op.drop_index("ix_gastos_ticket_id", "gastos_ticket")
    op.drop_table("gastos_ticket")
    op.drop_table("categorias_gasto")
