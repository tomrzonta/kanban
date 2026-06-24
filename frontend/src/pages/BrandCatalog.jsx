import { useState, useEffect } from "react";
import { api } from "../api/client";

// Catálogo com manutenção completa: criar/renomear/excluir marcas e
// criar/editar preço/renomear/excluir modelos.
export default function BrandCatalog() {
  const [brands, setBrands] = useState([]);
  const [modelsByBrand, setModelsByBrand] = useState({});
  const [novaMarca, setNovaMarca] = useState("");

  async function carregar() {
    const bs = await api.listBrands();
    setBrands(bs);
    const entries = await Promise.all(
      bs.map(async (b) => [b.id, await api.listModels(b.id)])
    );
    setModelsByBrand(Object.fromEntries(entries));
  }

  useEffect(() => { carregar(); }, []);

  async function addMarca() {
    if (!novaMarca.trim()) return;
    await api.createBrand({ name: novaMarca.trim() });
    setNovaMarca("");
    carregar();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, maxWidth: 400 }}>
        <input placeholder="Nome do novo fabricante" value={novaMarca}
               onChange={(e) => setNovaMarca(e.target.value)}
               onKeyDown={(e) => e.key === "Enter" && addMarca()} />
        <button className="primary" onClick={addMarca}
                style={{ whiteSpace: "nowrap" }}>+ Fabricante</button>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {brands.map((b) => (
          <BrandCard key={b.id} brand={b}
                     models={modelsByBrand[b.id] || []}
                     onChange={carregar} />
        ))}
        {brands.length === 0 && (
          <p style={{ color: "var(--text-tertiary)" }}>
            Nenhum fabricante cadastrado ainda.
          </p>
        )}
      </div>
    </div>
  );
}

function BrandCard({ brand, models, onChange }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editName, setEditName] = useState(false);
  const [nome, setNome] = useState(brand.name);
  const [novo, setNovo] = useState({ name: "", sku: "", current_price: "" });

  async function renomearMarca() {
    if (!nome.trim()) return;
    await api.updateBrand(brand.id, { name: nome.trim() });
    setEditName(false);
    onChange();
  }

  async function excluirMarca() {
    if (!confirm(`Excluir o fabricante "${brand.name}"?`)) return;
    try {
      await api.deleteBrand(brand.id);
      onChange();
    } catch (e) {
      // O backend bloqueia se houver modelos ativos.
      alert(String(e.message || e).replace(/^API \d+:\s*/, ""));
    }
  }

  async function addModelo() {
    if (!novo.name || !novo.current_price) return;
    await api.createModel({
      brand_id: brand.id,
      name: novo.name,
      sku: novo.sku || null,
      current_price: Number(novo.current_price),
    });
    setNovo({ name: "", sku: "", current_price: "" });
    setShowAdd(false);
    onChange();
  }

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)", padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "center", marginBottom: 12 }}>
        {editName ? (
          <span style={{ display: "inline-flex", gap: 6 }}>
            <input value={nome} onChange={(e) => setNome(e.target.value)}
                   style={{ width: 200 }} />
            <button onClick={renomearMarca}>OK</button>
            <button onClick={() => { setEditName(false); setNome(brand.name); }}>
              Cancelar
            </button>
          </span>
        ) : (
          <h3 style={{ fontSize: 15 }}>{brand.name}</h3>
        )}
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setShowAdd((s) => !s)}>+ Modelo</button>
          <button onClick={() => setEditName(true)} title="Renomear">✎</button>
          <button onClick={excluirMarca} title="Excluir"
                  style={{ color: "var(--red)" }}>🗑</button>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ color: "var(--text-secondary)", textAlign: "left" }}>
            <th style={{ padding: "6px 4px", fontWeight: 500 }}>Modelo</th>
            <th style={{ padding: "6px 4px", fontWeight: 500 }}>SKU</th>
            <th style={{ padding: "6px 4px", fontWeight: 500, textAlign: "right" }}>
              Preço atual
            </th>
            <th style={{ width: 80 }}></th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <ModelRow key={m.id} model={m} onChange={onChange} />
          ))}
          {models.length === 0 && (
            <tr><td colSpan={4} style={{ padding: 8, color: "var(--text-tertiary)" }}>
              Nenhum modelo cadastrado.
            </td></tr>
          )}
        </tbody>
      </table>

      {showAdd && (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input placeholder="Modelo" value={novo.name}
                 onChange={(e) => setNovo({ ...novo, name: e.target.value })} />
          <input placeholder="SKU" value={novo.sku}
                 onChange={(e) => setNovo({ ...novo, sku: e.target.value })} />
          <input placeholder="Preço" type="number" value={novo.current_price}
                 onChange={(e) => setNovo({ ...novo, current_price: e.target.value })} />
          <button className="primary" onClick={addModelo}
                  style={{ whiteSpace: "nowrap" }}>Salvar</button>
        </div>
      )}
    </div>
  );
}

function ModelRow({ model, onChange }) {
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(model.name);
  const [price, setPrice] = useState(model.current_price);

  async function salvar() {
    await api.updateModel(model.id, {
      name: nome,
      current_price: Number(price),
    });
    setEditing(false);
    onChange();
  }

  async function excluir() {
    if (!confirm(`Excluir o modelo "${model.name}"?`)) return;
    const r = await api.deleteModel(model.id);
    // Se houver tickets, o backend inativa em vez de excluir e avisa.
    if (r && r.soft_deleted) alert(r.msg);
    onChange();
  }

  if (editing) {
    return (
      <tr style={{ borderTop: "1px solid var(--border)" }}>
        <td style={{ padding: "8px 4px" }}>
          <input value={nome} onChange={(e) => setNome(e.target.value)} />
        </td>
        <td style={{ padding: "8px 4px", color: "var(--text-secondary)" }}>
          {model.sku || "—"}
        </td>
        <td style={{ padding: "8px 4px", textAlign: "right" }}>
          <input type="number" value={price} style={{ width: 90 }}
                 onChange={(e) => setPrice(e.target.value)} />
        </td>
        <td style={{ textAlign: "right" }}>
          <button onClick={salvar}>OK</button>
        </td>
      </tr>
    );
  }

  return (
    <tr style={{ borderTop: "1px solid var(--border)" }}>
      <td style={{ padding: "8px 4px" }}>{model.name}</td>
      <td style={{ padding: "8px 4px", color: "var(--text-secondary)" }}>
        {model.sku || "—"}
      </td>
      <td style={{ padding: "8px 4px", textAlign: "right" }}>
        R$ {Number(model.current_price).toFixed(2)}
      </td>
      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
        <button onClick={() => setEditing(true)} title="Editar"
                style={{ padding: "2px 8px" }}>✎</button>
        <button onClick={excluir} title="Excluir"
                style={{ padding: "2px 8px", color: "var(--red)" }}>🗑</button>
      </td>
    </tr>
  );
}
