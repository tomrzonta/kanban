import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";

// Aba "Compras": cadastro de equipamentos comprados — a fonte de verdade dos
// números de série. Suporta colar em massa da planilha do fornecedor (Ctrl+V,
// 10 colunas na ordem fixa) e CRUD manual. Marca/modelo fora do catálogo são
// sinalizados visualmente, mas não impedem o cadastro.

// Ordem fixa das colunas ao colar (mesma ordem que o fornecedor manda):
const COLUNAS = [
  "data_compra", "responsavel_compra", "fornecedor", "contato_fornecedor",
  "marca", "modelo", "numero_serie", "nota_fiscal", "data_entrega", "status_compra",
];
const CAMPOS_LABEL = {
  data_compra: "Data da Compra", responsavel_compra: "Responsável",
  fornecedor: "Fornecedor", contato_fornecedor: "Contato / E-mail",
  marca: "Marca", modelo: "Modelo", numero_serie: "Nº de Série",
  nota_fiscal: "Nota Fiscal", data_entrega: "Data de Entrega",
  status_compra: "Status",
};

// Converte data em vários formatos (dd/mm/aaaa, aaaa-mm-dd) para ISO aaaa-mm-dd.
function normalizarData(v) {
  if (!v) return null;
  const s = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (br) {
    let [, d, m, a] = br;
    if (a.length === 2) a = "20" + a;
    return `${a}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return s; // deixa o backend decidir; se inválido, ele ignora
}

export default function Compras() {
  const [itens, setItens] = useState([]);
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState(null);
  const [colando, setColando] = useState(false);
  const [catalogoModal, setCatalogoModal] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const toast = useToast();

  const carregar = useCallback(() => {
    api.listCompras(busca).then(setItens).catch(() => {});
  }, [busca]);

  useEffect(() => {
    const t = setTimeout(carregar, 250);
    return () => clearTimeout(t);
  }, [carregar]);

  async function sincronizar() {
    if (!confirm("Criar no catálogo as marcas e modelos das compras que ainda não existem?\n"
      + "(modelos novos entram com preço zero, ajustável depois no Catálogo)")) return;
    setSincronizando(true);
    try {
      const r = await api.sincronizarCatalogoCompras();
      toast.success(`Catálogo sincronizado: ${r.marcas_criadas} marca(s) e `
        + `${r.modelos_criados} modelo(s) criado(s).`);
    } catch (e) { toast.error(String(e.message || e)); }
    finally { setSincronizando(false); }
  }

  async function excluir(c) {
    if (!confirm(`Excluir a compra${c.numero_serie ? ` (SN ${c.numero_serie})` : ""}?`)) return;
    try { await api.deleteCompra(c.id); toast.success("Compra excluída."); carregar(); }
    catch (e) { toast.error(String(e.message || e)); }
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap",
                    alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label>Buscar</label>
          <input value={busca} onChange={(e) => setBusca(e.target.value)}
                 placeholder="SN, marca, modelo, fornecedor ou NF…" />
        </div>
        <button onClick={sincronizar} disabled={sincronizando}
                title="Cria no catálogo as marcas/modelos das compras que ainda não existem">
          {sincronizando ? "Sincronizando…" : "🔄 Sincronizar catálogo"}
        </button>
        <button onClick={() => setCatalogoModal(true)}
                title="Cadastrar marca/modelo manualmente (ex: itens não vendidos)">
          + Marca/Modelo
        </button>
        <button onClick={() => setColando(true)}>📋 Colar da planilha</button>
        <button className="primary" onClick={() => setEditando({})}>+ Nova compra</button>
      </div>

      {itens.length === 0 ? (
        <p style={{ color: "var(--text-tertiary)" }}>
          Nenhuma compra cadastrada. Use "Colar da planilha" para importar em massa.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-secondary)" }}>
                {COLUNAS.map((k) => (
                  <th key={k} style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)",
                                       whiteSpace: "nowrap" }}>
                    {CAMPOS_LABEL[k]}
                  </th>
                ))}
                <th style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)" }}></th>
              </tr>
            </thead>
            <tbody>
              {itens.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={cel}>{c.data_compra || "—"}</td>
                  <td style={cel}>{c.responsavel_compra || "—"}</td>
                  <td style={cel}>{c.fornecedor || "—"}</td>
                  <td style={cel}>{c.contato_fornecedor || "—"}</td>
                  <td style={cel}>
                    <Sinalizado ok={c.marca_no_catalogo} texto={c.marca} />
                  </td>
                  <td style={cel}>
                    <Sinalizado ok={c.modelo_no_catalogo} texto={c.modelo} />
                  </td>
                  <td style={{ ...cel, fontWeight: 600 }}>{c.numero_serie || "—"}</td>
                  <td style={cel}>{c.nota_fiscal || "—"}</td>
                  <td style={cel}>{c.data_entrega || "—"}</td>
                  <td style={cel}>{c.status_compra || "—"}</td>
                  <td style={{ ...cel, whiteSpace: "nowrap" }}>
                    <button onClick={() => setEditando(c)} style={{ padding: "2px 8px" }}>Editar</button>{" "}
                    <button onClick={() => excluir(c)}
                            style={{ padding: "2px 8px", color: "var(--red)" }}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {colando && (
        <ColarModal onClose={() => setColando(false)}
                    onDone={() => { setColando(false); carregar(); }} />
      )}
      {catalogoModal && (
        <CatalogoModal onClose={() => setCatalogoModal(false)} />
      )}
      {editando !== null && (
        <EditorModal compra={editando} onClose={() => setEditando(null)}
                     onSaved={() => { setEditando(null); carregar(); }} />
      )}
    </div>
  );
}

const cel = { padding: "8px 10px", whiteSpace: "nowrap" };

// Mostra o texto; se não casa com o catálogo, marca com aviso visual.
function Sinalizado({ ok, texto }) {
  if (!texto) return <span style={{ color: "var(--text-tertiary)" }}>—</span>;
  if (ok) return <span>{texto}</span>;
  return (
    <span title="Não encontrado no catálogo" style={{ color: "#c2410c" }}>
      ⚠ {texto}
    </span>
  );
}

// Modal de colar em massa: cola da planilha, faz o parse por linhas/tabs e
// mapeia as 10 colunas por posição. Mostra prévia antes de salvar.
function ColarModal({ onClose, onDone }) {
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const toast = useToast();

  // Faz o parse do texto colado em linhas -> colunas (separadas por TAB).
  const linhas = texto.trim() ? texto.trim().split(/\r?\n/).map((linha) => {
    const celulas = linha.split("\t");
    const obj = {};
    COLUNAS.forEach((k, i) => {
      let v = (celulas[i] || "").trim();
      if ((k === "data_compra" || k === "data_entrega") && v) v = normalizarData(v);
      obj[k] = v || null;
    });
    return obj;
  }) : [];

  // Ignora uma eventual linha de cabeçalho (se a 1ª célula for "data da compra").
  const linhasLimpas = linhas.filter((l, i) => {
    if (i === 0 && (l.data_compra || "").toLowerCase().includes("data")) return false;
    return Object.values(l).some((v) => v); // descarta linhas totalmente vazias
  });

  async function salvar() {
    if (linhasLimpas.length === 0) { toast.error("Nada para importar."); return; }
    setSalvando(true);
    try {
      const r = await api.colarCompras(linhasLimpas);
      const msg = `${r.inseridas} compra(s) importada(s)` +
        (r.puladas.length ? `, ${r.puladas.length} pulada(s) (SN repetida)` : "");
      toast.success(msg);
      onDone();
    } catch (e) {
      toast.error(String(e.message || e));
    } finally { setSalvando(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}
           style={{ width: 820, maxHeight: "90vh", overflowY: "auto" }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Colar da planilha</h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>
          Copie as linhas da planilha (sem cabeçalho, ou com — ele é ignorado) e
          cole abaixo. As colunas devem estar nesta ordem:
        </p>
        <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10 }}>
          {COLUNAS.map((k) => CAMPOS_LABEL[k]).join(" · ")}
        </p>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)}
                  rows={8} autoFocus
                  placeholder="Cole aqui (Ctrl+V)…"
                  style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }} />

        {linhasLimpas.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Prévia: {linhasLimpas.length} linha(s)
            </div>
            <div style={{ overflowX: "auto", maxHeight: 220, overflowY: "auto",
                          border: "1px solid var(--border)", borderRadius: 6 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: "left", position: "sticky", top: 0,
                               background: "var(--surface)" }}>
                    {COLUNAS.map((k) => (
                      <th key={k} style={{ padding: "6px 8px", whiteSpace: "nowrap",
                                           borderBottom: "1px solid var(--border)" }}>
                        {CAMPOS_LABEL[k]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linhasLimpas.slice(0, 50).map((l, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                      {COLUNAS.map((k) => (
                        <td key={k} style={{ padding: "5px 8px", whiteSpace: "nowrap" }}>
                          {l[k] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose}>Cancelar</button>
          <button className="primary" onClick={salvar}
                  disabled={salvando || linhasLimpas.length === 0}>
            {salvando ? "Importando…" : `Importar ${linhasLimpas.length || ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal de criar/editar uma compra manualmente.
function EditorModal({ compra, onClose, onSaved }) {
  const novo = !compra.id;
  const [form, setForm] = useState({
    data_compra: compra.data_compra || "", responsavel_compra: compra.responsavel_compra || "",
    fornecedor: compra.fornecedor || "", contato_fornecedor: compra.contato_fornecedor || "",
    marca: compra.marca || "", modelo: compra.modelo || "",
    numero_serie: compra.numero_serie || "", nota_fiscal: compra.nota_fiscal || "",
    data_entrega: compra.data_entrega || "", status_compra: compra.status_compra || "",
  });
  const [salvando, setSalvando] = useState(false);
  const toast = useToast();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function salvar() {
    setSalvando(true);
    const payload = { ...form };
    for (const k of Object.keys(payload)) if (payload[k] === "") payload[k] = null;
    try {
      if (novo) await api.criarCompra(payload);
      else await api.updateCompra(compra.id, payload);
      toast.success(novo ? "Compra cadastrada." : "Compra atualizada.");
      onSaved();
    } catch (e) {
      toast.error(String(e.message || e));
    } finally { setSalvando(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}
           style={{ width: 560, maxHeight: "90vh", overflowY: "auto" }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>
          {novo ? "Nova compra" : "Editar compra"}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Campo label="Data da Compra"><input type="date" value={form.data_compra} onChange={set("data_compra")} /></Campo>
          <Campo label="Responsável"><input value={form.responsavel_compra} onChange={set("responsavel_compra")} /></Campo>
          <Campo label="Fornecedor"><input value={form.fornecedor} onChange={set("fornecedor")} /></Campo>
          <Campo label="Contato / E-mail"><input value={form.contato_fornecedor} onChange={set("contato_fornecedor")} /></Campo>
          <Campo label="Marca"><input value={form.marca} onChange={set("marca")} /></Campo>
          <Campo label="Modelo"><input value={form.modelo} onChange={set("modelo")} /></Campo>
          <Campo label="Nº de Série"><input value={form.numero_serie} onChange={set("numero_serie")} /></Campo>
          <Campo label="Nota Fiscal"><input value={form.nota_fiscal} onChange={set("nota_fiscal")} /></Campo>
          <Campo label="Data de Entrega"><input type="date" value={form.data_entrega} onChange={set("data_entrega")} /></Campo>
          <Campo label="Status"><input value={form.status_compra} onChange={set("status_compra")} /></Campo>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose}>Cancelar</button>
          <button className="primary" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal de criação manual de marca/modelo no catálogo (itens não vendidos).
function CatalogoModal({ onClose }) {
  const [brands, setBrands] = useState([]);
  const [novaMarca, setNovaMarca] = useState("");
  const [brandId, setBrandId] = useState("");
  const [novoModelo, setNovoModelo] = useState("");
  const [preco, setPreco] = useState("");
  const [salvando, setSalvando] = useState(false);
  const toast = useToast();

  const carregarMarcas = useCallback(() => {
    api.listBrands().then(setBrands).catch(() => {});
  }, []);
  useEffect(() => { carregarMarcas(); }, [carregarMarcas]);

  async function criarMarca() {
    if (!novaMarca.trim()) { toast.error("Informe o nome da marca."); return; }
    setSalvando(true);
    try {
      const b = await api.createBrand({ name: novaMarca.trim() });
      toast.success(`Marca "${novaMarca.trim()}" criada.`);
      setNovaMarca("");
      carregarMarcas();
      if (b?.id) setBrandId(String(b.id));
    } catch (e) { toast.error(String(e.message || e)); }
    finally { setSalvando(false); }
  }

  async function criarModelo() {
    if (!brandId) { toast.error("Selecione a marca do modelo."); return; }
    if (!novoModelo.trim()) { toast.error("Informe o nome do modelo."); return; }
    setSalvando(true);
    try {
      await api.createModel({
        brand_id: Number(brandId), name: novoModelo.trim(),
        current_price: preco ? Number(preco) : 0,
      });
      toast.success(`Modelo "${novoModelo.trim()}" criado.`);
      setNovoModelo(""); setPreco("");
    } catch (e) { toast.error(String(e.message || e)); }
    finally { setSalvando(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 480 }}>
        <h2 style={{ fontSize: 18, marginBottom: 4 }}>Cadastrar no catálogo</h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
          Crie marcas e modelos manualmente — útil para itens não vendidos que
          não vêm na planilha de compras.
        </p>

        <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16,
                      marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Nova marca</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={novaMarca} onChange={(e) => setNovaMarca(e.target.value)}
                   placeholder="Ex: Creality" style={{ flex: 1 }} />
            <button className="primary" onClick={criarMarca} disabled={salvando}>
              Criar
            </button>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Novo modelo</div>
          <div style={{ display: "grid", gap: 8 }}>
            <select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
              <option value="">Selecione a marca…</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={novoModelo} onChange={(e) => setNovoModelo(e.target.value)}
                     placeholder="Nome do modelo" style={{ flex: 2 }} />
              <input value={preco} onChange={(e) => setPreco(e.target.value)}
                     type="number" placeholder="Preço (R$)" style={{ flex: 1 }} />
            </div>
            <button className="primary" onClick={criarModelo} disabled={salvando}
                    style={{ justifySelf: "start" }}>
              Criar modelo
            </button>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <button onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 12 }}>{label}</label>
      {children}
    </div>
  );
}
