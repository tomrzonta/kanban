"""Endpoint único de análise filtrada — o "motor" do dashboard tipo Power BI.

Recebe todos os filtros (período, fabricante, fornecedor, defeito, coluna) e
devolve TODAS as métricas já recalculadas para aquele recorte. Centralizar num
endpoint só faz o dashboard inteiro reagir a qualquer mudança de filtro.
"""
from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
import io
import csv

from app.core.database import get_db

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _where(brand_id, supplier_id, defect_type_id, column_id, date_from, date_to):
    """Monta a cláusula WHERE e os parâmetros a partir dos filtros não-nulos.

    Filtros vazios são ignorados (não restringem). Datas filtram por created_at.
    """
    conds = []
    params = {}
    if brand_id:
        conds.append("m.brand_id = :brand_id")
        params["brand_id"] = brand_id
    if supplier_id:
        conds.append("t.supplier_id = :supplier_id")
        params["supplier_id"] = supplier_id
    if defect_type_id:
        conds.append("t.defect_type_id = :defect_type_id")
        params["defect_type_id"] = defect_type_id
    if column_id:
        conds.append("t.column_id = :column_id")
        params["column_id"] = column_id
    if date_from:
        conds.append("t.created_at >= :date_from")
        params["date_from"] = date_from
    if date_to:
        conds.append("t.created_at <= :date_to")
        params["date_to"] = date_to
    where = ("WHERE " + " AND ".join(conds)) if conds else ""
    return where, params


# Filtros comuns a todos os endpoints (injetados como dependência).
def filtros(
    brand_id: int | None = Query(None),
    supplier_id: int | None = Query(None),
    defect_type_id: int | None = Query(None),
    column_id: int | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
):
    return dict(brand_id=brand_id, supplier_id=supplier_id,
                defect_type_id=defect_type_id, column_id=column_id,
                date_from=date_from, date_to=date_to)


@router.get("/dashboard")
def dashboard(f: dict = Depends(filtros), db: Session = Depends(get_db)):
    """Devolve todas as métricas do dashboard para o recorte filtrado."""
    where, params = _where(**f)

    # Base reaproveitada: tickets + join de marca/modelo, com o filtro aplicado.
    base = f"""
        FROM tickets t
        JOIN printer_models m ON m.id = t.printer_model_id
        JOIN printer_brands b ON b.id = m.brand_id
        {where}
    """

    # --- KPIs gerais ---
    kpis = db.execute(text(f"""
        SELECT COUNT(*) AS total_tickets,
               COALESCE(SUM(t.custo_unitario * t.quantidade), 0) AS prejuizo_total,
               COALESCE(AVG(t.custo_unitario * t.quantidade), 0) AS prejuizo_medio
        {base}
    """), params).mappings().first()

    # --- MTTR (criação -> 1ª chegada em coluna is_done), respeitando o filtro ---
    mttr = db.execute(text(f"""
        SELECT AVG(EXTRACT(EPOCH FROM (done.moved_at - t.created_at)) / 3600) AS mttr
        FROM tickets t
        JOIN printer_models m ON m.id = t.printer_model_id
        JOIN printer_brands b ON b.id = m.brand_id
        JOIN LATERAL (
            SELECT h.moved_at FROM ticket_history h
            JOIN columns c ON c.id = h.to_column_id
            WHERE h.ticket_id = t.id AND c.is_done = 1
            ORDER BY h.moved_at ASC LIMIT 1
        ) done ON TRUE
        {where}
    """), params).scalar()

    def agrupado(group_col, join_extra=""):
        return [dict(r) for r in db.execute(text(f"""
            SELECT {group_col} AS nome,
                   COUNT(t.id) AS qtd,
                   COALESCE(SUM(t.custo_unitario * t.quantidade), 0) AS prejuizo
            FROM tickets t
            JOIN printer_models m ON m.id = t.printer_model_id
            JOIN printer_brands b ON b.id = m.brand_id
            {join_extra}
            {where}
            GROUP BY {group_col}
            HAVING {group_col} IS NOT NULL
            ORDER BY qtd DESC
        """), params).mappings().all()]

    por_fabricante = agrupado("b.name")
    por_modelo = agrupado("m.name")
    por_fornecedor = agrupado("s.name", "LEFT JOIN suppliers s ON s.id = t.supplier_id")
    por_defeito = agrupado("df.name", "LEFT JOIN defect_types df ON df.id = t.defect_type_id")
    por_origem = agrupado("t.origem::text")

    # --- Distribuição por coluna atual (status do funil) ---
    por_coluna = [dict(r) for r in db.execute(text(f"""
        SELECT c.name AS nome, COUNT(t.id) AS qtd
        FROM tickets t
        JOIN printer_models m ON m.id = t.printer_model_id
        JOIN printer_brands b ON b.id = m.brand_id
        JOIN columns c ON c.id = t.column_id
        {where}
        GROUP BY c.id, c.name, c.order_index
        ORDER BY c.order_index
    """), params).mappings().all()]

    # --- Tempo médio por coluna (gargalos) ---
    # Aqui o filtro de coluna não se aplica (analisamos todas as etapas).
    gargalos = [dict(r) for r in db.execute(text("""
        WITH spans AS (
            SELECT h.to_column_id,
                   EXTRACT(EPOCH FROM (
                       LEAD(h.moved_at) OVER (PARTITION BY h.ticket_id ORDER BY h.moved_at)
                       - h.moved_at)) / 3600 AS horas
            FROM ticket_history h
        )
        SELECT c.name AS nome, c.is_waiting_client,
               AVG(s.horas) AS media_horas
        FROM spans s JOIN columns c ON c.id = s.to_column_id
        WHERE s.horas IS NOT NULL
        GROUP BY c.id, c.name, c.is_waiting_client
        ORDER BY media_horas DESC
    """)).mappings().all()]

    return {
        "kpis": {
            "total_tickets": kpis["total_tickets"],
            "prejuizo_total": float(kpis["prejuizo_total"]),
            "prejuizo_medio": float(kpis["prejuizo_medio"]),
            "mttr_horas": float(mttr) if mttr else None,
        },
        "por_fabricante": por_fabricante,
        "por_modelo": por_modelo,
        "por_fornecedor": por_fornecedor,
        "por_defeito": por_defeito,
        "por_origem": por_origem,
        "por_coluna": por_coluna,
        "gargalos": gargalos,
    }


@router.get("/concluidos")
def concluidos(f: dict = Depends(filtros), db: Session = Depends(get_db)):
    """Lista todos os tickets em coluna de conclusão (is_done), com filtros.

    Inclui os recém-concluídos (ainda visíveis no quadro) e os antigos. A regra
    de 'sumir do quadro após 48h' é aplicada no frontend; aqui devolvemos todos.
    """
    where, params = _where(**f)
    extra = "AND c.is_done = 1" if where else "WHERE c.is_done = 1"
    rows = db.execute(text(f"""
        SELECT t.id, t.titulo, b.name AS fabricante, m.name AS modelo,
               s.name AS fornecedor_nome, df.name AS defeito_nome,
               t.origem, t.numero_nf, t.serial_number, t.quantidade,
               t.custo_unitario, (t.custo_unitario * t.quantidade) AS prejuizo,
               t.column_id, t.created_at, t.last_moved_at,
               t.problema, t.notas, t.codigo_rastreio,
               t.requer_contato_cliente, t.retorno_horas, t.retorno_definido_em,
               t.printer_model_id, t.supplier_id, t.defect_type_id, t.order_index,
               b.name AS marca
        FROM tickets t
        JOIN printer_models m ON m.id = t.printer_model_id
        JOIN printer_brands b ON b.id = m.brand_id
        JOIN columns c ON c.id = t.column_id
        LEFT JOIN suppliers s ON s.id = t.supplier_id
        LEFT JOIN defect_types df ON df.id = t.defect_type_id
        {where} {extra}
        ORDER BY t.last_moved_at DESC
    """), params).mappings().all()
    return [dict(r) for r in rows]


@router.get("/export.csv")
def export_csv(f: dict = Depends(filtros), db: Session = Depends(get_db)):
    """Exporta a tabela de tickets do recorte filtrado em CSV (abre no Excel)."""
    where, params = _where(**f)
    rows = db.execute(text(f"""
        SELECT t.id, t.titulo, b.name AS fabricante, m.name AS modelo,
               s.name AS fornecedor, df.name AS defeito,
               c.name AS etapa, t.origem, t.numero_nf, t.serial_number,
               t.quantidade, t.custo_unitario,
               (t.custo_unitario * t.quantidade) AS prejuizo,
               t.created_at
        FROM tickets t
        JOIN printer_models m ON m.id = t.printer_model_id
        JOIN printer_brands b ON b.id = m.brand_id
        LEFT JOIN suppliers s ON s.id = t.supplier_id
        LEFT JOIN defect_types df ON df.id = t.defect_type_id
        JOIN columns c ON c.id = t.column_id
        {where}
        ORDER BY t.created_at DESC
    """), params).mappings().all()

    buf = io.StringIO()
    writer = csv.writer(buf, delimiter=";")  # ; abre direto no Excel pt-BR
    writer.writerow(["ID", "Título", "Fabricante", "Modelo", "Fornecedor",
                     "Defeito", "Etapa", "Origem", "NF", "SN", "Qtd",
                     "Custo Unit.", "Prejuízo", "Criado em"])
    for r in rows:
        writer.writerow([str(r["id"]), r["titulo"], r["fabricante"], r["modelo"],
                         r["fornecedor"] or "", r["defeito"] or "", r["etapa"],
                         r["origem"], r["numero_nf"] or "", r["serial_number"] or "",
                         r["quantidade"], r["custo_unitario"], r["prejuizo"],
                         r["created_at"]])
    # BOM (\ufeff) garante acentuação correta ao abrir no Excel.
    data = "\ufeff" + buf.getvalue()
    return StreamingResponse(
        iter([data]), media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="tickets_filtrados.csv"'},
    )
