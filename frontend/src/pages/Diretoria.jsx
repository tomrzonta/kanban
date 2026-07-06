import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { api } from "../api/client";

// Visão executiva (Diretoria): poucos números grandes, foco em dinheiro e
// tempo, com tendência. Consome o mesmo /comparativo do dashboard operacional.
export default function Diretoria() {
  const [comp, setComp] = useState(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    api.comparativo().then(setComp).catch(() => setErro(true));
  }, []);

  if (erro) return <p style={{ color: "var(--red)" }}>Não foi possível carregar os números.</p>;
  if (!comp) return <p style={{ color: "var(--text-tertiary)" }}>Carregando…</p>;

  const { kpis, serie } = comp;
  const fmtMoeda = (v) => `R$ ${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
  const fmtHoras = (h) => h < 24 ? `${h.toFixed(0)} h`
    : `${Math.floor(h / 24)}d ${Math.round(h % 24)}h`;
  const fmtMes = (m) => {
    const [a, mes] = m.split("-");
    return `${["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"][+mes-1]}/${a.slice(2)}`;
  };

  return (
    <div style={{ maxWidth: 1100 }}>
      <h2 style={{ fontSize: 20, margin: "0 0 4px" }}>Visão executiva</h2>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: "0 0 20px" }}>
        Resumo do mês atual em relação ao anterior. Foco em gasto, economia e tempo.
      </p>

      {/* Três grandes números. */}
      <div style={{ display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: 16, marginBottom: 24 }}>
        <BigCard titulo="Prejuízo no mês" valor={fmtMoeda(kpis.prejuizo.atual)}
                 anterior={fmtMoeda(kpis.prejuizo.anterior)}
                 variacao={kpis.prejuizo.variacao_pct} melhorMenor
                 legenda="Perda efetiva dos casos concluídos" />
        <BigCard titulo="Economia gerada" valor={fmtMoeda(kpis.economia.atual)}
                 anterior={fmtMoeda(kpis.economia.anterior)}
                 variacao={kpis.economia.variacao_pct} melhorMenor={false}
                 destaque
                 legenda="Valor que deixou de ser perdido pelo atendimento" />
        <BigCard titulo="Tempo médio de resolução"
                 valor={fmtHoras(kpis.tempo_medio_horas.atual)}
                 anterior={fmtHoras(kpis.tempo_medio_horas.anterior)}
                 variacao={kpis.tempo_medio_horas.variacao_pct} melhorMenor
                 legenda="Da abertura até a conclusão" />
      </div>

      {/* Tendência: prejuízo e economia por mês. */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)", padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
          Prejuízo por mês (últimos meses)
        </div>
        <LineChart width={720} height={260} data={serie}
                   margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="mes" tickFormatter={fmtMes} fontSize={12} />
          <YAxis fontSize={12} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
          <Tooltip labelFormatter={fmtMes} formatter={(v) => fmtMoeda(v)} />
          <Line type="monotone" dataKey="prejuizo" stroke="#e03e3e"
                strokeWidth={2.5} name="Prejuízo" dot={{ r: 3 }} />
        </LineChart>
      </div>
    </div>
  );
}

// Cartão grande de KPI executivo, com variação colorida vs. mês anterior.
function BigCard({ titulo, valor, anterior, variacao, melhorMenor, legenda, destaque }) {
  let cor = "var(--text-tertiary)", seta = "→";
  if (variacao != null && variacao !== 0) {
    const subiu = variacao > 0;
    seta = subiu ? "▲" : "▼";
    const bom = melhorMenor ? !subiu : subiu;
    cor = bom ? "#1d7a4d" : "#c2410c";
  }
  return (
    <div style={{ background: destaque ? "var(--accent-soft)" : "var(--surface)",
                  border: `1px solid ${destaque ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: "var(--radius-lg)", padding: "18px 20px" }}>
      <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{titulo}</div>
      <div style={{ fontSize: 32, fontWeight: 700, margin: "6px 0",
                    color: destaque ? "var(--accent)" : "var(--text)" }}>
        {valor}
      </div>
      <div style={{ fontSize: 13, color: cor, fontWeight: 600 }}>
        {seta} {variacao == null ? "—" : `${Math.abs(variacao)}%`}
        <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>
          {" "}vs. {anterior} no mês anterior
        </span>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 8 }}>
        {legenda}
      </div>
    </div>
  );
}
