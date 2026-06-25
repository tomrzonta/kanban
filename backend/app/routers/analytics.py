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


# Expressão SQL do "prejuízo efetivo" de um ticket, respeitando o desfecho:
#  - desfecho sem prejuízo  -> 0
#  - desfecho parcial        -> prejuizo_real informado
#  - desfecho total OU ainda sem desfecho -> custo_unitario * quantidade (cheio)
# Reutilizada em todas as análises para eliminar o viés de tratar tudo como perda.
# Requer que a query tenha JOIN/LEFT JOIN da tabela tickets como 't' e, quando
# usar o desfecho, um LEFT JOIN de desfechos como 'dsf'.
PREJUIZO_EFETIVO = """
    CASE
        WHEN dsf.impacto = 'sem_prejuizo' THEN 0
        WHEN dsf.impacto = 'parcial' THEN COALESCE(t.prejuizo_real, 0)
        ELSE t.custo_unitario * t.quantidade
    END
"""


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


def _where_recebimentos(brand_id, supplier_id, defect_type_id, column_id,
                        date_from, date_to):
    """WHERE para recebimentos. Os filtros de fabricante/fornecedor/defeito miram
    o ticket vinculado (r -> t); o filtro de DATA mira a data do recebimento.
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
        conds.append("r.data_recebimento >= :date_from")
        params["date_from"] = date_from
    if date_to:
        conds.append("r.data_recebimento <= :date_to")
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

    # Base reaproveitada: tickets + join de marca/modelo + desfecho, com filtro.
    base = f"""
        FROM tickets t
        JOIN printer_models m ON m.id = t.printer_model_id
        JOIN printer_brands b ON b.id = m.brand_id
        LEFT JOIN desfechos dsf ON dsf.id = t.desfecho_id
        {where}
    """

    # --- KPIs gerais (prejuízo efetivo respeita o desfecho de cada ticket) ---
    kpis = db.execute(text(f"""
        SELECT COUNT(*) AS total_tickets,
               COALESCE(SUM({PREJUIZO_EFETIVO}), 0) AS prejuizo_total,
               COALESCE(AVG({PREJUIZO_EFETIVO}), 0) AS prejuizo_medio
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
                   COALESCE(SUM({PREJUIZO_EFETIVO}), 0) AS prejuizo
            FROM tickets t
            JOIN printer_models m ON m.id = t.printer_model_id
            JOIN printer_brands b ON b.id = m.brand_id
            LEFT JOIN desfechos dsf ON dsf.id = t.desfecho_id
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
    por_responsavel = agrupado(
        "COALESCE(u.nome, u.username)",
        "LEFT JOIN users u ON u.id = t.responsavel_id")
    por_desfecho = agrupado("dsf2.name",
        "LEFT JOIN desfechos dsf2 ON dsf2.id = t.desfecho_id")

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

    # --- Recebimentos (RMA), respeitando os filtros (data = data do recebimento) ---
    where_rec, params_rec = _where_recebimentos(**f)
    base_rec = f"""
        FROM recebimentos r
        JOIN tickets t ON t.id = r.ticket_id
        JOIN printer_models m ON m.id = t.printer_model_id
        JOIN printer_brands b ON b.id = m.brand_id
        {where_rec}
    """
    # Total de recebimentos e soma de unidades recebidas no recorte.
    rec_kpi = db.execute(text(f"""
        SELECT COUNT(*) AS total, COALESCE(SUM(r.quantidade), 0) AS unidades
        {base_rec}
    """), params_rec).mappings().first()

    def rec_agrupado(group_col, extra_join=""):
        return [dict(x) for x in db.execute(text(f"""
            SELECT {group_col} AS nome, COUNT(r.id) AS qtd,
                   COALESCE(SUM(r.quantidade), 0) AS unidades
            FROM recebimentos r
            JOIN tickets t ON t.id = r.ticket_id
            JOIN printer_models m ON m.id = t.printer_model_id
            JOIN printer_brands b ON b.id = m.brand_id
            {extra_join}
            {where_rec}
            GROUP BY {group_col}
            HAVING {group_col} IS NOT NULL
            ORDER BY qtd DESC
        """), params_rec).mappings().all()]

    rec_por_condicao = rec_agrupado("r.condicao")
    rec_por_fabricante = rec_agrupado("b.name")
    rec_por_modelo = rec_agrupado("m.name")

    # Volume de recebimentos por mês (série temporal).
    rec_por_periodo = [dict(x) for x in db.execute(text(f"""
        SELECT TO_CHAR(r.data_recebimento, 'YYYY-MM') AS nome,
               COUNT(r.id) AS qtd
        {base_rec}
        GROUP BY TO_CHAR(r.data_recebimento, 'YYYY-MM')
        ORDER BY nome
    """), params_rec).mappings().all()]

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
        "por_responsavel": por_responsavel,
        "por_desfecho": por_desfecho,
        "por_coluna": por_coluna,
        "gargalos": gargalos,
        "recebimentos": {
            "total": rec_kpi["total"],
            "unidades": rec_kpi["unidades"],
            "por_condicao": rec_por_condicao,
            "por_fabricante": rec_por_fabricante,
            "por_modelo": rec_por_modelo,
            "por_periodo": rec_por_periodo,
        },
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
               t.custo_unitario, {PREJUIZO_EFETIVO} AS prejuizo,
               t.column_id, t.created_at, t.last_moved_at,
               t.problema, t.notas, t.codigo_rastreio,
               t.requer_contato_cliente, t.retorno_horas, t.retorno_definido_em,
               t.printer_model_id, t.supplier_id, t.defect_type_id, t.order_index,
               t.desfecho_id, t.prejuizo_real, dsf.name AS desfecho_nome,
               dsf.impacto AS desfecho_impacto,
               b.name AS marca
        FROM tickets t
        JOIN printer_models m ON m.id = t.printer_model_id
        JOIN printer_brands b ON b.id = m.brand_id
        JOIN columns c ON c.id = t.column_id
        LEFT JOIN suppliers s ON s.id = t.supplier_id
        LEFT JOIN defect_types df ON df.id = t.defect_type_id
        LEFT JOIN desfechos dsf ON dsf.id = t.desfecho_id
        {where} {extra}
        ORDER BY t.last_moved_at DESC
    """), params).mappings().all()
    return [dict(r) for r in rows]


@router.get("/export.csv")
def export_csv(f: dict = Depends(filtros), db: Session = Depends(get_db)):
    """Exporta a tabela de tickets do recorte filtrado em CSV (abre no Excel)."""
    where, params = _where(**f)
    rows = db.execute(text(f"""
        SELECT t.id, t.codigo_interno, t.titulo, b.name AS fabricante, m.name AS modelo,
               s.name AS fornecedor, df.name AS defeito,
               dsf.name AS desfecho,
               c.name AS etapa, t.origem, t.numero_nf, t.serial_number,
               t.quantidade, t.custo_unitario,
               {PREJUIZO_EFETIVO} AS prejuizo,
               t.created_at
        FROM tickets t
        JOIN printer_models m ON m.id = t.printer_model_id
        JOIN printer_brands b ON b.id = m.brand_id
        LEFT JOIN suppliers s ON s.id = t.supplier_id
        LEFT JOIN defect_types df ON df.id = t.defect_type_id
        LEFT JOIN desfechos dsf ON dsf.id = t.desfecho_id
        JOIN columns c ON c.id = t.column_id
        {where}
        ORDER BY t.created_at DESC
    """), params).mappings().all()

    buf = io.StringIO()
    writer = csv.writer(buf, delimiter=";")  # ; abre direto no Excel pt-BR
    writer.writerow(["Código", "Título", "Fabricante", "Modelo", "Fornecedor",
                     "Defeito", "Desfecho", "Etapa", "Origem", "NF", "SN", "Qtd",
                     "Custo Unit.", "Prejuízo efetivo", "Criado em"])
    for r in rows:
        writer.writerow([r["codigo_interno"] or "", r["titulo"], r["fabricante"],
                         r["modelo"], r["fornecedor"] or "", r["defeito"] or "",
                         r["desfecho"] or "", r["etapa"], r["origem"],
                         r["numero_nf"] or "", r["serial_number"] or "",
                         r["quantidade"], r["custo_unitario"], r["prejuizo"],
                         r["created_at"]])
    # BOM (\ufeff) garante acentuação correta ao abrir no Excel.
    data = "\ufeff" + buf.getvalue()
    return StreamingResponse(
        iter([data]), media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="tickets_filtrados.csv"'},
    )
