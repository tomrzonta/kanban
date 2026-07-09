import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend,
  CartesianGrid, LineChart, Line,
} from "recharts";
import { api } from "../api/client";
import { useToast } from "../components/Toast";

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
  column_id: "", responsavel_id: "", date_from: "", date_to: "",
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const toast = useToast();
  const [baixando, setBaixando] = useState(false);
  const [comp, setComp] = useState(null);

  useEffect(() => { api.comparativo().then(setComp).catch(() => setComp(null)); }, []);

  async function baixarFiltrado() {
    setBaixando(true);
    try { await api.baixarExportFiltrado(filtros); }
    catch (e) { toast.error(String(e.message || "Falha ao baixar o CSV.")); }
    finally { setBaixando(false); }
  }
  async function baixarCompleto() {
    setBaixando(true);
    try { await api.baixarExportCompleto(); }
    catch (e) { toast.error(String(e.message || "Falha ao baixar o CSV.")); }
    finally { setBaixando(false); }
  }

  const [brands, setBrands] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [defects, setDefects] = useState([]);
  const [columns, setColumns] = useState([]);
  const [users, setUsers] = useState([]);

  // Busca de ticket por código para ver a linha do tempo.
  const [buscaTicket, setBuscaTicket] = useState("");
  const [timeline, setTimeline] = useState(null);
  const [erroTimeline, setErroTimeline] = useState(null);

  useEffect(() => {
    api.listBrands().then(setBrands);
    api.listEntities("suppliers").then(setSuppliers);
    api.listEntities("defect-types").then(setDefects);
    api.listColumns().then(setColumns);
    api.listSelectableUsers().then(setUsers);
  }, []);

  async function buscarTimeline() {
    setErroTimeline(null); setTimeline(null);
    if (!buscaTicket.trim()) return;
    try {
      setTimeline(await api.ticketTimeline(buscaTicket.trim()));
    } catch (e) {
      setErroTimeline("Ticket não encontrado. Confira o código (ex: GAR-2026-0001).");
    }
  }

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
        <Filtro label="Responsável">
          <select value={filtros.responsavel_id} onChange={set("responsavel_id")}>
            <option value="">Todos</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.nome || u.username}</option>
            ))}
          </select>
        </Filtro>
        <Filtro label="De">
          <input type="date" value={filtros.date_from} onChange={set("date_from")} />
        </Filtro>
        <Filtro label="Até">
          <input type="date" value={filtros.date_to} onChange={set("date_to")} />
        </Filtro>
        <button onClick={limpar}>Limpar</button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="primary" onClick={baixarFiltrado} disabled={baixando}>
            ⬇ CSV (filtrado)
          </button>
          <button onClick={baixarCompleto} disabled={baixando}
                  title="Base completa, todos os campos, para Power BI">
            ⬇ CSV completo (Power BI)
          </button>
        </div>
      </div>

      {/* Comparação temporal: mês atual vs. anterior + tendência mensal. */}
      {comp && <Comparativo comp={comp} />}

      {/* Busca de um ticket específico: linha do tempo por etapa. */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)", padding: 16 }}>
        <label>Acompanhar um ticket (tempo em cada etapa)</label>
        <div style={{ display: "flex", gap: 8, maxWidth: 480 }}>
          <input value={buscaTicket} onChange={(e) => setBuscaTicket(e.target.value)}
                 onKeyDown={(e) => e.key === "Enter" && buscarTimeline()}
                 placeholder="Código do ticket (ex: GAR-2026-0001)" />
          <button className="primary" onClick={buscarTimeline}
                  style={{ whiteSpace: "nowrap" }}>Buscar</button>
        </div>
        {erroTimeline && (
          <div style={{ color: "var(--red)", fontSize: 13, marginTop: 8 }}>
            {erroTimeline}
          </div>
        )}
        {timeline && <TicketTimeline data={timeline} />}
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

          {/* Taxa de resolução: dos tickets classificados, quanto foi resolvido
              sem perda vs. com perda. */}
          {data.taxa_resolucao && <TaxaResolucao tr={data.taxa_resolucao} />}

          {/* Gráficos: largura fixa, quebram em linhas conforme a tela. */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            <Card title="Tickets por modelo">
              <Barras data={data.por_modelo} y="qtd" fill="#185fa5" />
            </Card>
            <Card title="Prejuízo por modelo (R$)">
              <Barras data={data.por_modelo} y="prejuizo" fill="#e03e3e" />
            </Card>
            <Card title="Tickets por fornecedor">
              <Barras data={data.por_fornecedor} y="qtd" fill="#0891b2" />
            </Card>
            <Card title="Tickets por tipo de defeito">
              <Pizza data={data.por_defeito} />
            </Card>
            <Card title="Tickets por responsável">
              <Barras data={data.por_responsavel} y="qtd" fill="#0d9488" />
            </Card>
            <Card title="Tickets por desfecho">
              <Pizza data={data.por_desfecho} />
            </Card>
            <Card title="Custo por desfecho (R$)">
              <BarrasCusto data={data.custo_por_desfecho} />
            </Card>
            <Card title="Gasto por categoria (R$)">
              <BarrasGasto data={data.gasto_por_categoria} />
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

          {/* Seção separada de Recebimentos (RMA) */}
          {data.recebimentos && (
            <>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20,
                            marginTop: 4 }}>
                <h2 style={{ fontSize: 17, marginBottom: 4 }}>Recebimentos (RMA)</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: 13,
                            marginBottom: 16 }}>
                  Entradas de impressoras com defeito, no período/filtros acima.
                </p>
                <div style={{ display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                              gap: 12, marginBottom: 16 }}>
                  <Kpi label="Recebimentos registrados"
                       value={data.recebimentos.total} />
                  <Kpi label="Unidades recebidas"
                       value={data.recebimentos.unidades} />
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                <Card title="Recebimentos por mês">
                  <Barras data={data.recebimentos.por_periodo} y="qtd" fill="#0891b2" />
                </Card>
                <Card title="Recebimentos por condição">
                  <Pizza data={data.recebimentos.por_condicao} />
                </Card>
                <Card title="Recebimentos por fabricante">
                  <Barras data={data.recebimentos.por_fabricante} y="qtd" fill="#1d9e75" />
                </Card>
                <Card title="Recebimentos por modelo">
                  <Barras data={data.recebimentos.por_modelo} y="qtd" fill="#7c3aed" />
                </Card>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function TaxaResolucao({ tr }) {
  const fmtMoeda = (v) => `R$ ${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
  if (!tr.total_classificados) {
    return (
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)", padding: 16, marginBottom: 16 }}>
        <h2 style={{ fontSize: 17, margin: "0 0 4px" }}>Taxa de resolução</h2>
        <p style={{ color: "var(--text-tertiary)", fontSize: 13, margin: 0 }}>
          Nenhum ticket classificado com desfecho ainda. Defina o desfecho dos
          tickets concluídos para ver esta análise.
        </p>
      </div>
    );
  }
  // Barra empilhada: sem prejuízo (verde), parcial (amarelo), total (vermelho).
  const seg = [
    { k: "sem_prejuizo", label: "Resolvido sem perda", cor: "#1d7a4d" },
    { k: "informativo", label: "Informativo", cor: "#2563c8" },
    { k: "parcial", label: "Perda parcial", cor: "#f5a623" },
    { k: "total", label: "Perda total", cor: "#e03e3e" },
  ];
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)", padding: 16, marginBottom: 16 }}>
      <h2 style={{ fontSize: 17, margin: "0 0 4px" }}>Taxa de resolução</h2>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: "0 0 14px" }}>
        Dos {tr.total_classificados} tickets classificados,{" "}
        <strong style={{ color: "#1d7a4d" }}>{tr.pct_resolvido}% resolvidos</strong>{" "}
        e {tr.pct_com_perda}% com alguma perda.
      </p>

      {/* Barra empilhada proporcional. */}
      <div style={{ display: "flex", height: 28, borderRadius: 6,
                    overflow: "hidden", marginBottom: 14 }}>
        {seg.map((s) => {
          const d = tr[s.k];
          if (!d || d.pct === 0) return null;
          return (
            <div key={s.k} title={`${s.label}: ${d.pct}%`}
                 style={{ width: `${d.pct}%`, background: s.cor, color: "#fff",
                          fontSize: 11, fontWeight: 600, display: "flex",
                          alignItems: "center", justifyContent: "center" }}>
              {d.pct >= 8 ? `${d.pct}%` : ""}
            </div>
          );
        })}
      </div>

      {/* Detalhe por categoria. */}
      <div style={{ display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                    gap: 12 }}>
        {seg.map((s) => {
          const d = tr[s.k];
          return (
            <div key={s.k} style={{ background: "var(--bg)",
                                    borderRadius: "var(--radius)", padding: "10px 12px",
                                    borderLeft: `3px solid ${s.cor}` }}>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
                {d.qtd} <span style={{ fontSize: 13, fontWeight: 400,
                                       color: "var(--text-tertiary)" }}>({d.pct}%)</span>
              </div>
              {d.prejuizo > 0 && (
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                  {fmtMoeda(d.prejuizo)} em perdas
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Comparativo({ comp }) {
  const { kpis, serie } = comp;
  const fmtMoeda = (v) => `R$ ${Number(v).toLocaleString("pt-BR",
    { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const fmtHoras = (h) => h < 24 ? `${h.toFixed(0)}h`
    : `${Math.floor(h / 24)}d ${Math.round(h % 24)}h`;
  const fmtMes = (m) => {
    const [a, mes] = m.split("-");
    return `${["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"][+mes-1]}/${a.slice(2)}`;
  };

  const cards = [
    { chave: "tickets", label: "Tickets abertos", fmt: (v) => v, melhorMenor: false },
    { chave: "prejuizo", label: "Prejuízo efetivo", fmt: fmtMoeda, melhorMenor: true },
    { chave: "tempo_medio_horas", label: "Tempo médio de resolução", fmt: fmtHoras, melhorMenor: true },
    { chave: "recebimentos", label: "Recebimentos (RMA)", fmt: (v) => v, melhorMenor: false },
  ];

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)", padding: 16 }}>
      <h2 style={{ fontSize: 17, margin: "0 0 4px" }}>Comparação com o mês anterior</h2>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: "0 0 16px" }}>
        Mês atual em relação ao mês passado, e a tendência dos últimos meses.
      </p>

      <div style={{ display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 12, marginBottom: 20 }}>
        {cards.map((c) => {
          const d = kpis[c.chave];
          const v = d.variacao_pct;
          // Cor: verde = melhora, vermelho = piora (depende se menor é melhor).
          let cor = "var(--text-tertiary)", seta = "→";
          if (v != null && v !== 0) {
            const subiu = v > 0;
            seta = subiu ? "▲" : "▼";
            const bom = c.melhorMenor ? !subiu : subiu;
            cor = bom ? "#1d7a4d" : "#c2410c";
          }
          return (
            <div key={c.chave} style={{ background: "var(--bg)",
                                        borderRadius: "var(--radius)", padding: "12px 14px" }}>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{c.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                {c.fmt(d.atual)}
              </div>
              <div style={{ fontSize: 12, marginTop: 4, color: cor }}>
                {seta} {v == null ? "—" : `${Math.abs(v)}%`}
                <span style={{ color: "var(--text-tertiary)" }}>
                  {" "}vs. {c.fmt(d.anterior)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tendência mensal: tickets (barras/linha) e prejuízo. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <div style={{ flex: 1, minWidth: 320 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
            Tickets abertos por mês
          </div>
          <LineChart width={420} height={220} data={serie}
                     margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="mes" tickFormatter={fmtMes} fontSize={11} />
            <YAxis fontSize={11} allowDecimals={false} />
            <Tooltip labelFormatter={fmtMes} />
            <Line type="monotone" dataKey="tickets" stroke="#2563c8"
                  strokeWidth={2} name="Tickets" />
          </LineChart>
        </div>
        <div style={{ flex: 1, minWidth: 320 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
            Prejuízo efetivo por mês
          </div>
          <LineChart width={420} height={220} data={serie}
                     margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="mes" tickFormatter={fmtMes} fontSize={11} />
            <YAxis fontSize={11} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
            <Tooltip labelFormatter={fmtMes}
                     formatter={(v) => fmtMoeda(v)} />
            <Line type="monotone" dataKey="prejuizo" stroke="#c2410c"
                  strokeWidth={2} name="Prejuízo" />
          </LineChart>
        </div>
      </div>
    </div>
  );
}

function TicketTimeline({ data }) {
  const fmtData = (s) => s ? new Date(s).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit" }) : "—";
  // Formata horas como "Xd Yh" quando passa de 24h.
  const fmtHoras = (h) => {
    if (h == null) return "—";
    if (h < 24) return `${h.toFixed(1)} h`;
    const d = Math.floor(h / 24);
    return `${d}d ${Math.round(h % 24)}h`;
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        <span style={{ color: "var(--accent)" }}>{data.ticket.codigo_interno}</span>
        {" "}— {data.ticket.titulo}
        <span style={{ color: "var(--text-tertiary)", fontWeight: 400, marginLeft: 6 }}>
          ({data.ticket.fabricante} {data.ticket.modelo})
        </span>
      </div>

      {/* Total por coluna */}
      <div style={{ marginTop: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
          Tempo total por etapa
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {data.total_por_coluna.map((t, i) => (
            <div key={i} style={{ background: "var(--bg)", borderRadius: 6,
                                  padding: "6px 12px", fontSize: 13 }}>
              <span style={{ color: "var(--text-secondary)" }}>{t.coluna}:</span>
              {" "}<strong>{fmtHoras(t.horas)}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* Linha do tempo detalhada (cada passagem) */}
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
        Linha do tempo (cada passagem)
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ color: "var(--text-secondary)", textAlign: "left" }}>
            <th style={{ padding: "6px 8px", fontWeight: 500 }}>Etapa</th>
            <th style={{ padding: "6px 8px", fontWeight: 500 }}>Entrou</th>
            <th style={{ padding: "6px 8px", fontWeight: 500 }}>Saiu</th>
            <th style={{ padding: "6px 8px", fontWeight: 500 }}>Tempo</th>
          </tr>
        </thead>
        <tbody>
          {data.passagens.map((p, i) => (
            <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
              <td style={{ padding: "6px 8px", fontWeight: 500 }}>{p.coluna}</td>
              <td style={{ padding: "6px 8px", color: "var(--text-secondary)" }}>
                {fmtData(p.entrada)}
              </td>
              <td style={{ padding: "6px 8px", color: "var(--text-secondary)" }}>
                {p.saida ? fmtData(p.saida) : "ainda aqui"}
              </td>
              <td style={{ padding: "6px 8px" }}>{fmtHoras(p.horas)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
// Barras de custo (R$) por categoria, com o valor e a quantidade de casos no
// tooltip. Usado no gráfico de custo por desfecho.
// Barras de gasto por categoria, com total, quantidade e média no tooltip.
function BarrasGasto({ data, fill = "#c2410c" }) {
  if (!data || data.length === 0) return <Vazio />;
  const fmtMoeda = (v) => `R$ ${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
  const tip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: 6, padding: "8px 10px", fontSize: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div>Total: {fmtMoeda(d.total)}</div>
        <div style={{ color: "var(--text-secondary)" }}>
          {d.qtd} {d.qtd === 1 ? "lançamento" : "lançamentos"} · média {fmtMoeda(d.media)}
        </div>
      </div>
    );
  };
  return (
    <BarChart width={CHART_W} height={CHART_H} data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
      <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
      <Tooltip content={tip} />
      <Bar dataKey="total" fill={fill} radius={[4, 4, 0, 0]} />
    </BarChart>
  );
}

function BarrasCusto({ data, fill = "#e03e3e" }) {
  if (!data || data.length === 0) return <Vazio />;
  const fmtMoeda = (v) => `R$ ${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
  const tip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: 6, padding: "8px 10px", fontSize: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div>Prejuízo: {fmtMoeda(d.prejuizo)}</div>
        <div style={{ color: "var(--text-secondary)" }}>
          {d.qtd} {d.qtd === 1 ? "caso" : "casos"}
          {d.qtd > 0 && ` · média ${fmtMoeda(d.prejuizo / d.qtd)}`}
        </div>
      </div>
    );
  };
  return (
    <BarChart width={CHART_W} height={CHART_H} data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
      <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
      <Tooltip content={tip} />
      <Bar dataKey="prejuizo" fill={fill} radius={[4, 4, 0, 0]} />
    </BarChart>
  );
}

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
