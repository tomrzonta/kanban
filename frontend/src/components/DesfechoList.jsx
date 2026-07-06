import { useState, useEffect } from "react";
import { api } from "../api/client";

// Gestão de desfechos: cada um tem nome + impacto no prejuízo.
const IMPACTOS = [
  { v: "sem_prejuizo", label: "Sem prejuízo (conta R$ 0)" },
  { v: "parcial", label: "Prejuízo parcial (valor informado no ticket)" },
  { v: "total", label: "Prejuízo total (valor cheio)" },
  { v: "informativo", label: "Informativo (sem valor financeiro — ex: 2ª via de NF)" },
];

const rotuloImpacto = (v) => IMPACTOS.find((i) => i.v === v)?.label || v;

export default function DesfechoList() {
  const [items, setItems] = useState([]);
  const [nome, setNome] = useState("");
  const [impacto, setImpacto] = useState("sem_prejuizo");

  const carregar = () => api.listDesfechos().then(setItems);
  useEffect(() => { carregar(); }, []);

  async function add() {
    if (!nome.trim()) return;
    await api.createDesfecho({ name: nome.trim(), impacto });
    setNome(""); setImpacto("sem_prejuizo");
    carregar();
  }

  async function excluir(item) {
    if (!confirm(`Excluir "${item.name}"?`)) return;
    const r = await api.deleteDesfecho(item.id);
    if (r && r.soft_deleted) alert(r.msg);
    carregar();
  }

  return (
    <div>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}>
        Cada desfecho define como o prejuízo é contado nas análises. Assim um
        ticket resolvido não vira prejuízo indevido nos relatórios.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap",
                    alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label>Nome do desfecho</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)}
                 placeholder="Ex: Reparado, Trocado…" />
        </div>
        <div style={{ minWidth: 220 }}>
          <label>Impacto no prejuízo</label>
          <select value={impacto} onChange={(e) => setImpacto(e.target.value)}>
            {IMPACTOS.map((i) => <option key={i.v} value={i.v}>{i.label}</option>)}
          </select>
        </div>
        <button className="primary" onClick={add}
                style={{ whiteSpace: "nowrap" }}>+ Adicionar</button>
      </div>

      <div style={{ display: "grid", gap: 8, maxWidth: 600 }}>
        {items.map((it) => (
          <Row key={it.id} item={it} onChange={carregar}
               onDelete={() => excluir(it)} />
        ))}
        {items.length === 0 && (
          <p style={{ color: "var(--text-tertiary)" }}>Nenhum desfecho cadastrado.</p>
        )}
      </div>
    </div>
  );
}

function Row({ item, onChange, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(item.name);
  const [impacto, setImpacto] = useState(item.impacto);

  async function salvar() {
    if (!nome.trim()) return;
    await api.updateDesfecho(item.id, { name: nome.trim(), impacto });
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
                 autoFocus placeholder="Nome do desfecho"
                 style={{ flex: 1, minWidth: 160 }} />
          <select value={impacto} onChange={(e) => setImpacto(e.target.value)}
                  style={{ flex: "0 1 200px", minWidth: 0 }}>
            {IMPACTOS.map((i) => <option key={i.v} value={i.v}>{i.label}</option>)}
          </select>
          <button onClick={salvar}>OK</button>
          <button onClick={() => { setEditing(false); setNome(item.name); setImpacto(item.impacto); }}>
            Cancelar
          </button>
        </>
      ) : (
        <>
          <span style={{ flex: 1, fontWeight: 500 }}>{item.name}</span>
          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            {rotuloImpacto(item.impacto)}
          </span>
          <button onClick={() => setEditing(true)} title="Editar"
                  style={{ padding: "2px 8px" }}>✎</button>
          <button onClick={onDelete} title="Excluir"
                  style={{ padding: "2px 8px", color: "var(--red)" }}>🗑</button>
        </>
      )}
    </div>
  );
}
