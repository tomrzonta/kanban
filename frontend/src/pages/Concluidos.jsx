import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import TicketDetail from "../components/TicketDetail";

// Aba de consulta de tickets concluídos: lista com filtros, exportável,
// clicável para abrir os detalhes. Inclui todos os concluídos (no banco).
const FILTROS_VAZIOS = {
  brand_id: "", defect_type_id: "", date_from: "", date_to: "",
};

export default function Concluidos({ isAdmin }) {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [selected, setSelected] = useState(null);
  const [columns, setColumns] = useState([]);

  const [brands, setBrands] = useState([]);
  const [defects, setDefects] = useState([]);

  useEffect(() => {
    api.listBrands().then(setBrands);
    api.listEntities("defect-types").then(setDefects);
    api.listColumns().then(setColumns);
  }, []);

  const carregar = useCallback(() => {
    setLoading(true);
    api.concluidos(filtros).then(setItens).finally(() => setLoading(false));
  }, [filtros]);

  useEffect(() => { carregar(); }, [carregar]);

  const set = (k) => (e) => setFiltros((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
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
        <div style={{ minWidth: 140 }}>
          <label>De</label>
          <input type="date" value={filtros.date_from} onChange={set("date_from")} />
        </div>
        <div style={{ minWidth: 140 }}>
          <label>Até</label>
          <input type="date" value={filtros.date_to} onChange={set("date_to")} />
        </div>
        <button onClick={() => setFiltros(FILTROS_VAZIOS)}>Limpar</button>
        <a href={api.analyticsExportUrl(filtros)} style={{ marginLeft: "auto" }}>
          <button className="primary">⬇ Exportar CSV</button>
        </a>
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

      {selected && (
        <TicketDetail ticket={selected} columns={columns} isAdmin={isAdmin}
                      onClose={() => setSelected(null)}
                      onMoved={() => { setSelected(null); carregar(); }} />)}
    </div>
  );
}
