"""retidas: destino_ticket em peças, notas (diário) e peças padrão

Revision ID: 0020_retidas_extras
Revises: 0019_retidas
Create Date: 2026-01-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0020_retidas_extras"
down_revision = "0019_retidas"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Destino da peça pode ser um ticket.
    op.add_column("retida_pecas",
                  sa.Column("destino_ticket_id", UUID(as_uuid=True),
                            sa.ForeignKey("tickets.id"), nullable=True))
    # Diário de notas da retida.
    op.create_table(
        "retida_notas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("retida_id", sa.Integer(), sa.ForeignKey("impressoras_retidas.id"), nullable=False),
        sa.Column("texto", sa.Text(), nullable=False),
        sa.Column("autor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_retida_notas_retida_id", "retida_notas", ["retida_id"])
    # Peças padrão (menu suspenso).
    op.create_table(
        "pecas_padrao",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False, unique=True),
        sa.Column("active", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("ordem", sa.Integer(), nullable=False, server_default="0"),
    )
    # Peças padrão iniciais sugeridas.
    op.bulk_insert(
        sa.table("pecas_padrao",
                 sa.column("name", sa.String), sa.column("active", sa.Integer),
                 sa.column("ordem", sa.Integer)),
        [{"name": n, "active": 1, "ordem": i} for i, n in enumerate(
            ["Bico (nozzle)", "Hotend completo", "Placa-mãe", "Fonte de alimentação",
             "Correia", "Motor de passo", "Cama aquecida", "Sensor",
             "Cabo flat", "Ventoinha", "Tela / display", "Extrusor"])],
    )


def downgrade() -> None:
    op.drop_table("pecas_padrao")
    op.drop_index("ix_retida_notas_retida_id", "retida_notas")
    op.drop_table("retida_notas")
    op.drop_column("retida_pecas", "destino_ticket_id")
