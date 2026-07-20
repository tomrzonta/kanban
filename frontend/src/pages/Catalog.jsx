import { useState } from "react";
import BrandCatalog from "./BrandCatalog";
import SimpleEntityList from "../components/SimpleEntityList";
import DesfechoList from "../components/DesfechoList";
import CategoriaGastoList from "../components/CategoriaGastoList";
import PecasCanibalizaveisList from "../components/PecasCanibalizaveisList";

// Catálogo com subseções (abas internas). Cada aba gerencia uma entidade
// padronizada usada nos tickets e na análise.
const SECTIONS = [
  { id: "brands", label: "Fabricante" },
  { id: "suppliers", label: "Fornecedores" },
  { id: "defects", label: "Tipos de defeito" },
  { id: "desfechos", label: "Desfechos" },
  { id: "categorias-gasto", label: "Categorias de gasto" },
  { id: "pecas-canibalizaveis", label: "Peças canibalizáveis" },
];

export default function Catalog() {
  const [section, setSection] = useState("brands");

  const subTab = (active) => ({
    padding: "6px 14px", border: "1px solid var(--border)",
    borderRadius: 20, background: active ? "var(--accent)" : "var(--surface)",
    color: active ? "#fff" : "var(--text-secondary)",
    cursor: "pointer", fontSize: 13,
    fontWeight: active ? 600 : 400,
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {SECTIONS.map((s) => (
          <button key={s.id} style={subTab(section === s.id)}
                  onClick={() => setSection(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      {section === "brands" && <BrandCatalog />}
      {section === "suppliers" && (
        <SimpleEntityList kind="suppliers" label="Fornecedor" />
      )}
      {section === "defects" && (
        <SimpleEntityList kind="defect-types" label="Tipo de defeito" />
      )}
      {section === "desfechos" && <DesfechoList />}
      {section === "categorias-gasto" && <CategoriaGastoList />}
      {section === "pecas-canibalizaveis" && <PecasCanibalizaveisList />}
    </div>
  );
}
