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


def _where(brand_id, supplier_id, defect_type_id, column_id, responsavel_id,
           date_from, date_to):
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
    if responsavel_id:
        conds.append("t.responsavel_id = :responsavel_id")
        params["responsavel_id"] = responsavel_id
    if date_from:
        conds.append("t.created_at >= :date_from")
        params["date_from"] = date_from
    if date_to:
        conds.append("t.created_at <= :date_to")
        params["date_to"] = date_to
    where = ("WHERE " + " AND ".join(conds)) if conds else ""
    return where, params


def _where_recebimentos(brand_id, supplier_id, defect_type_id, column_id,
                        responsavel_id, date_from, date_to):
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
    if responsavel_id:
        conds.append("t.responsavel_id = :responsavel_id")
        params["responsavel_id"] = responsavel_id
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
    responsavel_id: int | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
):
    return dict(brand_id=brand_id, supplier_id=supplier_id,
                defect_type_id=defect_type_id, column_id=column_id,
                responsavel_id=responsavel_id,
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

    # --- Taxa de resolução: dos tickets COM desfecho, quanto foi resolvido sem
    # prejuízo vs. parcial vs. perda total. Fecha o ciclo dos desfechos. ---
    resolucao_rows = db.execute(text(f"""
        SELECT dsf.impacto AS impacto,
               COUNT(t.id) AS qtd,
               COALESCE(SUM({PREJUIZO_EFETIVO}), 0) AS prejuizo
        FROM tickets t
        JOIN printer_models m ON m.id = t.printer_model_id
        JOIN printer_brands b ON b.id = m.brand_id
        JOIN desfechos dsf ON dsf.id = t.desfecho_id
        {where}
        GROUP BY dsf.impacto
    """), params).mappings().all()

    # Organiza por categoria de impacto, com totais e percentuais.
    resol = {"sem_prejuizo": {"qtd": 0, "prejuizo": 0.0},
             "parcial": {"qtd": 0, "prejuizo": 0.0},
             "total": {"qtd": 0, "prejuizo": 0.0}}
    for r in resolucao_rows:
        imp = r["impacto"] or "total"
        if imp not in resol:
            resol[imp] = {"qtd": 0, "prejuizo": 0.0}
        resol[imp]["qtd"] += r["qtd"]
        resol[imp]["prejuizo"] += float(r["prejuizo"] or 0)

    total_classificados = sum(v["qtd"] for v in resol.values())
    pct = lambda n: round(n / total_classificados * 100, 1) if total_classificados else 0

    taxa_resolucao = {
        "total_classificados": total_classificados,
        "sem_prejuizo": {**resol["sem_prejuizo"], "pct": pct(resol["sem_prejuizo"]["qtd"])},
        "parcial": {**resol["parcial"], "pct": pct(resol["parcial"]["qtd"])},
        "total": {**resol["total"], "pct": pct(resol["total"]["qtd"])},
        # "Resolvido sem perda" = sem prejuízo; "com alguma perda" = parcial+total.
        "pct_resolvido": pct(resol["sem_prejuizo"]["qtd"]),
        "pct_com_perda": pct(resol["parcial"]["qtd"] + resol["total"]["qtd"]),
    }

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
        "taxa_resolucao": taxa_resolucao,
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


@router.get("/ticket-timeline")
def ticket_timeline(codigo: str | None = None, ticket_id: str | None = None,
                    db: Session = Depends(get_db)):
    """Linha do tempo de UM ticket: cada passagem por coluna (entrou/saiu/duração)
    e o total acumulado por coluna. Aceita o código interno (GAR-...) ou o id.
    """
    if codigo:
        t = db.execute(text("""
            SELECT t.id, t.codigo_interno, t.titulo, t.created_at,
                   b.name AS fabricante, m.name AS modelo
            FROM tickets t
            JOIN printer_models m ON m.id = t.printer_model_id
            JOIN printer_brands b ON b.id = m.brand_id
            WHERE t.codigo_interno = :codigo
        """), {"codigo": codigo.strip()}).mappings().first()
    elif ticket_id:
        t = db.execute(text("""
            SELECT t.id, t.codigo_interno, t.titulo, t.created_at,
                   b.name AS fabricante, m.name AS modelo
            FROM tickets t
            JOIN printer_models m ON m.id = t.printer_model_id
            JOIN printer_brands b ON b.id = m.brand_id
            WHERE t.id = :tid
        """), {"tid": ticket_id}).mappings().first()
    else:
        raise HTTPException(400, "Informe o código ou o id do ticket.")

    if not t:
        raise HTTPException(404, "Ticket não encontrado.")

    # Cada passagem: coluna de destino de cada movimentação, com o tempo até a
    # movimentação seguinte (LEAD). A última passagem vai até agora (NOW()).
    passagens = db.execute(text("""
        SELECT c.name AS coluna,
               h.moved_at AS entrada,
               LEAD(h.moved_at) OVER (ORDER BY h.moved_at) AS saida,
               EXTRACT(EPOCH FROM (
                   COALESCE(LEAD(h.moved_at) OVER (ORDER BY h.moved_at), NOW())
                   - h.moved_at)) / 3600 AS horas
        FROM ticket_history h
        JOIN columns c ON c.id = h.to_column_id
        WHERE h.ticket_id = :tid
        ORDER BY h.moved_at
    """), {"tid": str(t["id"])}).mappings().all()

    totais = {}
    for p in passagens:
        totais[p["coluna"]] = totais.get(p["coluna"], 0) + float(p["horas"] or 0)

    return {
        "ticket": {
            "codigo_interno": t["codigo_interno"], "titulo": t["titulo"],
            "fabricante": t["fabricante"], "modelo": t["modelo"],
            "created_at": str(t["created_at"]),
        },
        "passagens": [
            {"coluna": p["coluna"], "entrada": str(p["entrada"]),
             "saida": str(p["saida"]) if p["saida"] else None,
             "horas": round(float(p["horas"] or 0), 1)}
            for p in passagens
        ],
        "total_por_coluna": [
            {"coluna": k, "horas": round(v, 1)} for k, v in totais.items()
        ],
    }


@router.get("/export-completo.csv")
def export_completo(db: Session = Depends(get_db)):
    """CSV largo (uma linha por ticket) com TODOS os dados de acompanhamento,
    pronto para o Power BI. Sempre traz a base completa (ignora filtros).
    """
    rows = db.execute(text(f"""
        SELECT
            t.codigo_interno, t.titulo, t.problema,
            b.name AS fabricante, m.name AS modelo, m.sku,
            s.name AS fornecedor, df.name AS defeito,
            dsf.name AS desfecho, dsf.impacto AS desfecho_impacto,
            COALESCE(ru.nome, ru.username) AS responsavel,
            t.origem, t.numero_nf, t.serial_number, t.codigo_rastreio,
            t.quantidade, t.custo_unitario,
            {PREJUIZO_EFETIVO} AS prejuizo_efetivo,
            t.custo_unitario * t.quantidade AS prejuizo_potencial,
            t.prejuizo_real,
            c.name AS etapa_atual, c.is_done AS concluido,
            t.requer_contato_cliente, t.retorno_horas,
            t.created_at,
            EXTRACT(DAY FROM (NOW() - t.created_at))::int AS dias_desde_abertura,
            t.last_moved_at,
            EXTRACT(EPOCH FROM (NOW() - t.created_at)) / 3600 AS horas_total_aberto,
            -- 1ª chegada em coluna final = momento de conclusão (se houver).
            (SELECT MIN(h.moved_at) FROM ticket_history h
             JOIN columns cc ON cc.id = h.to_column_id
             WHERE h.ticket_id = t.id AND cc.is_done = 1) AS concluido_em,
            -- nº de recebimentos (RMA) vinculados.
            (SELECT COUNT(*) FROM recebimentos r WHERE r.ticket_id = t.id) AS qtd_recebimentos
        FROM tickets t
        JOIN printer_models m ON m.id = t.printer_model_id
        JOIN printer_brands b ON b.id = m.brand_id
        JOIN columns c ON c.id = t.column_id
        LEFT JOIN suppliers s ON s.id = t.supplier_id
        LEFT JOIN defect_types df ON df.id = t.defect_type_id
        LEFT JOIN desfechos dsf ON dsf.id = t.desfecho_id
        LEFT JOIN users ru ON ru.id = t.responsavel_id
        ORDER BY t.codigo_interno
    """)).mappings().all()

    # Tempo total por coluna de cada ticket (vira colunas dinâmicas no CSV).
    tempos = db.execute(text("""
        WITH spans AS (
            SELECT h.ticket_id, h.to_column_id,
                   EXTRACT(EPOCH FROM (
                       COALESCE(LEAD(h.moved_at) OVER (
                           PARTITION BY h.ticket_id ORDER BY h.moved_at), NOW())
                       - h.moved_at)) / 3600 AS horas
            FROM ticket_history h
        )
        SELECT s.ticket_id, c.name AS coluna, SUM(s.horas) AS horas
        FROM spans s JOIN columns c ON c.id = s.to_column_id
        GROUP BY s.ticket_id, c.name
    """)).mappings().all()

    # Organiza o tempo por coluna num dicionário por ticket.
    # (cruzamos pelo código do ticket via uma segunda consulta de id->codigo)
    id_para_codigo = {str(r["id"]): r["codigo_interno"] for r in db.execute(text(
        "SELECT id, codigo_interno FROM tickets")).mappings().all()}
    colunas_nomes = sorted({tp["coluna"] for tp in tempos})
    tempo_por_ticket = {}
    for tp in tempos:
        cod = id_para_codigo.get(str(tp["ticket_id"]))
        tempo_por_ticket.setdefault(cod, {})[tp["coluna"]] = round(float(tp["horas"] or 0), 1)

    buf = io.StringIO()
    writer = csv.writer(buf, delimiter=";")
    cabecalho = [
        "Código", "Título", "Problema", "Fabricante", "Modelo", "SKU",
        "Fornecedor", "Defeito", "Desfecho", "Impacto desfecho", "Responsável",
        "Origem", "NF", "Nº série", "Rastreio", "Quantidade", "Custo unitário",
        "Prejuízo efetivo", "Prejuízo potencial", "Prejuízo real informado",
        "Etapa atual", "Concluído", "Requer contato", "Prazo retorno (h)",
        "Criado em", "Dias desde abertura", "Última movimentação",
        "Horas total aberto", "Concluído em", "Qtd recebimentos",
    ] + [f"Horas em: {c}" for c in colunas_nomes]
    writer.writerow(cabecalho)

    for r in rows:
        tempos_t = tempo_por_ticket.get(r["codigo_interno"], {})
        linha = [
            r["codigo_interno"] or "", r["titulo"], (r["problema"] or "").replace("\n", " "),
            r["fabricante"], r["modelo"], r["sku"] or "",
            r["fornecedor"] or "", r["defeito"] or "", r["desfecho"] or "",
            r["desfecho_impacto"] or "", r["responsavel"] or "",
            r["origem"], r["numero_nf"] or "", r["serial_number"] or "",
            r["codigo_rastreio"] or "", r["quantidade"], r["custo_unitario"],
            r["prejuizo_efetivo"], r["prejuizo_potencial"],
            r["prejuizo_real"] if r["prejuizo_real"] is not None else "",
            r["etapa_atual"], "Sim" if r["concluido"] else "Não",
            "Sim" if r["requer_contato_cliente"] else "Não",
            r["retorno_horas"] if r["retorno_horas"] is not None else "",
            r["created_at"], r["dias_desde_abertura"], r["last_moved_at"],
            round(float(r["horas_total_aberto"] or 0), 1),
            r["concluido_em"] or "", r["qtd_recebimentos"],
        ] + [tempos_t.get(c, 0) for c in colunas_nomes]
        writer.writerow(linha)

    data = "\ufeff" + buf.getvalue()
    return StreamingResponse(
        iter([data]), media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="garantias3d_completo.csv"'},
    )


@router.get("/comparativo")
def comparativo(db: Session = Depends(get_db)):
    """Comparação temporal: KPIs do mês atual vs. mês anterior (com variação %)
    e série mensal dos últimos 12 meses. Base para ver tendência, não só o total.

    Métricas: tickets abertos (por created_at), prejuízo efetivo (dos concluídos
    no mês, pela 1ª chegada em coluna is_done), tempo médio de resolução (horas
    da criação até a conclusão) e recebimentos (por data_recebimento).
    """
    # --- KPIs por mês (atual e anterior) ---
    # Tickets criados no mês.
    def kpis_mes(inicio_expr, fim_expr):
        params = {}
        # Tickets abertos no período (por criação).
        abertos = db.execute(text(f"""
            SELECT COUNT(*) FROM tickets t
            WHERE t.created_at >= {inicio_expr} AND t.created_at < {fim_expr}
        """), params).scalar()
        # Concluídos no período: usa a 1ª chegada em coluna is_done.
        # prejuízo efetivo e tempo de resolução são calculados sobre eles.
        linha = db.execute(text(f"""
            WITH conclusao AS (
                SELECT t.id, t.created_at,
                       t.custo_unitario, t.quantidade, t.prejuizo_real,
                       dsf.impacto,
                       MIN(h.moved_at) AS concluido_em
                FROM tickets t
                JOIN ticket_history h ON h.ticket_id = t.id
                JOIN columns c ON c.id = h.to_column_id AND c.is_done = 1
                LEFT JOIN desfechos dsf ON dsf.id = t.desfecho_id
                GROUP BY t.id, t.created_at, t.custo_unitario, t.quantidade,
                         t.prejuizo_real, dsf.impacto
            )
            SELECT
                COUNT(*) FILTER (WHERE concluido_em >= {inicio_expr}
                                   AND concluido_em < {fim_expr}) AS concluidos,
                COALESCE(SUM(
                    CASE WHEN concluido_em >= {inicio_expr} AND concluido_em < {fim_expr}
                    THEN CASE
                        WHEN impacto = 'sem_prejuizo' THEN 0
                        WHEN impacto = 'parcial' THEN COALESCE(prejuizo_real, 0)
                        ELSE custo_unitario * quantidade
                    END ELSE 0 END), 0) AS prejuizo,
                COALESCE(AVG(
                    CASE WHEN concluido_em >= {inicio_expr} AND concluido_em < {fim_expr}
                    THEN EXTRACT(EPOCH FROM (concluido_em - created_at)) / 3600
                    END), 0) AS tempo_medio_horas
            FROM conclusao
        """), params).mappings().first()
        recebimentos = db.execute(text(f"""
            SELECT COUNT(*) FROM recebimentos r
            WHERE r.data_recebimento >= CAST({inicio_expr} AS date)
              AND r.data_recebimento < CAST({fim_expr} AS date)
        """), params).scalar()
        return {
            "tickets": abertos or 0,
            "prejuizo": float(linha["prejuizo"] or 0),
            "tempo_medio_horas": round(float(linha["tempo_medio_horas"] or 0), 1),
            "recebimentos": recebimentos or 0,
        }

    # date_trunc para o 1º dia do mês atual; intervalos via Postgres.
    ini_atual = "date_trunc('month', NOW())"
    ini_ant = "date_trunc('month', NOW()) - INTERVAL '1 month'"
    fim_futuro = "date_trunc('month', NOW()) + INTERVAL '1 month'"

    atual = kpis_mes(ini_atual, fim_futuro)
    anterior = kpis_mes(ini_ant, ini_atual)

    def variacao(a, b):
        # Variação % de 'a' (atual) sobre 'b' (anterior). None se base zero.
        if b == 0:
            return None
        return round((a - b) / b * 100, 1)

    kpis = {}
    for chave in ("tickets", "prejuizo", "tempo_medio_horas", "recebimentos"):
        kpis[chave] = {
            "atual": atual[chave],
            "anterior": anterior[chave],
            "variacao_pct": variacao(atual[chave], anterior[chave]),
        }

    # --- Série mensal (últimos 12 meses): tickets criados e prejuízo concluído ---
    serie_tickets = db.execute(text("""
        SELECT TO_CHAR(date_trunc('month', t.created_at), 'YYYY-MM') AS mes,
               COUNT(*) AS qtd
        FROM tickets t
        WHERE t.created_at >= date_trunc('month', NOW()) - INTERVAL '11 months'
        GROUP BY 1 ORDER BY 1
    """)).mappings().all()

    serie_prejuizo = db.execute(text(f"""
        WITH conclusao AS (
            SELECT t.id, t.custo_unitario, t.quantidade, t.prejuizo_real,
                   dsf.impacto, MIN(h.moved_at) AS concluido_em
            FROM tickets t
            JOIN ticket_history h ON h.ticket_id = t.id
            JOIN columns c ON c.id = h.to_column_id AND c.is_done = 1
            LEFT JOIN desfechos dsf ON dsf.id = t.desfecho_id
            GROUP BY t.id, t.custo_unitario, t.quantidade, t.prejuizo_real, dsf.impacto
        )
        SELECT TO_CHAR(date_trunc('month', concluido_em), 'YYYY-MM') AS mes,
               COALESCE(SUM(CASE
                   WHEN impacto = 'sem_prejuizo' THEN 0
                   WHEN impacto = 'parcial' THEN COALESCE(prejuizo_real, 0)
                   ELSE custo_unitario * quantidade END), 0) AS prejuizo
        FROM conclusao
        WHERE concluido_em >= date_trunc('month', NOW()) - INTERVAL '11 months'
        GROUP BY 1 ORDER BY 1
    """)).mappings().all()

    # Combina as duas séries num único array por mês (para o gráfico de linha).
    meses = {}
    for r in serie_tickets:
        meses.setdefault(r["mes"], {"mes": r["mes"], "tickets": 0, "prejuizo": 0})
        meses[r["mes"]]["tickets"] = r["qtd"]
    for r in serie_prejuizo:
        meses.setdefault(r["mes"], {"mes": r["mes"], "tickets": 0, "prejuizo": 0})
        meses[r["mes"]]["prejuizo"] = float(r["prejuizo"] or 0)
    serie = sorted(meses.values(), key=lambda x: x["mes"])

    return {"kpis": kpis, "serie": serie}
