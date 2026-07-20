// Renderizador de Markdown leve, sem dependências. Cobre só o essencial pedido:
// # título, ## subtítulo, ### sub-subtítulo, **negrito**, *itálico*, e listas (-).
// O texto continua sendo puro por baixo (o grifo de mudanças opera sobre ele);
// aqui é só a EXIBIÇÃO que interpreta os símbolos.
//
// Uso:
//   <Markdown texto={s.resolucao} />
//   ou, com trechos grifados (diff), passe `segmentos` no lugar de `texto`.

// Aplica negrito/itálico inline a um pedaço de texto, devolvendo nós React.
function inline(texto, keyBase) {
  const nos = [];
  // Regex para **negrito** e *itálico* (negrito tem prioridade).
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let ultimo = 0, m, i = 0;
  while ((m = re.exec(texto)) !== null) {
    if (m.index > ultimo) nos.push(texto.slice(ultimo, m.index));
    if (m[2] !== undefined) {
      nos.push(<strong key={`${keyBase}-b${i}`}>{m[2]}</strong>);
    } else {
      nos.push(<em key={`${keyBase}-i${i}`}>{m[3]}</em>);
    }
    ultimo = m.index + m[0].length;
    i++;
  }
  if (ultimo < texto.length) nos.push(texto.slice(ultimo));
  return nos;
}

// Converte o texto em blocos (títulos, listas, parágrafos) e renderiza.
// `envolver` (opcional) permite embrulhar cada pedaço de texto — usado pelo
// grifo para marcar trechos novos.
function renderBlocos(texto, envolver) {
  const linhas = (texto || "").split("\n");
  const blocos = [];
  let listaAtual = null;

  const wrap = (conteudo, key) =>
    envolver ? envolver(conteudo, key) : conteudo;

  linhas.forEach((linha, idx) => {
    const key = `l${idx}`;
    // Item de lista: "- " ou "* " no começo.
    const itemLista = linha.match(/^\s*[-*]\s+(.*)$/);
    if (itemLista) {
      if (!listaAtual) { listaAtual = []; }
      listaAtual.push(
        <li key={key} style={{ marginBottom: 2 }}>
          {wrap(inline(itemLista[1], key), key)}
        </li>);
      return;
    }
    // Fecha lista aberta ao encontrar linha que não é item.
    if (listaAtual) {
      blocos.push(
        <ul key={`ul${idx}`} style={{ margin: "4px 0", paddingLeft: 22 }}>
          {listaAtual}
        </ul>);
      listaAtual = null;
    }
    // Títulos: ###, ##, #
    const h = linha.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const nivel = h[1].length;
      const estilos = {
        1: { fontSize: 19, fontWeight: 700, margin: "12px 0 4px" },
        2: { fontSize: 16, fontWeight: 700, margin: "10px 0 4px" },
        3: { fontSize: 14, fontWeight: 700, margin: "8px 0 2px",
             textTransform: "uppercase", letterSpacing: "0.03em",
             color: "var(--text-secondary)" },
      }[nivel];
      blocos.push(<div key={key} style={estilos}>{wrap(inline(h[2], key), key)}</div>);
      return;
    }
    // Linha em branco vira um respiro.
    if (linha.trim() === "") {
      blocos.push(<div key={key} style={{ height: 8 }} />);
      return;
    }
    // Parágrafo comum.
    blocos.push(<div key={key}>{wrap(inline(linha, key), key)}</div>);
  });

  if (listaAtual) {
    blocos.push(
      <ul key="ul-fim" style={{ margin: "4px 0", paddingLeft: 22 }}>{listaAtual}</ul>);
  }
  return blocos;
}

export default function Markdown({ texto }) {
  return <div>{renderBlocos(texto)}</div>;
}

// Versão que também aplica o grifo de trechos novos (diff). Recebe os segmentos
// [{texto, novo}] do backend, junta num texto único com marcadores e grifa.
// Para manter simples e robusto: se há segmentos novos, renderiza o texto com
// Markdown e grifa os trechos marcados como novos.
export function MarkdownComGrifo({ segmentos, grifoCor = "#fff3bf" }) {
  // Monta o texto completo e um conjunto de intervalos "novos" por posição.
  let full = "";
  const novos = []; // [inicio, fim)
  for (const s of segmentos) {
    const ini = full.length;
    full += s.texto;
    if (s.novo) novos.push([ini, full.length]);
  }
  // Função que, para um pedaço de texto (com posição global), grifa o que cai
  // dentro de um intervalo "novo".
  const estaNovo = (pos) => novos.some(([a, b]) => pos >= a && pos < b);

  // Envolve caractere-inteligente: como o inline já quebra em nós, aqui fazemos
  // uma abordagem por linha. Para simplicidade e robustez, grifamos por segmento
  // textual dentro de cada bloco, reconstruindo a posição.
  // Estratégia: renderiza cada segmento separadamente com Markdown inline,
  // grifando os novos. Preserva quebras de linha.
  return (
    <div>
      {renderComGrifo(full, novos, grifoCor)}
    </div>
  );
}

// Renderiza o texto completo em blocos Markdown, grifando os trechos cujas
// posições caem nos intervalos "novos".
function renderComGrifo(full, novos, grifoCor) {
  // Envolve um pedaço (com posição inicial conhecida) grifando as partes novas.
  const envolver = () => null; // não usado; grifo é feito abaixo por recorte
  // Para manter fiel ao diff, quebramos o texto em trechos alternados
  // normal/novo e renderizamos Markdown inline em cada um. Títulos e listas
  // são detectados por linha no texto completo.
  const linhas = full.split("\n");
  let pos = 0;
  const blocos = [];
  let lista = null;

  const grifaTrecho = (inicioLinha, textoLinha, key) => {
    // Divide a linha em pedaços normal/novo conforme os intervalos globais.
    const pedacos = [];
    let cursor = inicioLinha;
    const fimLinha = inicioLinha + textoLinha.length;
    // Ordena limites dentro desta linha.
    const limites = new Set([inicioLinha, fimLinha]);
    for (const [a, b] of novos) {
      if (b > inicioLinha && a < fimLinha) {
        limites.add(Math.max(a, inicioLinha));
        limites.add(Math.min(b, fimLinha));
      }
    }
    const ordenados = [...limites].sort((x, y) => x - y);
    for (let k = 0; k < ordenados.length - 1; k++) {
      const ini = ordenados[k], fim = ordenados[k + 1];
      const t = full.slice(ini, fim);
      const novo = novos.some(([a, b]) => ini >= a && ini < b);
      pedacos.push(
        novo
          ? <mark key={`${key}-m${k}`} style={{ background: grifoCor, color: "#3a2c00",
                                                borderRadius: 3, padding: "0 2px" }}>
              {inline(t, `${key}-m${k}`)}
            </mark>
          : <span key={`${key}-s${k}`}>{inline(t, `${key}-s${k}`)}</span>);
    }
    return pedacos;
  };

  linhas.forEach((linha, idx) => {
    const key = `g${idx}`;
    const inicioLinha = pos;
    pos += linha.length + 1; // +1 pela quebra de linha removida no split

    const itemLista = linha.match(/^\s*[-*]\s+(.*)$/);
    if (itemLista) {
      if (!lista) lista = [];
      // Ajusta o início para depois do "- ".
      const offset = linha.length - itemLista[1].length;
      lista.push(<li key={key} style={{ marginBottom: 2 }}>
        {grifaTrecho(inicioLinha + offset, itemLista[1], key)}
      </li>);
      return;
    }
    if (lista) {
      blocos.push(<ul key={`ul${idx}`} style={{ margin: "4px 0", paddingLeft: 22 }}>{lista}</ul>);
      lista = null;
    }
    const h = linha.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const nivel = h[1].length;
      const offset = linha.length - h[2].length;
      const estilos = {
        1: { fontSize: 19, fontWeight: 700, margin: "12px 0 4px" },
        2: { fontSize: 16, fontWeight: 700, margin: "10px 0 4px" },
        3: { fontSize: 14, fontWeight: 700, margin: "8px 0 2px",
             textTransform: "uppercase", letterSpacing: "0.03em",
             color: "var(--text-secondary)" },
      }[nivel];
      blocos.push(<div key={key} style={estilos}>{grifaTrecho(inicioLinha + offset, h[2], key)}</div>);
      return;
    }
    if (linha.trim() === "") {
      blocos.push(<div key={key} style={{ height: 8 }} />);
      return;
    }
    blocos.push(<div key={key}>{grifaTrecho(inicioLinha, linha, key)}</div>);
  });

  if (lista) blocos.push(<ul key="ul-fim" style={{ margin: "4px 0", paddingLeft: 22 }}>{lista}</ul>);
  return blocos;
}

// Legenda curta de ajuda do Markdown, para colocar sob os campos de texto.
export function AjudaMarkdown() {
  const code = {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 12.5, background: "var(--bg)", color: "var(--text)",
    border: "1px solid var(--border)", borderRadius: 4, padding: "1px 6px",
  };
  return (
    <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8,
                  lineHeight: 1.9 }}>
      <span style={{ fontWeight: 600 }}>Formatação:</span>{" "}
      <code style={code}># Título</code>{"  "}
      <code style={code}>## Subtítulo</code>{"  "}
      <code style={code}>**negrito**</code>{"  "}
      <code style={code}>*itálico*</code>{"  "}
      <code style={code}>- item de lista</code>
    </div>
  );
}
