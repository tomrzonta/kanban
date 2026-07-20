"""popular pecas_padrao com peças comuns Bambu Lab (canibalizáveis)

Insere a lista sugerida sem duplicar nomes já existentes (case-insensitive).

Revision ID: 0021_pecas_bambu
Revises: 0020_retidas_extras
Create Date: 2026-01-21
"""
from alembic import op
import sqlalchemy as sa

revision = "0021_pecas_bambu"
down_revision = "0020_retidas_extras"
branch_labels = None
depends_on = None

PECAS = [
    "Bico (nozzle)", "Hotend completo", "Bloco aquecedor", "Termistor",
    "Cartucho aquecedor (heater)", "Placa-mãe (mainboard)", "Fonte de alimentação",
    "Motor de passo (NEMA)", "Correia (belt)", "Polia / engrenagem",
    "Cama aquecida (heatbed)", "Placa de construção (build plate / PEI)",
    "Sensor (fim de curso / cama / filamento)", "Cabo flat / FFC",
    "Ventoinha (hotend / peça / placa)", "Tela / display", "Extrusor (conjunto)",
    "Engrenagem do extrusor", "Tubo PTFE / bowden", "AMS (unidade multicolor)",
    "Módulo LiDAR / câmera", "Cabos internos",
]


def upgrade() -> None:
    conn = op.get_bind()
    existentes = {r[0].strip().lower() for r in
                  conn.execute(sa.text("SELECT name FROM pecas_padrao")).fetchall()}
    novos = [{"name": n, "active": 1, "ordem": i}
             for i, n in enumerate(PECAS) if n.strip().lower() not in existentes]
    if novos:
        op.bulk_insert(
            sa.table("pecas_padrao",
                     sa.column("name", sa.String), sa.column("active", sa.Integer),
                     sa.column("ordem", sa.Integer)),
            novos)


def downgrade() -> None:
    # Não remove (evita apagar peças que o usuário possa ter passado a usar).
    pass
