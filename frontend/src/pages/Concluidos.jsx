import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import TicketDetail from "../components/TicketDetail";

// Aba de consulta de tickets concluídos: lista com filtros, exportável,
// clicável para abrir os detalhes. Inclui todos os concluídos (no banco).
const FILTROS_VAZIOS = {
  brand_id: "", defect_type_id: "", date_from: "", date_to: "",
  desfecho_id: "", so_com_custo: false,
};

export default function Concluidos({ isAdmin }) {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [selected, setSelected] = useState(null);
  const [columns, setColumns] = useState([]);
  const toast = useToast();
  const [baixando, setBaixando] = useState(false);
  const [subaba, setSubaba] = useState("todos"); // "todos" | "recebimento"
  const [recebidos, setRecebidos] = useState([]);
  const [loadingRec, setLoadingRec] = useState(false);

  // Carrega os recebimentos de tickets já concluídos (sub-aba de recebimento).
  useEffect(() => {
    if (subaba !== "recebimento") return;
    setLoadingRec(true);
    api.listRecebimentos({ apenasConcluidos: true })
      .then(setRecebidos).finally(() => setLoadingRec(false));
  }, [subaba]);

  async function baixarCsv() {
    setBaixando(true);
    try { await api.baixarExportFiltrado(filtros); }
    catch (e) { toast.error(String(e.message || "Falha ao baixar o CSV.")); }
    finally { setBaixando(false); }
  }

  const [brands, setBrands] = useState([]);
  const [defects, setDefects] = useState([]);
  const [desfechos, setDesfechos] = useState([]);

  useEffect(() => {
    api.listBrands().then(setBrands);
    api.listEntities("defect-types").then(setDefects);
    api.listColumns().then(setColumns);
    api.listDesfechos().then(setDesfechos).catch(() => setDesfechos([]));
  }, []);

  // Valor combinado do dropdown único de desfecho:
  //  ""      -> todos
  //  "custo" -> só com custo (parcial/total)
  //  "<id>"  -> um desfecho específico
  const valorDesfecho = filtros.so_com_custo ? "custo"
    : (filtros.desfecho_id || "");
  function setDesfechoFiltro(v) {
    if (v === "custo") setFiltros((f) => ({ ...f, desfecho_id: "", so_com_custo: true }));
    else setFiltros((f) => ({ ...f, desfecho_id: v, so_com_custo: false }));
  }

  const carregar = useCallback(() => {
    setLoading(true);
    api.concluidos(filtros).then(setItens).finally(() => setLoading(false));
  }, [filtros]);

  useEffect(() => { carregar(); }, [carregar]);

  const set = (k) => (e) => setFiltros((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      {/* Sub-abas: todos os concluídos vs. os que passaram por recebimento. */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16,
                    borderBottom: "1px solid var(--border)" }}>
        {[["todos", "Todos"], ["recebimento", "Passaram por recebimento"]].map(([id, label]) => (
          <button key={id} onClick={() => setSubaba(id)}
                  style={{ padding: "8px 16px", border: "none", background: "none",
                           cursor: "pointer",
                           borderBottom: subaba === id ? "2px solid var(--accent)" : "2px solid transparent",
                           color: subaba === id ? "var(--accent)" : "var(--text-secondary)",
                           fontWeight: subaba === id ? 600 : 400 }}>
            {label}
          </button>
        ))}
      </div>

      {subaba === "recebimento" ? (
        <RecebimentosConcluidos itens={recebidos} loading={loadingRec}
                                columns={columns} isAdmin={isAdmin}
                                onAtualizar={() => api.listRecebimentos({ apenasConcluidos: true }).then(setRecebidos)} />
      ) : (
      <>
      {/* Filtros */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)", padding: 16, marginBottom: 20,
                    display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ minWidth: 150 }}>
          <label>Fabricante</label>
          <select value={filtros.brand_id} onChange={set("brand_id")}>
            <option value="">Todos</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div style={{ minWidth: 150 }}>
          <label>Tipo de defeito</label>
          <select value={filtros.defect_type_id} onChange={set("defect_type_id")}>
            <option value="">Todos</option>
            {defects.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div style={{ minWidth: 170 }}>
          <label>Desfecho</label>
          <select value={valorDesfecho}
                  onChange={(e) => setDesfechoFiltro(e.target.value)}>
            <option value="">Todos</option>
            <option value="custo">— Todos com custo —</option>
            {desfechos.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div style={{ minWidth: 140 }}>
          <label>De</label>
          <input type="date" value={filtros.date_from} onChange={set("date_from")} />
        </div>
        <div style={{ minWidth: 140 }}>
          <label>Até</label>
          <input type="date" value={filtros.date_to} onChange={set("date_to")} />
        </div>
        <button onClick={() => setFiltros(FILTROS_VAZIOS)}>Limpar</button>
        <button className="primary" onClick={baixarCsv} disabled={baixando}
                style={{ marginLeft: "auto" }}>
          ⬇ Exportar CSV
        </button>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-tertiary)" }}>Carregando…</p>
      ) : itens.length === 0 ? (
        <p style={{ color: "var(--text-tertiary)" }}>Nenhum ticket concluído neste filtro.</p>
      ) : (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: "var(--text-secondary)", textAlign: "left",
                           background: "var(--bg)" }}>
                <th style={{ padding: "10px 12px", fontWeight: 500 }}>Título</th>
                <th style={{ padding: "10px 12px", fontWeight: 500 }}>Fabricante / Modelo</th>
                <th style={{ padding: "10px 12px", fontWeight: 500 }}>Defeito</th>
                <th style={{ padding: "10px 12px", fontWeight: 500, textAlign: "right" }}>Prejuízo</th>
                <th style={{ padding: "10px 12px", fontWeight: 500 }}>Concluído em</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((t) => (
                <tr key={t.id} onClick={() => setSelected(t)}
                    style={{ borderTop: "1px solid var(--border)", cursor: "pointer" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "10px 12px", fontWeight: 500 }}>{t.titulo}</td>
                  <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>
                    {t.fabricante} · {t.modelo}
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>
                    {t.defeito_nome || "—"}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    R$ {Number(t.prejuizo).toFixed(2)}
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>
                    {new Date(t.last_moved_at).toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </>
      )}

      {selected && (
        <TicketDetail ticket={selected} columns={columns} isAdmin={isAdmin}
                      onClose={() => setSelected(null)}
                      onMoved={() => { setSelected(null); carregar(); }} />)}
    </div>
  );
}

// Sub-aba: tickets que passaram por recebimento e já foram concluídos. Mostra
// os dados do recebimento (data, condição, NF) além do ticket. Clicável.
function RecebimentosConcluidos({ itens, loading, columns, isAdmin, onAtualizar }) {
  const [selected, setSelected] = useState(null);
  if (loading) return <p style={{ color: "var(--text-tertiary)" }}>Carregando…</p>;
  if (itens.length === 0)
    return <p style={{ color: "var(--text-tertiary)" }}>
      Nenhum recebimento de ticket concluído ainda.
    </p>;
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ color: "var(--text-secondary)", textAlign: "left",
                       background: "var(--bg)" }}>
            <th style={{ padding: "10px 12px", fontWeight: 500 }}>Recebido em</th>
            <th style={{ padding: "10px 12px", fontWeight: 500 }}>Ticket</th>
            <th style={{ padding: "10px 12px", fontWeight: 500 }}>Fabricante / Modelo</th>
            <th style={{ padding: "10px 12px", fontWeight: 500 }}>Condição</th>
            <th style={{ padding: "10px 12px", fontWeight: 500 }}>NF</th>
            <th style={{ padding: "10px 12px", fontWeight: 500 }}>Desfecho</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((r) => (
            <tr key={r.id}
                onClick={() => setSelected({ ...r, id: r.ticket_id })}
                style={{ borderTop: "1px solid var(--border)", cursor: "pointer" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              <td style={{ padding: "10px 12px" }}>
                {r.data_recebimento ? new Date(r.data_recebimento).toLocaleDateString("pt-BR") : "—"}
              </td>
              <td style={{ padding: "10px 12px", fontWeight: 500 }}>
                {r.codigo_interno || r.titulo}
              </td>
              <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>
                {r.fabricante} · {r.modelo}
              </td>
              <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>
                {r.condicao || "—"}
              </td>
              <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>
                {r.numero_nf || "—"}
              </td>
              <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>
                {r.desfecho_nome || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {selected && (
        <TicketDetail ticket={selected} columns={columns} isAdmin={isAdmin}
                      onClose={() => setSelected(null)}
                      onMoved={() => { setSelected(null); onAtualizar(); }} />)}
    </div>
  );
}
