"""add users table

Cria a tabela de usuários para autenticação com papéis (admin/atendente).

Revision ID: 0004_users
Revises: 0003_unify_fabricante
Create Date: 2026-01-04
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_users"
down_revision = "0003_unify_fabricante"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(80), nullable=False, unique=True),
        sa.Column("nome", sa.String(120), nullable=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="atendente"),
        sa.Column("active", sa.Integer(), server_default="1"),
    )


def downgrade() -> None:
    op.drop_table("users")
