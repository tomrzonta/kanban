import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import { useToast } from "./Toast";

// Gestão das peças canibalizáveis (a mesma lista usada no menu de canibalização
// das impressoras retidas). Só admin.
export default function PecasCanibalizaveisList() {
  const [itens, setItens] = useState([]);
  const [nome, setNome] = useState("");
  const toast = useToast();

  const carregar = useCallback(() => {
    api.listPecasPadrao().then(setItens).catch(() => {});
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  async function criar() {
    if (!nome.trim()) { toast.error("Informe o nome da peça."); return; }
    try { await api.createPecaPadrao(nome.trim()); setNome(""); carregar(); }
    catch (e) { toast.error(String(e.message || e)); }
  }
  async function excluir(p) {
    if (!confirm(`Excluir a peça "${p.name}"?`)) return;
    try { await api.deletePecaPadrao(p.id); carregar(); }
    catch (e) { toast.error(String(e.message || e)); }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}>
        Peças que aparecem no menu ao registrar uma canibalização de impressora
        retida. Você pode adicionar novas aqui ou direto no registro da peça.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input value={nome} onChange={(e) => setNome(e.target.value)}
               placeholder="Ex: Bico (nozzle)" style={{ flex: 1 }}
               onKeyDown={(e) => e.key === "Enter" && criar()} />
        <button className="primary" onClick={criar}>+ Adicionar</button>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {itens.map((p) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8,
                                   background: "var(--surface)", border: "1px solid var(--border)",
                                   borderRadius: "var(--radius)", padding: "8px 12px" }}>
            <span style={{ flex: 1 }}>{p.name}</span>
            <button onClick={() => excluir(p)}
                    style={{ padding: "2px 8px", color: "var(--red)" }}>🗑</button>
          </div>
        ))}
      </div>
    </div>
  );
}
