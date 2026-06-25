"""add desfechos table and ticket outcome fields

Cria a tabela de desfechos (categorias customizáveis com tipo de impacto no
prejuízo) e adiciona desfecho_id + prejuizo_real ao ticket. Os campos são
nullable: tickets existentes seguem válidos (sem desfecho até serem classificados).

Revision ID: 0008_desfechos
Revises: 0007_recebimentos
Create Date: 2026-01-08
"""
from alembic import op
import sqlalchemy as sa

revision = "0008_desfechos"
down_revision = "0007_recebimentos"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "desfechos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False, unique=True),
        sa.Column("impacto", sa.String(20), nullable=False,
                  server_default="sem_prejuizo"),
        sa.Column("active", sa.Integer(), server_default="1"),
    )
    op.add_column("tickets",
                  sa.Column("desfecho_id", sa.Integer(), nullable=True))
    op.add_column("tickets",
                  sa.Column("prejuizo_real", sa.Numeric(10, 2), nullable=True))
    op.create_foreign_key("fk_ticket_desfecho", "tickets", "desfechos",
                          ["desfecho_id"], ["id"])

    # Desfechos iniciais comuns (o usuário pode editar/adicionar depois).
    op.execute("""
        INSERT INTO desfechos (name, impacto, active) VALUES
        ('Reparado', 'sem_prejuizo', 1),
        ('Coberto pelo fornecedor', 'sem_prejuizo', 1),
        ('Sem defeito constatado', 'sem_prejuizo', 1),
        ('Troca parcial', 'parcial', 1),
        ('Perda total', 'total', 1)
    """)


def downgrade() -> None:
    op.drop_constraint("fk_ticket_desfecho", "tickets", type_="foreignkey")
    op.drop_column("tickets", "prejuizo_real")
    op.drop_column("tickets", "desfecho_id")
    op.drop_table("desfechos")
