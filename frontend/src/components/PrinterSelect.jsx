import { useState, useEffect } from "react";
import { api } from "../api/client";

// Seleção em cascata: escolher a marca filtra os modelos disponíveis.
// onSelect(modelId) é chamado quando o usuário escolhe um modelo.
export default function PrinterSelect({ onSelect }) {
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");

  useEffect(() => {
    api.listBrands().then(setBrands);
  }, []);

  useEffect(() => {
    if (!brandId) {
      setModels([]);
      return;
    }
    api.listModels(brandId).then(setModels);
    setModelId("");
  }, [brandId]);

  const selected = models.find((m) => m.id === Number(modelId));

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
        <option value="">Marca…</option>
        {brands.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>

      <select
        value={modelId}
        disabled={!brandId}
        onChange={(e) => {
          setModelId(e.target.value);
          onSelect(Number(e.target.value));
        }}
      >
        <option value="">Modelo…</option>
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>

      {/* Preço só como referência visual; o congelamento acontece no backend. */}
      {selected && (
        <span style={{ fontSize: 13 }}>
          R$ {Number(selected.current_price).toFixed(2)}
        </span>
      )}
    </div>
  );
}
