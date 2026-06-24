"""Endpoints analíticos do Dashboard: MTTR, volume, prejuízo e gargalos.

As consultas pesadas usam SQL bruto (com window functions) por clareza e
desempenho. Todo cálculo temporal deriva da tabela ticket_history.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/mttr")
def mttr(db: Session = Depends(get_db)):
    """MTTR = tempo médio entre a criação do ticket e a 1ª chegada numa coluna is_done."""
    sql = text("""
        SELECT AVG(EXTRACT(EPOCH FROM (done.moved_at - t.created_at)) / 3600) AS mttr_horas
        FROM tickets t
        JOIN LATERAL (
            SELECT h.moved_at
            FROM ticket_history h
            JOIN columns c ON c.id = h.to_column_id
            WHERE h.ticket_id = t.id AND c.is_done = 1
            ORDER BY h.moved_at ASC
            LIMIT 1
        ) done ON TRUE
    """)
    return {"mttr_horas": db.execute(sql).scalar()}


@router.get("/volume")
def volume(db: Session = Depends(get_db)):
    """Quantidade de tickets agrupada por marca e por distribuidora."""
    por_marca = db.execute(text("""
        SELECT b.name AS marca, COUNT(t.id) AS total
        FROM tickets t
        JOIN printer_models m ON m.id = t.printer_model_id
        JOIN printer_brands b ON b.id = m.brand_id
        GROUP BY b.name ORDER BY total DESC
    """)).mappings().all()
    por_dist = db.execute(text("""
        SELECT distribuidora, COUNT(*) AS total
        FROM tickets GROUP BY distribuidora ORDER BY total DESC
    """)).mappings().all()
    return {"por_marca": list(por_marca), "por_distribuidora": list(por_dist)}


@router.get("/prejuizo")
def prejuizo(db: Session = Depends(get_db)):
    """Prejuízo = SUM(custo_unitario * quantidade), usando o preço congelado no ticket."""
    por_marca = db.execute(text("""
        SELECT b.name AS marca,
               COUNT(t.id) AS qtd_tickets,
               SUM(t.custo_unitario * t.quantidade) AS prejuizo
        FROM tickets t
        JOIN printer_models m ON m.id = t.printer_model_id
        JOIN printer_brands b ON b.id = m.brand_id
        GROUP BY b.name ORDER BY prejuizo DESC
    """)).mappings().all()
    por_dist = db.execute(text("""
        SELECT distribuidora,
               COUNT(id) AS qtd_tickets,
               SUM(custo_unitario * quantidade) AS prejuizo
        FROM tickets GROUP BY distribuidora ORDER BY prejuizo DESC
    """)).mappings().all()
    return {"por_marca": list(por_marca), "por_distribuidora": list(por_dist)}


@router.get("/bottlenecks")
def bottlenecks(db: Session = Depends(get_db)):
    """Tempo médio por coluna. LEAD calcula a duração até a próxima movimentação.

    is_waiting_client separa o tempo de espera do cliente do tempo de análise
    interna, para não penalizar o time por demora externa.
    """
    sql = text("""
        WITH spans AS (
            SELECT h.to_column_id,
                   EXTRACT(EPOCH FROM (
                       LEAD(h.moved_at) OVER (PARTITION BY h.ticket_id ORDER BY h.moved_at)
                       - h.moved_at)) / 3600 AS horas
            FROM ticket_history h
        )
        SELECT c.name, c.is_waiting_client, AVG(s.horas) AS media_horas
        FROM spans s
        JOIN columns c ON c.id = s.to_column_id
        WHERE s.horas IS NOT NULL          -- exclui a coluna atual (sem LEAD)
        GROUP BY c.id, c.name, c.is_waiting_client
        ORDER BY media_horas DESC
    """)
    return list(db.execute(sql).mappings().all())


@router.get("/por-dimensao")
def por_dimensao(db: Session = Depends(get_db)):
    """Volume e prejuízo agrupados pelas dimensões de análise:
    fabricante (= marca do modelo), fornecedor e tipo de defeito.
    """
    # Fabricante vem da marca do modelo (join printer_models -> printer_brands).
    por_fabricante = [dict(r) for r in db.execute(text("""
        SELECT b.name AS nome,
               COUNT(t.id) AS qtd_tickets,
               COALESCE(SUM(t.custo_unitario * t.quantidade), 0) AS prejuizo
        FROM tickets t
        JOIN printer_models m ON m.id = t.printer_model_id
        JOIN printer_brands b ON b.id = m.brand_id
        GROUP BY b.name ORDER BY qtd_tickets DESC
    """)).mappings().all()]

    def agrupar(join_tbl, fk):
        return [dict(r) for r in db.execute(text(f"""
            SELECT x.name AS nome,
                   COUNT(t.id) AS qtd_tickets,
                   COALESCE(SUM(t.custo_unitario * t.quantidade), 0) AS prejuizo
            FROM tickets t
            JOIN {join_tbl} x ON x.id = t.{fk}
            GROUP BY x.name ORDER BY qtd_tickets DESC
        """)).mappings().all()]

    return {
        "por_fabricante": por_fabricante,
        "por_fornecedor": agrupar("suppliers", "supplier_id"),
        "por_defeito": agrupar("defect_types", "defect_type_id"),
    }


@router.get("/tickets-paginated")
def tickets_paginated(
    page: int = Query(1, ge=1),
    size: int = Query(50, le=200),  # teto evita payloads gigantes / erros 429
    db: Session = Depends(get_db),
):
    offset = (page - 1) * size
    rows = db.execute(text("""
        SELECT id, titulo, distribuidora, created_at
        FROM tickets ORDER BY created_at DESC
        LIMIT :l OFFSET :o
    """), {"l": size, "o": offset}).mappings().all()
    total = db.execute(text("SELECT COUNT(*) FROM tickets")).scalar()
    return {"page": page, "size": size, "total": total, "items": list(rows)}
