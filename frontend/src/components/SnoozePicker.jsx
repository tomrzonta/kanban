import { useState } from "react";

// Seletor de "snooze": converte a escolha do usuário em HORAS (que é o que o
// backend guarda em retorno_horas). Três modos: atalhos rápidos, período
// customizado (n × unidade) e "até um dia da semana". Adiamentos por dia
// vencem às 9h (horário comercial).
const HORA_COMERCIAL = 9;

// Horas a partir de agora até as 9h de daqui a N dias (N=0 = hoje às 9h, ou
// amanhã se já passou das 9h).
function horasAteDiaComercial(diasFrente) {
  const agora = new Date();
  const alvo = new Date(agora);
  alvo.setDate(agora.getDate() + diasFrente);
  alvo.setHours(HORA_COMERCIAL, 0, 0, 0);
  if (alvo <= agora) alvo.setDate(alvo.getDate() + 1);
  return Math.max(1, Math.round((alvo - agora) / 3.6e6));
}

// Horas até o próximo dia-da-semana alvo (0=dom … 6=sáb), às 9h.
function horasAteProximoDiaSemana(diaAlvo) {
  const agora = new Date();
  let delta = (diaAlvo - agora.getDay() + 7) % 7;
  if (delta === 0) delta = 7; // "até segunda" sempre aponta para a próxima
  return horasAteDiaComercial(delta);
}

const DIAS_SEMANA = [
  ["Segunda", 1], ["Terça", 2], ["Quarta", 3], ["Quinta", 4],
  ["Sexta", 5], ["Sábado", 6], ["Domingo", 0],
];

const ATALHOS = [
  ["+4h", 4],
  ["+1 dia", () => horasAteDiaComercial(1)],
  ["+3 dias", () => horasAteDiaComercial(3)],
  ["+1 semana", () => horasAteDiaComercial(7)],
];

// Descreve em texto quando o prazo vai vencer, dado um total de horas.
function descreveVencimento(horas) {
  if (!horas) return "";
  const venc = new Date(Date.now() + horas * 3.6e6);
  return venc.toLocaleString("pt-BR", {
    weekday: "long", day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function SnoozePicker({ valor, onChange }) {
  const [num, setNum] = useState("");
  const [unidade, setUnidade] = useState("horas");

  const aplicar = (h) => onChange(h);

  function aplicarCustomizado(n, u) {
    const q = Number(n);
    if (!q || q < 1) return;
    const mult = { horas: 1, dias: 24, semanas: 168 }[u];
    onChange(Math.round(q * mult));
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {/* Atalhos rápidos */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {ATALHOS.map(([rotulo, valorOuFn]) => (
          <button type="button" key={rotulo}
                  onClick={() => aplicar(typeof valorOuFn === "function"
                                         ? valorOuFn() : valorOuFn)}
                  style={{ padding: "4px 12px" }}>{rotulo}</button>
        ))}
      </div>

      {/* Período customizado */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <input type="number" min="1" value={num}
               onChange={(e) => { setNum(e.target.value);
                                  aplicarCustomizado(e.target.value, unidade); }}
               placeholder="Qtd" style={{ width: 80 }} />
        <select value={unidade}
                onChange={(e) => { setUnidade(e.target.value);
                                   aplicarCustomizado(num, e.target.value); }}>
          <option value="horas">horas</option>
          <option value="dias">dias</option>
          <option value="semanas">semanas</option>
        </select>
        <span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>
          ou adiar até:
        </span>
        <select defaultValue=""
                onChange={(e) => e.target.value !== "" &&
                          aplicar(horasAteProximoDiaSemana(Number(e.target.value)))}>
          <option value="">dia da semana…</option>
          {DIAS_SEMANA.map(([nome, d]) => (
            <option key={d} value={d}>{nome}</option>
          ))}
        </select>
      </div>

      {/* Resumo do que foi escolhido */}
      {valor ? (
        <div style={{ fontSize: 12, color: "var(--accent)" }}>
          Retorno em <strong>{valor}h</strong> — vence {descreveVencimento(valor)}.
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          Nenhum prazo definido. Escolha um atalho ou período acima.
        </div>
      )}
    </div>
  );
}
