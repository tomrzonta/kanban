import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import { useToast } from "./Toast";

// Gestão das categorias de gasto (Frete reverso, Reenvio, Peça...). Usadas ao
// lançar gastos nos tickets. Só admin.
export default function CategoriaGastoList() {
  const [itens, setItens] = useState([]);
  const [nome, setNome] = useState("");
  const [editId, setEditId] = useState(null);
  const [editNome, setEditNome] = useState("");
  const toast = useToast();

  const carregar = useCallback(() => {
    api.listCategoriasGasto().then(setItens).catch(() => {});
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  async function criar() {
    if (!nome.trim()) { toast.error("Informe o nome da categoria."); return; }
    try { await api.createCategoriaGasto({ name: nome.trim(), active: 1 });
      setNome(""); carregar(); }
    catch (e) { toast.error(String(e.message || e)); }
  }
  async function salvarEdicao(c) {
    try { await api.updateCategoriaGasto(c.id, { name: editNome.trim(), active: c.active });
      setEditId(null); carregar(); }
    catch (e) { toast.error(String(e.message || e)); }
  }
  async function excluir(c) {
    if (!confirm(`Excluir a categoria "${c.name}"?`)) return;
    try { await api.deleteCategoriaGasto(c.id); carregar(); }
    catch (e) { toast.error(String(e.message || e)); }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}>
        Categorias usadas ao lançar gastos nos tickets (frete reverso, reenvio, peça…).
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input value={nome} onChange={(e) => setNome(e.target.value)}
               placeholder="Ex: Frete reverso" style={{ flex: 1 }}
               onKeyDown={(e) => e.key === "Enter" && criar()} />
        <button className="primary" onClick={criar}>+ Adicionar</button>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {itens.map((c) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8,
                                   background: "var(--surface)", border: "1px solid var(--border)",
                                   borderRadius: "var(--radius)", padding: "8px 12px" }}>
            {editId === c.id ? (
              <>
                <input value={editNome} onChange={(e) => setEditNome(e.target.value)}
                       style={{ flex: 1, minWidth: 120 }} autoFocus />
                <button onClick={() => salvarEdicao(c)}>OK</button>
                <button onClick={() => setEditId(null)}>Cancelar</button>
              </>
            ) : (
              <>
                <span style={{ flex: 1 }}>{c.name}</span>
                <button onClick={() => { setEditId(c.id); setEditNome(c.name); }}
                        style={{ padding: "2px 8px" }}>✎</button>
                <button onClick={() => excluir(c)}
                        style={{ padding: "2px 8px", color: "var(--red)" }}>🗑</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
