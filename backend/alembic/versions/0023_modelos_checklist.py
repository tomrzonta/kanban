"""popular modelos (A1, A1 Combo, A1 Mini, A1 Mini Combo, Snapmaker U1) e seus
checklists de recebimento (lista técnica sugerida — o admin ajusta na tela).

Idempotente: cria fabricantes/modelos/componentes só se não existirem; refaz o
checklist do modelo apenas se ele ainda não tiver nenhum item.

Revision ID: 0023_modelos_checklist
Revises: 0022_checklist
Create Date: 2026-01-23
"""
from alembic import op
import sqlalchemy as sa

revision = "0023_modelos_checklist"
down_revision = "0022_checklist"
branch_labels = None
depends_on = None

# Checklist sugerido por modelo (nome do modelo -> lista de componentes).
CHECKLISTS = {
    "A1": [
        "Bico (nozzle)", "Hotend", "Cama aquecida", "Correias", "Motores de passo",
        "Fonte de alimentação", "Placa-mãe", "Tela / display", "Ventoinhas",
        "Cabos internos", "Placa de construção (PEI)", "Cabo de força", "Manual / acessórios",
    ],
    "A1 Combo": [
        "Bico (nozzle)", "Hotend", "Cama aquecida", "Correias", "Motores de passo",
        "Fonte de alimentação", "Placa-mãe", "Tela / display", "Ventoinhas",
        "Cabos internos", "Placa de construção (PEI)", "Cabo de força",
        "AMS Lite", "Bobinas / suporte de filamento", "Manual / acessórios",
    ],
    "A1 Mini": [
        "Bico (nozzle)", "Hotend", "Cama aquecida", "Correias", "Motores de passo",
        "Fonte de alimentação", "Placa-mãe", "Tela / display", "Ventoinhas",
        "Cabos internos", "Placa de construção (PEI)", "Cabo de força", "Manual / acessórios",
    ],
    "A1 Mini Combo": [
        "Bico (nozzle)", "Hotend", "Cama aquecida", "Correias", "Motores de passo",
        "Fonte de alimentação", "Placa-mãe", "Tela / display", "Ventoinhas",
        "Cabos internos", "Placa de construção (PEI)", "Cabo de força",
        "AMS Lite", "Bobinas / suporte de filamento", "Manual / acessórios",
    ],
    "Snapmaker U1": [
        "Bico (nozzle)", "Hotend", "Cama aquecida", "Correias", "Motores de passo",
        "Fonte de alimentação", "Placa-mãe", "Tela / display", "Ventoinhas",
        "Cabos internos", "Placa de construção", "Cabo de força",
        "Módulo de troca de cor", "Bobinas / suporte de filamento", "Manual / acessórios",
    ],
}

# A qual fabricante cada modelo pertence.
FABRICANTE = {
    "A1": "Bambu Lab", "A1 Combo": "Bambu Lab",
    "A1 Mini": "Bambu Lab", "A1 Mini Combo": "Bambu Lab",
    "Snapmaker U1": "Snapmaker",
}


def _get_or_create_brand(conn, nome):
    r = conn.execute(sa.text("SELECT id FROM printer_brands WHERE LOWER(name)=LOWER(:n)"),
                     {"n": nome}).first()
    if r:
        return r[0]
    return conn.execute(
        sa.text("INSERT INTO printer_brands (name) VALUES (:n) RETURNING id"),
        {"n": nome}).first()[0]


def _get_or_create_model(conn, brand_id, nome):
    r = conn.execute(sa.text(
        "SELECT id FROM printer_models WHERE LOWER(name)=LOWER(:n) AND brand_id=:b"),
        {"n": nome, "b": brand_id}).first()
    if r:
        return r[0]
    return conn.execute(sa.text(
        "INSERT INTO printer_models (brand_id, name, current_price) "
        "VALUES (:b, :n, 0) RETURNING id"), {"b": brand_id, "n": nome}).first()[0]


def _get_or_create_componente(conn, nome, ordem):
    r = conn.execute(sa.text(
        "SELECT id FROM checklist_componentes WHERE LOWER(TRIM(name))=LOWER(TRIM(:n))"),
        {"n": nome}).first()
    if r:
        return r[0]
    return conn.execute(sa.text(
        "INSERT INTO checklist_componentes (name, active, ordem) "
        "VALUES (:n, 1, :o) RETURNING id"), {"n": nome, "o": ordem}).first()[0]


def upgrade() -> None:
    conn = op.get_bind()
    for modelo, componentes in CHECKLISTS.items():
        brand_id = _get_or_create_brand(conn, FABRICANTE[modelo])
        modelo_id = _get_or_create_model(conn, brand_id, modelo)
        # Só monta o checklist se o modelo ainda não tiver nenhum item.
        ja = conn.execute(sa.text(
            "SELECT COUNT(*) FROM modelo_checklist WHERE modelo_id=:m"),
            {"m": modelo_id}).first()[0]
        if ja:
            continue
        for i, comp_nome in enumerate(componentes):
            comp_id = _get_or_create_componente(conn, comp_nome, 100 + i)
            conn.execute(sa.text(
                "INSERT INTO modelo_checklist (modelo_id, componente_id, ordem) "
                "VALUES (:m, :c, :o)"), {"m": modelo_id, "c": comp_id, "o": i})


def downgrade() -> None:
    # Não remove modelos/checklists (podem já estar em uso).
    pass
