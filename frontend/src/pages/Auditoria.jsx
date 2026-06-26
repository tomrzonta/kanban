import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";

// Aba de Auditoria (só admin): lista as ações registradas, com filtros por
// entidade e ação, e paginação.
const POR_PAGINA = 100;

// Rótulos amigáveis para os códigos de ação/entidade.
const ROTULO_ACAO = {
  criar: "Criação", editar: "Edição", excluir: "Exclusão",
  mover: "Movimentação", login: "Login",
};
const ROTULO_ENTIDADE = {
  ticket: "Ticket", usuario: "Usuário", catalogo: "Catálogo",
  desfecho: "Desfecho", recebimento: "Recebimento", sessao: "Sessão",
};

const corAcao = (a) => ({
  criar: "#1d7a4d", editar: "#946800", excluir: "#a32d2d",
  mover: "#185fa5", login: "#666",
}[a] || "#666");

export default function Auditoria() {
  const [itens, setItens] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(0);
  const [filtroEnt, setFiltroEnt] = useState("");
  const [filtroAcao, setFiltroAcao] = useState("");
  const [opcoes, setOpcoes] = useState({ entidades: [], acoes: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.opcoesAuditoria().then(setOpcoes).catch(() => {});
  }, []);

  const carregar = useCallback(() => {
    setLoading(true);
    api.listAuditoria({
      entidade: filtroEnt, acao: filtroAcao,
      limit: POR_PAGINA, offset: pagina * POR_PAGINA,
    }).then((r) => {
      setItens(r.itens);
      setTotal(r.total);
    }).finally(() => setLoading(false));
  }, [filtroEnt, filtroAcao, pagina]);

  useEffect(() => { carregar(); }, [carregar]);

  // Ao trocar de filtro, volta para a primeira página.
  useEffect(() => { setPagina(0); }, [filtroEnt, filtroAcao]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const fmt = (s) => s ? new Date(s).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div style={{ maxWidth: 920 }}>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}>
        Registro de ações no sistema — quem fez o quê e quando.
      </p>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap",
                    alignItems: "flex-end" }}>
        <div style={{ minWidth: 160 }}>
          <label>Entidade</label>
          <select value={filtroEnt} onChange={(e) => setFiltroEnt(e.target.value)}>
            <option value="">Todas</option>
            {opcoes.entidades.map((e) => (
              <option key={e} value={e}>{ROTULO_ENTIDADE[e] || e}</option>
            ))}
          </select>
        </div>
        <div style={{ minWidth: 160 }}>
          <label>Ação</label>
          <select value={filtroAcao} onChange={(e) => setFiltroAcao(e.target.value)}>
            <option value="">Todas</option>
            {opcoes.acoes.map((a) => (
              <option key={a} value={a}>{ROTULO_ACAO[a] || a}</option>
            ))}
          </select>
        </div>
        <div style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
          {total} {total === 1 ? "registro" : "registros"}
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
