"""checklist de recebimento por modelo

Revision ID: 0022_checklist
Revises: 0021_pecas_bambu
Create Date: 2026-01-22
"""
from alembic import op
import sqlalchemy as sa

revision = "0022_checklist"
down_revision = "0021_pecas_bambu"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "checklist_componentes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(160), nullable=False, unique=True),
        sa.Column("active", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("ordem", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_table(
        "modelo_checklist",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("modelo_id", sa.Integer(), sa.ForeignKey("printer_models.id"), nullable=False),
        sa.Column("componente_id", sa.Integer(), sa.ForeignKey("checklist_componentes.id"), nullable=False),
        sa.Column("ordem", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_modelo_checklist_modelo_id", "modelo_checklist", ["modelo_id"])
    op.create_table(
        "recebimento_checklist",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("recebimento_id", sa.Integer(), sa.ForeignKey("recebimentos.id"), nullable=False),
        sa.Column("componente_nome", sa.String(160), nullable=False),
        sa.Column("estado", sa.String(40), nullable=False),
        sa.Column("comentario", sa.Text(), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_recebimento_checklist_recebimento_id", "recebimento_checklist", ["recebimento_id"])

    # Componentes iniciais sugeridos (o admin pode ampliar/remover).
    op.bulk_insert(
        sa.table("checklist_componentes",
                 sa.column("name", sa.String), sa.column("active", sa.Integer),
                 sa.column("ordem", sa.Integer)),
        [{"name": n, "active": 1, "ordem": i} for i, n in enumerate(
            ["Fonte de alimentação", "Cabo de força", "Bico (nozzle)", "Hotend",
             "Cama / placa de construção", "Tela / display", "Extrusor",
             "Ventoinhas", "Correias", "Cabos internos", "Tampa / carcaça",
             "AMS (multicolor)", "Bobina de teste", "Manual / acessórios"])],
    )


def downgrade() -> None:
    op.drop_index("ix_recebimento_checklist_recebimento_id", "recebimento_checklist")
    op.drop_table("recebimento_checklist")
    op.drop_index("ix_modelo_checklist_modelo_id", "modelo_checklist")
    op.drop_table("modelo_checklist")
    op.drop_table("checklist_componentes")
