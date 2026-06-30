import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";

// Aba de Auditoria (só admin): lista as ações registradas, com filtros por
// período, usuário, ação/entidade e busca por texto, com paginação ajustável.

// Rótulos amigáveis para os códigos de ação/entidade.
const ROTULO_ACAO = {
  criar: "Criação", editar: "Edição", excluir: "Exclusão",
  mover: "Movimentação", login: "Login",
};
const ROTULO_ENTIDADE = {
  ticket: "Ticket", usuario: "Usuário", catalogo: "Catálogo",
  desfecho: "Desfecho", recebimento: "Recebimento", sessao: "Sessão",
  kb: "Atendimento",
};

const corAcao = (a) => ({
  criar: "#1d7a4d", editar: "#946800", excluir: "#a32d2d",
  mover: "#185fa5", login: "#666",
}[a] || "#666");

const hojeISO = () => new Date().toISOString().slice(0, 10);
const diasAtrasISO = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export default function Auditoria() {
  const [itens, setItens] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(0);
  const [porPagina, setPorPagina] = useState(50);

  const [filtroEnt, setFiltroEnt] = useState("");
  const [filtroAcao, setFiltroAcao] = useState("");
  const [filtroAutor, setFiltroAutor] = useState("");
  const [busca, setBusca] = useState("");
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");

  const [opcoes, setOpcoes] = useState({ entidades: [], acoes: [], autores: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.opcoesAuditoria().then(setOpcoes).catch(() => {});
  }, []);

  const carregar = useCallback(() => {
    setLoading(true);
    api.listAuditoria({
      entidade: filtroEnt, acao: filtroAcao, autor: filtroAutor,
      q: busca, date_from: dataDe, date_to: dataAte,
      limit: porPagina, offset: pagina * porPagina,
    }).then((r) => {
      setItens(r.itens);
      setTotal(r.total);
    }).finally(() => setLoading(false));
  }, [filtroEnt, filtroAcao, filtroAutor, busca, dataDe, dataAte, porPagina, pagina]);

  // Debounce leve (a busca por texto digita caractere a caractere).
  useEffect(() => {
    const t = setTimeout(carregar, 250);
    return () => clearTimeout(t);
  }, [carregar]);

  // Ao mudar qualquer filtro, volta para a primeira página.
  useEffect(() => { setPagina(0); },
    [filtroEnt, filtroAcao, filtroAutor, busca, dataDe, dataAte, porPagina]);

  // Atalhos de período.
  function periodoRapido(dias) {
    if (dias === 0) { setDataDe(hojeISO()); setDataAte(hojeISO()); }
    else { setDataDe(diasAtrasISO(dias)); setDataAte(hojeISO()); }
  }
  function limparFiltros() {
    setFiltroEnt(""); setFiltroAcao(""); setFiltroAutor("");
    setBusca(""); setDataDe(""); setDataAte("");
  }

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const fmt = (s) => s ? new Date(s).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div style={{ maxWidth: 920 }}>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}>
        Registro de ações no sistema — quem fez o quê e quando.
      </p>

      {/* Filtros */}
      <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
        {/* Linha 1: busca por texto + atalhos de período */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap",
                      alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label>Buscar na descrição</label>
            <input value={busca} onChange={(e) => setBusca(e.target.value)}
                   placeholder="Ex: GAR-2026-0042, nome, etc." />
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => periodoRapido(0)}>Hoje</button>
            <button onClick={() => periodoRapido(7)}>7 dias</button>
            <button onClick={() => periodoRapido(30)}>30 dias</button>
          </div>
        </div>

        {/* Linha 2: período manual + entidade + ação + usuário */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap",
                      alignItems: "flex-end" }}>
          <div>
            <label>De</label>
            <input type="date" value={dataDe}
                   onChange={(e) => setDataDe(e.target.value)} />
          </div>
          <div>
            <label>Até</label>
            <input type="date" value={dataAte}
                   onChange={(e) => setDataAte(e.target.value)} />
          </div>
          <div style={{ minWidth: 140 }}>
            <label>Entidade</label>
            <select value={filtroEnt} onChange={(e) => setFiltroEnt(e.target.value)}>
              <option value="">Todas</option>
              {opcoes.entidades.map((e) => (
                <option key={e} value={e}>{ROTULO_ENTIDADE[e] || e}</option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: 140 }}>
            <label>Ação</label>
            <select value={filtroAcao} onChange={(e) => setFiltroAcao(e.target.value)}>
              <option value="">Todas</option>
              {opcoes.acoes.map((a) => (
                <option key={a} value={a}>{ROTULO_ACAO[a] || a}</option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: 140 }}>
            <label>Usuário</label>
            <select value={filtroAutor} onChange={(e) => setFiltroAutor(e.target.value)}>
              <option value="">Todos</option>
              {opcoes.autores.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <button onClick={limparFiltros}>Limpar</button>
        </div>

        {/* Linha 3: contagem + itens por página */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ color: "var(--text-tertiary)", fontSize: 13, flex: 1 }}>
            {total} {total === 1 ? "registro" : "registros"}
          </span>
          <label style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
            Por página:
          </label>
          <select value={porPagina} onChange={(e) => setPorPagina(Number(e.target.value))}
                  style={{ width: "auto" }}>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-tertiary)" }}>Carregando…</p>
      ) : itens.length === 0 ? (
        <p style={{ color: "var(--text-tertiary)" }}>Nenhum registro encontrado.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ color: "var(--text-secondary)", textAlign: "left" }}>
              <th style={{ padding: "8px 6px", fontWeight: 500 }}>Quando</th>
              <th style={{ padding: "8px 6px", fontWeight: 500 }}>Autor</th>
              <th style={{ padding: "8px 6px", fontWeight: 500 }}>Ação</th>
              <th style={{ padding: "8px 6px", fontWeight: 500 }}>Descrição</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((it) => (
              <tr key={it.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "8px 6px", color: "var(--text-secondary)",
                             whiteSpace: "nowrap" }}>
                  {fmt(it.criado_em)}
                </td>
                <td style={{ padding: "8px 6px" }}>{it.autor_nome || "—"}</td>
                <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 600,
                                 color: corAcao(it.acao) }}>
                    {ROTULO_ACAO[it.acao] || it.acao}
                  </span>
                  <span style={{ color: "var(--text-tertiary)", marginLeft: 4 }}>
                    · {ROTULO_ENTIDADE[it.entidade] || it.entidade}
                  </span>
                </td>
                <td style={{ padding: "8px 6px" }}>{it.descricao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center",
                      marginTop: 16, justifyContent: "center" }}>
          <button disabled={pagina === 0}
                  onClick={() => setPagina((p) => p - 1)}>← Anterior</button>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Página {pagina + 1} de {totalPaginas}
          </span>
          <button disabled={pagina >= totalPaginas - 1}
                  onClick={() => setPagina((p) => p + 1)}>Próxima →</button>
        </div>
      )}
    </div>
  );
}
