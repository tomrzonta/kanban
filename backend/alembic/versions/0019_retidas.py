"""add controle de impressoras retidas

Tabelas: estados_retida (gerenciáveis), impressoras_retidas (com origem opcional
em ticket), retida_historico (mudanças de estado) e retida_pecas (canibalização).

Revision ID: 0019_retidas
Revises: 0018_kb_resolucao_historico
Create Date: 2026-01-19
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0019_retidas"
down_revision = "0018_kb_resolucao_historico"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "estados_retida",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(80), nullable=False, unique=True),
        sa.Column("active", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("ordem", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_table(
        "impressoras_retidas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ticket_id", UUID(as_uuid=True), sa.ForeignKey("tickets.id"), nullable=True),
        sa.Column("marca", sa.String(120), nullable=True),
        sa.Column("modelo", sa.String(160), nullable=True),
        sa.Column("numero_serie", sa.String(120), nullable=True),
        sa.Column("condicao", sa.String(200), nullable=True),
        sa.Column("estado_id", sa.Integer(), sa.ForeignKey("estados_retida.id"), nullable=True),
        sa.Column("local", sa.String(160), nullable=True),
        sa.Column("observacao", sa.Text(), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "retida_historico",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("retida_id", sa.Integer(), sa.ForeignKey("impressoras_retidas.id"), nullable=False),
        sa.Column("estado_de", sa.String(80), nullable=True),
        sa.Column("estado_para", sa.String(80), nullable=True),
        sa.Column("local", sa.String(160), nullable=True),
        sa.Column("nota", sa.Text(), nullable=True),
        sa.Column("autor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_retida_historico_retida_id", "retida_historico", ["retida_id"])
    op.create_table(
        "retida_pecas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("retida_id", sa.Integer(), sa.ForeignKey("impressoras_retidas.id"), nullable=False),
        sa.Column("peca", sa.String(200), nullable=False),
        sa.Column("destino_texto", sa.String(300), nullable=True),
        sa.Column("destino_retida_id", sa.Integer(), sa.ForeignKey("impressoras_retidas.id"), nullable=True),
        sa.Column("autor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_retida_pecas_retida_id", "retida_pecas", ["retida_id"])

    # Estados iniciais sugeridos.
    op.bulk_insert(
        sa.table("estados_retida",
                 sa.column("name", sa.String), sa.column("active", sa.Integer),
                 sa.column("ordem", sa.Integer)),
        [{"name": n, "active": 1, "ordem": i} for i, n in enumerate(
            ["Aguardando destinação", "Em recuperação", "Cemitério de peças",
             "Em uso — Farm", "Recuperada", "Sucata"])],
    )


def downgrade() -> None:
    op.drop_index("ix_retida_pecas_retida_id", "retida_pecas")
    op.drop_table("retida_pecas")
    op.drop_index("ix_retida_historico_retida_id", "retida_historico")
    op.drop_table("retida_historico")
    op.drop_table("impressoras_retidas")
    op.drop_table("estados_retida")
