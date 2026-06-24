import { useState, useEffect } from "react";
import { api } from "../api/client";

// Lista CRUD reutilizável para entidades simples (distribuidora, fornecedor,
// tipo de defeito). `kind` é o path da API; `label` é o nome exibido.
export default function SimpleEntityList({ kind, label }) {
  const [items, setItems] = useState([]);
  const [novo, setNovo] = useState("");

  const carregar = () => api.listEntities(kind).then(setItems);
  useEffect(() => { carregar(); }, [kind]);

  async function add() {
    if (!novo.trim()) return;
    await api.createEntity(kind, novo.trim());
    setNovo("");
    carregar();
  }

  async function excluir(item) {
    if (!confirm(`Excluir "${item.name}"?`)) return;
    const r = await api.deleteEntity(kind, item.id);
    if (r && r.soft_deleted) alert(r.msg);
    carregar();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, maxWidth: 400 }}>
        <input placeholder={`Novo(a) ${label.toLowerCase()}`} value={novo}
               onChange={(e) => setNovo(e.target.value)}
               onKeyDown={(e) => e.key === "Enter" && add()} />
        <button className="primary" onClick={add}
                style={{ whiteSpace: "nowrap" }}>+ Adicionar</button>
      </div>

      <div style={{ display: "grid", gap: 8, maxWidth: 500 }}>
        {items.map((it) => (
          <Row key={it.id} item={it} kind={kind} onChange={carregar}
               onDelete={() => excluir(it)} />
        ))}
        {items.length === 0 && (
          <p style={{ color: "var(--text-tertiary)" }}>Nada cadastrado ainda.</p>
        )}
      </div>
    </div>
  );
}

function Row({ item, kind, onChange, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(item.name);

  async function salvar() {
    if (!nome.trim()) return;
    await api.updateEntity(kind, item.id, nome.trim());
    setEditing(false);
    onChange();
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8,
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius)", padding: "8px 12px" }}>
      {editing ? (
        <>
          <input value={nome} onChange={(e) => setNome(e.target.value)}
                 style={{ flex: 1 }} />
          <button onClick={salvar}>OK</button>
          <button onClick={() => { setEditing(false); setNome(item.name); }}>
            Cancelar
          </button>
        </>
      ) : (
        <>
          <span style={{ flex: 1 }}>{item.name}</span>
          <button onClick={() => setEditing(true)} title="Editar"
                  style={{ padding: "2px 8px" }}>✎</button>
          <button onClick={onDelete} title="Excluir"
                  style={{ padding: "2px 8px", color: "var(--red)" }}>🗑</button>
        </>
      )}
    </div>
  );
}
