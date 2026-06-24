import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend,
  CartesianGrid,
} from "recharts";
import { api } from "../api/client";

// Dashboard analítico com filtros que recalculam tudo (estilo Power BI).
// Gráficos com DIMENSÕES FIXAS (sem ResponsiveContainer) para renderização
// confiável — o auto-dimensionamento falhava dentro do grid de cards.
const CORES = ["#1d9e75", "#185fa5", "#e03e3e", "#f5a623", "#7c3aed",
               "#0891b2", "#db2777", "#65a30d"];

// Largura/altura fixas dos gráficos. O card acompanha a largura do gráfico.
const CHART_W = 460;
const CHART_H = 260;

const FILTROS_VAZIOS = {
  brand_id: "", supplier_id: "", defect_type_id: "",
  column_id: "", date_from: "", date_to: "",
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);

  const [brands, setBrands] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [defects, setDefects] = useState([]);
  const [columns, setColumns] = useState([]);

  useEffect(() => {
    api.listBrands().then(setBrands);
    api.listEntities("suppliers").then(setSuppliers);
    api.listEntities("defect-types").then(setDefects);
    api.listColumns().then(setColumns);
  }, []);

  const carregar = useCallback(() => {
    setLoading(true);
    api.analyticsDashboard(filtros).then(setData).finally(() => setLoading(false));
  }, [filtros]);

  useEffect(() => { carregar(); }, [carregar]);

  const set = (key) => (e) => setFiltros((f) => ({ ...f, [key]: e.target.value }));
  const limpar = () => setFiltros(FILTROS_VAZIOS);

  const k = data?.kpis;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Barra de filtros */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)", padding: 16,
                    display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <Filtro label="Fabricante">
          <select value={filtros.brand_id} onChange={set("brand_id")}>
            <option value="">Todos</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Filtro>
        <Filtro label="Fornecedor">
          <select value={filtros.supplier_id} onChange={set("supplier_id")}>
            <option value="">Todos</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Filtro>
        <Filtro label="Tipo de defeito">
          <select value={filtros.defect_type_id} onChange={set("defect_type_id")}>
            <option value="">Todos</option>
            {defects.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Filtro>
        <Filtro label="Etapa">
          <select value={filtros.column_id} onChange={set("column_id")}>
            <option value="">Todas</option>
            {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Filtro>
        <Filtro label="De">
          <input type="date" value={filtros.date_from} onChange={set("date_from")} />
        </Filtro>
        <Filtro label="Até">
          <input type="date" value={filtros.date_to} onChange={set("date_to")} />
        </Filtro>
        <button onClick={limpar}>Limpar</button>
        <a href={api.analyticsExportUrl(filtros)} style={{ marginLeft: "auto" }}>
          <button className="primary">⬇ Exportar CSV (filtrado)</button>
        </a>
      </div>

      {loading && <p style={{ color: "var(--text-tertiary)" }}>Calculando…</p>}

      {k && (
        <>
          {/* KPIs */}
          <div style={{ display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                        gap: 12 }}>
            <Kpi label="Total de tickets" value={k.total_tickets} />
            <Kpi label="Prejuízo total"
                 value={`R$ ${k.prejuizo_total.toLocaleString("pt-BR")}`} danger />
            <Kpi label="Prejuízo médio/ticket"
                 value={`R$ ${k.prejuizo_medio.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} />
            <Kpi label="MTTR"
                 value={k.mttr_horas ? `${k.mttr_horas.toFixed(1)} h` : "—"} />
          </div>

          {/* Gráficos: largura fixa, quebram em linhas conforme a tela. */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            <Card title="Tickets por fabricante">
              <Barras data={data.por_fabricante} y="qtd" fill="#1d9e75" />
            </Card>
            <Card title="Prejuízo por fabricante (R$)">
              <Barras data={data.por_fabricante} y="prejuizo" fill="#e03e3e" />
            </Card>
            <Card title="Tickets por modelo">
              <Barras data={data.por_modelo} y="qtd" fill="#185fa5" />
            </Card>
            <Card title="Tickets por fornecedor">
              <Barras data={data.por_fornecedor} y="qtd" fill="#0891b2" />
            </Card>
            <Card title="Tickets por tipo de defeito">
              <Pizza data={data.por_defeito} />
            </Card>
            <Card title="Tickets por origem">
              <Pizza data={data.por_origem} />
            </Card>
            <Card title="Distribuição por etapa (funil)">
              <Barras data={data.por_coluna} y="qtd" fill="#7c3aed" />
            </Card>
            <Card title="Gargalos — tempo médio por etapa (h)">
              <Barras data={data.gargalos} y="media_horas" fill="#f5a623" />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Filtro({ label, children }) {
  return (
    <div style={{ minWidth: 140 }}>
      <label>{label}</label>
      {children}
    </div>
  );
}

function Kpi({ label, value, danger }) {
  return (
    <div style={{ padding: "14px 16px", background: "var(--surface)",
                  border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600,
                    color: danger ? "var(--red)" : "var(--text)" }}>{value}</div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <section style={{ background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-lg)", padding: 20 }}>
      <h3 style={{ fontSize: 15, marginBottom: 16 }}>{title}</h3>
      {children}
    </section>
  );
}

// Gráficos com tamanho fixo (sem ResponsiveContainer) — renderização garantida.
function Barras({ data, y, fill }) {
  if (!data || data.length === 0) return <Vazio />;
  return (
    <BarChart width={CHART_W} height={CHART_H} data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
      <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
      <YAxis tick={{ fontSize: 11 }} />
      <Tooltip />
      <Bar dataKey={y} fill={fill} radius={[4, 4, 0, 0]} />
    </BarChart>
  );
}

function Pizza({ data }) {
  if (!data || data.length === 0) return <Vazio />;
  return (
    <PieChart width={CHART_W} height={CHART_H}>
      <Pie data={data} dataKey="qtd" nameKey="nome" cx="50%" cy="50%"
           outerRadius={90} label={(e) => e.nome}>
        {data.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  );
}

function Vazio() {
  return (
    <div style={{ width: CHART_W, height: CHART_H, display: "flex",
                  alignItems: "center", justifyContent: "center",
                  color: "var(--text-tertiary)", fontSize: 13 }}>
      Sem dados para este filtro
    </div>
  );
}
