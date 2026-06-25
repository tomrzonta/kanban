// Lógica de SLA e de contato com cliente, centralizada para o card e o detalhe
// usarem a mesma fonte de verdade.
//
// NECESSIDADE DE CONTATO (precisa falar com o cliente) ocorre quando:
//   a) a flag manual requer_contato_cliente está ligada, OU
//   b) o ticket está numa coluna marcada como is_waiting_client.
//
// PRAZO do contato (precedência):
//   1) prazo individual do ticket (retorno_horas), contando de retorno_definido_em;
//   2) senão, o SLA da coluna (sla_hours), contando de last_moved_at (entrada na coluna);
//   3) se nenhum existir, há necessidade de contato mas sem cronômetro.
//
// Faixas de cor: >=100% estourado (vermelho), >=80% risco (amarelo), senão ok (verde).
// Coluna final (is_done) -> "done" (cinza).

export const SLA_COLORS = {
  ok: "#3ba55d",
  risco: "#f5a623",
  estourado: "#e03e3e",
  done: "#888780",
};

function faixa(ratio) {
  if (ratio >= 1) return "estourado";
  if (ratio >= 0.8) return "risco";
  return "ok";
}

// Resolve qual prazo vale para o ticket e devolve um objeto único e completo.
// Retorna { precisaContato, fonte, inicio, prazoHoras, vencimento, restante, atrasado }.
//   fonte: "ticket" (prazo próprio) | "coluna" (SLA da coluna) | "sem-prazo" | null
export function contatoInfo(ticket, column) {
  const porFlag = !!ticket?.requer_contato_cliente;
  const porColuna = !!column?.is_waiting_client;
  const precisaContato = porFlag || porColuna;

  if (!precisaContato) {
    return { precisaContato: false, fonte: null };
  }

  // 1) Prazo individual do ticket tem precedência.
  let inicio = null, prazoHoras = null, fonte = "sem-prazo";
  if (ticket?.retorno_horas && ticket?.retorno_definido_em) {
    inicio = new Date(ticket.retorno_definido_em).getTime();
    prazoHoras = ticket.retorno_horas;
    fonte = "ticket";
  } else if (porColuna && column?.sla_hours) {
    // 2) SLA da coluna, contando desde a entrada na coluna.
    inicio = new Date(ticket.last_moved_at).getTime();
    prazoHoras = column.sla_hours;
    fonte = "coluna";
  }

  if (prazoHoras == null) {
    // 3) Necessidade de contato sem cronômetro definido.
    return { precisaContato: true, fonte: "sem-prazo", vencimento: null,
             restante: null, atrasado: false };
  }

  const vencimentoMs = inicio + prazoHoras * 3.6e6;
  const restante = (vencimentoMs - Date.now()) / 3.6e6; // horas (negativo = atraso)
  return {
    precisaContato: true,
    fonte,
    prazoHoras,
    vencimento: new Date(vencimentoMs),
    restante,
    atrasado: restante < 0,
  };
}

export function slaStatus(ticket, column) {
  if (column?.is_done) return "done";

  // Se há necessidade de contato com prazo, a cor segue esse prazo.
  const c = contatoInfo(ticket, column);
  if (c.precisaContato && c.vencimento && c.prazoHoras) {
    const decorrido = (Date.now() - (c.vencimento.getTime() - c.prazoHoras * 3.6e6));
    return faixa(decorrido / 3.6e6 / c.prazoHoras);
  }

  // Senão, SLA comum da coluna sobre o tempo parado.
  if (!column?.sla_hours) return "ok";
  const horasParado = (Date.now() - new Date(ticket.last_moved_at)) / 3.6e6;
  return faixa(horasParado / column.sla_hours);
}

export const slaColor = (ticket, column) => SLA_COLORS[slaStatus(ticket, column)];

// Formata uma data de vencimento de forma curta: "20/06 14:30".
export function formatVencimento(vencimento) {
  if (!vencimento) return null;
  return vencimento.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

// --- Prazo de GARANTIA (30 dias desde a abertura) ---
// Conta dias corridos desde created_at. Faixas:
//   < 25 dias  -> normal (sem alerta)
//   25 a 29    -> atenção (amarelo, perto do prazo)
//   >= 30      -> crítico (vermelho, prazo de garantia estourado)
export const GARANTIA_DIAS = 30;
export const GARANTIA_ATENCAO = 25;

export const GARANTIA_COLORS = {
  normal: null,            // sem destaque
  atencao: "#f5a623",      // amarelo
  critico: "#e03e3e",      // vermelho
};

export function garantiaInfo(ticket) {
  if (!ticket?.created_at) return { dias: null, faixa: "normal" };
  const criado = new Date(ticket.created_at);
  const dias = Math.floor((Date.now() - criado) / 86400000); // ms por dia
  let faixa = "normal";
  if (dias >= GARANTIA_DIAS) faixa = "critico";
  else if (dias >= GARANTIA_ATENCAO) faixa = "atencao";
  return { dias, faixa, restante: GARANTIA_DIAS - dias };
}
