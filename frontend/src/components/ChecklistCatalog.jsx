import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import { useToast } from "./Toast";

// Gestão do checklist de recebimento: (1) lista de componentes disponíveis;
// (2) para cada modelo, quais componentes fazem parte do seu checklist.
export default function ChecklistCatalog() {
  const [componentes, setComponentes] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [novoComp, setNovoComp] = useState("");
  const toast = useToast();

  const carregarComp = useCallback(() => {
    api.listChecklistComponentes().then(setComponentes).catch(() => {});
  }, []);
  useEffect(() => { carregarComp(); }, [carregarComp]);
  useEffect(() => { api.listModels().then(setModelos).catch(() => {}); }, []);

  async function addComp() {
    if (!novoComp.trim()) return;
    try { await api.createChecklistComponente(novoComp.trim()); setNovoComp(""); carregarComp(); }
    catch (e) { toast.error(String(e.message || e)); }
  }
  async function delComp(c) {
    if (!confirm(`Excluir o componente "${c.name}"? Sai também dos checklists dos modelos.`)) return;
    try { await api.deleteChecklistComponente(c.id); carregarComp(); }
    catch (e) { toast.error(String(e.message || e)); }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}>
        Defina os componentes verificados no recebimento e monte o checklist de
        cada modelo. No recebimento, o checklist do modelo é obrigatório.
      </p>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* Componentes disponíveis */}
        <div style={{ flex: "1 1 280px" }}>
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>Componentes disponíveis</h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input value={novoComp} onChange={(e) => setNovoComp(e.target.value)}
                   placeholder="Ex: Fonte de alimentação" style={{ flex: 1 }}
                   onKeyDown={(e) => e.key === "Enter" && addComp()} />
            <button className="primary" onClick={addComp}>+ Add</button>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {componentes.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8,
                                       background: "var(--surface)", border: "1px solid var(--border)",
                                       borderRadius: "var(--radius)", padding: "6px 12px" }}>
                <span style={{ flex: 1 }}>{c.name}</span>
                <button onClick={() => delComp(c)}
                        style={{ padding: "2px 8px", color: "var(--red)" }}>🗑</button>
              </div>
            ))}
          </div>
        </div>

        {/* Checklist por modelo */}
        <div style={{ flex: "2 1 400px" }}>
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>Checklist por modelo</h3>
          {modelos.length === 0 ? (
            <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
              Nenhum modelo cadastrado. Cadastre em "Fabricante".
            </p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {modelos.map((m) => (
                <ChecklistModelo key={m.id} modelo={m} componentes={componentes} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Editor do checklist de um modelo: marca quais componentes fazem parte.
function ChecklistModelo({ modelo, componentes }) {
  const [aberto, setAberto] = useState(false);
  const [selecionados, setSelecionados] = useState(null); // set de ids
  const toast = useToast();

  const carregar = useCallback(() => {
    api.checklistDoModelo(modelo.id).then((rows) => {
      setSelecionados(new Set(rows.map((r) => r.componente_id)));
    }).catch(() => setSelecionados(new Set()));
  }, [modelo.id]);
  useEffect(() => { if (aberto && selecionados === null) carregar(); }, [aberto, selecionados, carregar]);

  function toggle(id) {
    setSelecionados((s) => {
      const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
    });
  }
  async function salvar() {
    try {
      await api.definirChecklistModelo(modelo.id, [...selecionados]);
      toast.success(`Checklist de ${modelo.name} salvo.`);
    } catch (e) { toast.error(String(e.message || e)); }
  }

  const qtd = selecionados ? selecionados.size : 0;
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                    cursor: "pointer" }} onClick={() => setAberto((v) => !v)}>
        <span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>{aberto ? "▾" : "▸"}</span>
        <span style={{ fontWeight: 600, flex: 1 }}>{modelo.name}</span>
        {aberto && selecionados !== null && (
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {qtd} {qtd === 1 ? "item" : "itens"}
          </span>
        )}
      </div>
      {aberto && selecionados !== null && (
        <div style={{ padding: "0 14px 14px 32px" }}>
          {componentes.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
              Cadastre componentes ao lado primeiro.
            </p>
          ) : (
            <>
              <div style={{ display: "grid", gap: 4, marginBottom: 10 }}>
                {componentes.map((c) => (
                  <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8,
                                             fontSize: 14, cursor: "pointer" }}>
                    <input type="checkbox" checked={selecionados.has(c.id)}
                           onChange={() => toggle(c.id)} />
                    {c.name}
                  </label>
                ))}
              </div>
              <button className="primary" onClick={salvar}>Salvar checklist</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
