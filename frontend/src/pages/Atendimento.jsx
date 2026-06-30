import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";

// Aba "Atendimento": base de conhecimento com material de apoio (problema,
// resolução e pitches prontos para enviar ao cliente). CRUD por qualquer
// usuário logado, com busca (título + corpo) e filtro por categoria.
export default function Atendimento() {
  const [itens, setItens] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [busca, setBusca] = useState("");
  const [catFiltro, setCatFiltro] = useState("");
  const [editando, setEditando] = useState(null); // artigo em edição ou {} (novo)
  const toast = useToast();

  const carregar = useCallback(() => {
    api.listKb({ q: busca, categoria: catFiltro }).then(setItens);
  }, [busca, catFiltro]);

  useEffect(() => {
    const t = setTimeout(carregar, 250); // debounce na busca
    return () => clearTimeout(t);
  }, [carregar]);

  useEffect(() => { api.kbCategorias().then(setCategorias); }, [editando]);

  async function excluir(a) {
    if (!confirm(`Excluir o material "${a.titulo}"?`)) return;
    try {
      await api.deleteKb(a.id);
      toast.success("Material excluído.");
      carregar();
    } catch (e) { toast.error(String(e.message || e)); }
  }

  async function favoritar(a) {
    try {
      await api.toggleFavoritoKb(a.id);
      carregar(); // reordena (favoritos ao topo)
    } catch (e) { toast.error(String(e.message || e)); }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Barra de busca + filtro + novo */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap",
                    alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label>Buscar</label>
          <input value={busca} onChange={(e) => setBusca(e.target.value)}
                 placeholder="Buscar no título ou no texto…" />
        </div>
        <div style={{ minWidth: 160 }}>
          <label>Categoria</label>
          <select value={catFiltro} onChange={(e) => setCatFiltro(e.target.value)}>
            <option value="">Todas</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button className="primary" onClick={() => setEditando({})}>
          + Novo material
        </button>
      </div>

      {itens.length === 0 ? (
        <p style={{ color: "var(--text-tertiary)" }}>
          Nenhum material encontrado. Clique em "Novo material" para começar.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {itens.map((a) => (
            <Artigo key={a.id} artigo={a}
                    onEdit={() => setEditando(a)} onDelete={() => excluir(a)}
                    onFavoritar={() => favoritar(a)} />
          ))}
        </div>
      )}

      {editando !== null && (
        <Editor artigo={editando} categorias={categorias}
                onClose={() => setEditando(null)}
                onSaved={() => { setEditando(null); carregar(); }} />
      )}
    </div>
  );
}

// Cartão de um artigo: expande para mostrar problema, resolução e pitches.
function Artigo({ artigo, onEdit, onDelete, onFavoritar }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={onFavoritar}
                title={artigo.favorito ? "Remover dos favoritos" : "Favoritar (fixa no topo)"}
                style={{ padding: "2px 8px", fontSize: 18, lineHeight: 1,
                         color: artigo.favorito ? "#f5a623" : "var(--text-tertiary)",
                         background: "transparent", border: "none", cursor: "pointer" }}>
          {artigo.favorito ? "★" : "☆"}
        </button>
        <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setAberto((v) => !v)}>
          <div style={{ fontWeight: 600 }}>{aberto ? "▾" : "▸"} {artigo.titulo}</div>
          {artigo.categoria && (
            <span style={{ fontSize: 11, color: "var(--accent)",
                           background: "var(--bg)", borderRadius: 4,
                           padding: "1px 8px", marginTop: 4, display: "inline-block" }}>
              {artigo.categoria}
            </span>
          )}
        </div>
        <button onClick={onEdit} style={{ padding: "2px 10px" }}>Editar</button>
        <button onClick={onDelete}
                style={{ padding: "2px 10px", color: "var(--red)" }}>Excluir</button>
      </div>

      {aberto && (
        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          {artigo.problema && (
            <Secao titulo="Problema" texto={artigo.problema} />
          )}
          {artigo.resolucao && (
            <Secao titulo="Resolução" texto={artigo.resolucao} />
          )}
          {(artigo.pitches || []).length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600,
                            color: "var(--text-secondary)", marginBottom: 6 }}>
                Pitches para o cliente
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {artigo.pitches.map((p, i) => <PitchBox key={i} pitch={p} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Secao({ titulo, texto }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)",
                    marginBottom: 4 }}>{titulo}</div>
      <div style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{texto}</div>
    </div>
  );
}

// Bloco de pitch com botão de copiar.
function PitchBox({ pitch }) {
  const [copiado, setCopiado] = useState(false);
  function copiar() {
    navigator.clipboard.writeText(pitch.texto || "").then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    });
  }
  return (
    <div style={{ background: "var(--bg)", borderRadius: "var(--radius)",
                  padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600,
                       color: "var(--text-secondary)" }}>
          {pitch.titulo || "Pitch"}
        </span>
        <button onClick={copiar} style={{ padding: "2px 10px", fontSize: 12 }}>
          {copiado ? "✓ Copiado" : "Copiar"}
        </button>
      </div>
      <div style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{pitch.texto}</div>
    </div>
  );
}

// Modal de criação/edição.
function Editor({ artigo, categorias, onClose, onSaved }) {
  const novo = !artigo.id;
  const [form, setForm] = useState({
    titulo: artigo.titulo || "", categoria: artigo.categoria || "",
    problema: artigo.problema || "", resolucao: artigo.resolucao || "",
    pitches: artigo.pitches?.length ? artigo.pitches : [{ titulo: "", texto: "" }],
  });
  const [salvando, setSalvando] = useState(false);
  const toast = useToast();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function setPitch(i, campo, valor) {
    setForm((f) => {
      const ps = [...f.pitches];
      ps[i] = { ...ps[i], [campo]: valor };
      return { ...f, pitches: ps };
    });
  }
  const addPitch = () =>
    setForm((f) => ({ ...f, pitches: [...f.pitches, { titulo: "", texto: "" }] }));
  const removePitch = (i) =>
    setForm((f) => ({ ...f, pitches: f.pitches.filter((_, j) => j !== i) }));

  async function salvar() {
    if (!form.titulo.trim()) { toast.error("Informe o título."); return; }
    setSalvando(true);
    // Descarta pitches totalmente vazios.
    const pitches = form.pitches
      .filter((p) => (p.texto || "").trim())
      .map((p) => ({ titulo: (p.titulo || "").trim() || null, texto: p.texto.trim() }));
    const payload = { ...form, pitches };
    try {
      if (novo) await api.createKb(payload);
      else await api.updateKb(artigo.id, payload);
      toast.success(novo ? "Material criado." : "Material atualizado.");
      onSaved();
    } catch (e) {
      toast.error(String(e.message || e));
    } finally { setSalvando(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}
           style={{ width: 680, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18 }}>{novo ? "Novo material" : "Editar material"}</h2>
          <button onClick={onClose} style={{ padding: "4px 10px" }}>✕</button>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 2, minWidth: 200 }}>
              <label>Título / assunto *</label>
              <input value={form.titulo} onChange={set("titulo")} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label>Categoria</label>
              <input value={form.categoria} onChange={set("categoria")}
                     list="kb-cats" placeholder="Ex: Hardware" />
              <datalist id="kb-cats">
                {categorias.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>

          <div>
            <label>Descrição do problema</label>
            <textarea rows={3} value={form.problema} onChange={set("problema")}
                      style={{ width: "100%", resize: "vertical" }} />
          </div>
          <div>
            <label>Como resolver</label>
            <textarea rows={3} value={form.resolucao} onChange={set("resolucao")}
                      style={{ width: "100%", resize: "vertical" }} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
              <label style={{ margin: 0, flex: 1 }}>Pitches para o cliente</label>
              <button onClick={addPitch} style={{ padding: "2px 10px" }}>+ Pitch</button>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {form.pitches.map((p, i) => (
                <div key={i} style={{ border: "1px solid var(--border)",
                                      borderRadius: "var(--radius)", padding: 10 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <input value={p.titulo || ""} placeholder="Título do pitch (opcional)"
                           onChange={(e) => setPitch(i, "titulo", e.target.value)}
                           style={{ flex: 1 }} />
                    {form.pitches.length > 1 && (
                      <button onClick={() => removePitch(i)}
                              style={{ color: "var(--red)", padding: "2px 10px" }}>
                        Remover
                      </button>
                    )}
                  </div>
                  <textarea rows={3} value={p.texto || ""}
                            placeholder="Texto do pitch para enviar ao cliente…"
                            onChange={(e) => setPitch(i, "texto", e.target.value)}
                            style={{ width: "100%", resize: "vertical" }} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={onClose}>Cancelar</button>
            <button className="primary" onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
