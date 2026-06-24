"""add original_name to attachments

Revision ID: 0005_attachment_name
Revises: 0004_users
Create Date: 2026-01-05
"""
from alembic import op
import sqlalchemy as sa

revision = "0005_attachment_name"
down_revision = "0004_users"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("attachments",
                  sa.Column("original_name", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("attachments", "original_name")
