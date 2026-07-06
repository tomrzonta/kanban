"""add compras table (cadastro de equipamentos/compras)

Cria a tabela de compras — a fonte de verdade dos números de série, usada no
autopreenchimento dos tickets. Número de série é único.

Revision ID: 0013_compras
Revises: 0012_kb_favorito
Create Date: 2026-01-13
"""
from alembic import op
import sqlalchemy as sa

revision = "0013_compras"
down_revision = "0012_kb_favorito"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "compras",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("data_compra", sa.Date(), nullable=True),
        sa.Column("responsavel_compra", sa.String(120), nullable=True),
        sa.Column("fornecedor", sa.String(160), nullable=True),
        sa.Column("contato_fornecedor", sa.String(200), nullable=True),
        sa.Column("marca", sa.String(120), nullable=True),
        sa.Column("modelo", sa.String(160), nullable=True),
        sa.Column("numero_serie", sa.String(120), nullable=True),
        sa.Column("nota_fiscal", sa.String(80), nullable=True),
        sa.Column("data_entrega", sa.Date(), nullable=True),
        sa.Column("status_compra", sa.String(80), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True),
                  server_default=sa.func.now()),
    )
    op.create_index("ix_compras_numero_serie", "compras", ["numero_serie"],
                    unique=True)


def downgrade() -> None:
    op.drop_index("ix_compras_numero_serie", "compras")
    op.drop_table("compras")
