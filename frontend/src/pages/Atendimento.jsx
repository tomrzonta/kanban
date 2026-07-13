import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import Markdown, { MarkdownComGrifo, AjudaMarkdown } from "../components/Markdown";

// Categoria normativa: só admin edita; artigos editados nos últimos 5 dias
// ganham selo "atualizado".
const CATEGORIA_REGRAS = "Regras de negócio";
const DIAS_DESTAQUE = 5;

// Verdadeiro se o artigo é uma regra editada nos últimos DIAS_DESTAQUE dias.
function regraAtualizada(artigo) {
  if (artigo.categoria !== CATEGORIA_REGRAS || !artigo.atualizado_em) return false;
  const editadoEm = new Date(artigo.atualizado_em.replace(" ", "T"));
  const dias = (Date.now() - editadoEm.getTime()) / 86400000;
  return dias >= 0 && dias < DIAS_DESTAQUE;
}

// Aba "Atendimento": base de conhecimento com material de apoio (problema,
// resolução e pitches prontos para enviar ao cliente). CRUD por qualquer
// usuário logado, exceto a categoria "Regras de negócio" (só admin edita).
export default function Atendimento({ isAdmin }) {
  const [itens, setItens] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [busca, setBusca] = useState("");
  const [catFiltro, setCatFiltro] = useState("");
  const [editando, setEditando] = useState(null); // artigo em edição ou {} (novo)
  const [subaba, setSubaba] = useState("material"); // "material" | "regras"
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

  // Divide os itens pela sub-aba: "regras" mostra a categoria normativa;
  // "material" mostra todo o resto.
  const naRegra = (a) => a.categoria === CATEGORIA_REGRAS;
  // Categorias do filtro: na aba material, exclui a de regras.
  const categoriasMaterial = categorias.filter((c) => c !== CATEGORIA_REGRAS);

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Sub-abas: material de atendimento vs. regras de negócio */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16,
                    borderBottom: "1px solid var(--border)" }}>
        {[["material", "Material de atendimento"], ["regras", "Regras de negócio"]].map(([id, label]) => (
          <button key={id} onClick={() => { setSubaba(id); setCatFiltro(""); }}
                  style={{ padding: "8px 16px", border: "none", background: "none",
                           cursor: "pointer",
                           borderBottom: subaba === id ? "2px solid var(--accent)" : "2px solid transparent",
                           color: subaba === id ? "var(--accent)" : "var(--text-secondary)",
                           fontWeight: subaba === id ? 600 : 400 }}>
            {label}
          </button>
        ))}
      </div>

      {subaba === "regras" ? (
        <DocumentoRegras
          secoes={itens.filter(naRegra)}
          isAdmin={isAdmin}
          busca={busca} setBusca={setBusca}
          onNova={() => setEditando({ categoria: CATEGORIA_REGRAS })}
          onEditar={(a) => setEditando(a)}
          onExcluir={excluir}
        />
      ) : (
        <>
          {/* Barra de busca + filtro + novo (material de atendimento) */}
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
                {categoriasMaterial.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button className="primary" onClick={() => setEditando({})}>
              + Novo material
            </button>
          </div>

          {itens.filter((a) => !naRegra(a)).length === 0 ? (
            <p style={{ color: "var(--text-tertiary)" }}>
              Nenhum material encontrado. Clique em "Novo material" para começar.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {itens.filter((a) => !naRegra(a)).map((a) => (
                <Artigo key={a.id} artigo={a} isAdmin={isAdmin}
                        onEdit={() => setEditando(a)} onDelete={() => excluir(a)}
                        onFavoritar={() => favoritar(a)} />
              ))}
            </div>
          )}
        </>
      )}

      {editando !== null && (
        <Editor artigo={editando} categorias={categorias} isAdmin={isAdmin}
                onClose={() => setEditando(null)}
                onSaved={() => { setEditando(null); carregar(); }} />
      )}
    </div>
  );
}

// Documento de regras de negócio: seções (título + texto) que sanfonam.
// Começam expandidas. Edição só admin. Seções editadas nos últimos dias ganham
// uma faixa lateral amarela (destaque discreto). Texto preserva quebras de linha.
function DocumentoRegras({ secoes, isAdmin, busca, setBusca, onNova, onEditar, onExcluir }) {
  // Filtro de busca no cliente (título ou texto da seção).
  const termo = busca.trim().toLowerCase();
  const visiveis = termo
    ? secoes.filter((s) =>
        (s.titulo || "").toLowerCase().includes(termo) ||
        (s.resolucao || "").toLowerCase().includes(termo))
    : secoes;

  // Data da atualização mais recente entre as seções (mostra no cabeçalho).
  const ultimaAtt = secoes.reduce((max, s) => {
    if (!s.atualizado_em) return max;
    const d = new Date(s.atualizado_em.replace(" ", "T"));
    return !max || d > max ? d : max;
  }, null);
  const qtdAtualizadas = secoes.filter(
    (s) => Array.isArray(s.segmentos) && s.segmentos.some((x) => x.novo)).length;

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Cabeçalho do documento */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16,
                    marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h2 style={{ fontSize: 22, margin: "0 0 4px", letterSpacing: "-0.01em" }}>
            Regras de garantia
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
            {secoes.length} {secoes.length === 1 ? "seção" : "seções"}
            {ultimaAtt && ` · atualizado em ${ultimaAtt.toLocaleDateString("pt-BR")}`}
            {qtdAtualizadas > 0 && (
              <span style={{ color: "#946800" }}>
                {" · "}{qtdAtualizadas} com mudança recente
              </span>
            )}
          </p>
        </div>
        {isAdmin && (
          <button className="primary" onClick={onNova}
                  style={{ whiteSpace: "nowrap" }}>+ Nova seção</button>
        )}
      </div>

      {/* Busca */}
      <input value={busca} onChange={(e) => setBusca(e.target.value)}
             placeholder="🔍 Buscar por título ou conteúdo…"
             style={{ width: "100%", marginBottom: 16 }} />

      {!isAdmin && (
        <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 16 }}>
          🔒 Somente administradores editam as regras de negócio.
        </p>
      )}

      {visiveis.length === 0 ? (
        <p style={{ color: "var(--text-tertiary)" }}>
          {secoes.length === 0
            ? "Nenhuma regra cadastrada ainda."
            : "Nenhuma seção corresponde à busca."}
        </p>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {visiveis.map((s) => (
            <SecaoRegra key={s.id} secao={s} isAdmin={isAdmin}
                        onEditar={() => onEditar(s)} onExcluir={() => onExcluir(s)} />
          ))}
        </div>
      )}
    </div>
  );
}

// Uma seção do documento de regras: título clicável que expande/recolhe o texto.
// Quando atualizada recentemente, ganha faixa lateral amarela e o trecho novo
// do texto vem grifado (marca-texto), com base no diff calculado pelo backend.
function SecaoRegra({ secao, isAdmin, onEditar, onExcluir }) {
  const [aberto, setAberto] = useState(true); // começam expandidas
  const AMARELO = "#f5a623";
  const GRIFO = "#fff3bf"; // marca-texto amarelo claro para o trecho novo

  // Há destaque ativo se o backend enviou segmentos com trecho novo. Isso
  // reflete "mudou nos últimos dias" com precisão por trecho.
  const temGrifo = Array.isArray(secao.segmentos) && secao.segmentos.some((s) => s.novo);
  const atualizada = temGrifo;

  // Corpo: com grifo (Markdown + destaque) ou Markdown puro.
  const corpo = temGrifo
    ? <MarkdownComGrifo segmentos={secao.segmentos} grifoCor={GRIFO} />
    : (secao.resolucao
        ? <Markdown texto={secao.resolucao} />
        : <span style={{ color: "var(--text-tertiary)" }}>(sem conteúdo)</span>);

  return (
    <div style={{ background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderLeft: atualizada ? `4px solid ${AMARELO}` : "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)", overflow: "hidden",
                  transition: "border-color 0.2s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10,
                    padding: "14px 18px", cursor: "pointer",
                    userSelect: "none" }}
           onClick={() => setAberto((v) => !v)}>
        <span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>
          {aberto ? "▾" : "▸"}
        </span>
        <span style={{ fontWeight: 600, fontSize: 16, flex: 1,
                       letterSpacing: "-0.01em" }}>
          {secao.titulo}
        </span>
        {atualizada && (
          <span title={`Trecho novo grifado — some após ${DIAS_DESTAQUE} dias`}
                style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                         letterSpacing: "0.04em", background: AMARELO,
                         color: "#3a2c00", borderRadius: 10, padding: "2px 9px" }}>
            Atualizado
          </span>
        )}
        {isAdmin && (
          <span style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
            <button onClick={onEditar} style={{ padding: "2px 10px" }}>Editar</button>
            <button onClick={onExcluir}
                    style={{ padding: "2px 10px", color: "var(--red)" }}>Excluir</button>
          </span>
        )}
      </div>
      {aberto && (
        <div style={{ padding: "0 18px 18px 40px",
                      color: "var(--text)", lineHeight: 1.7, fontSize: 14.5 }}>
          {corpo}
        </div>
      )}
    </div>
  );
}

// Cartão de um artigo: expande para mostrar problema, resolução e pitches.
function Artigo({ artigo, isAdmin, onEdit, onDelete, onFavoritar }) {
  const [aberto, setAberto] = useState(false);
  // Regras de negócio só podem ser editadas/excluídas por admin.
  const ehRegra = artigo.categoria === CATEGORIA_REGRAS;
  const podeEditar = !ehRegra || isAdmin;
  const atualizada = regraAtualizada(artigo);
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
          <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8,
                        flexWrap: "wrap" }}>
            <span>{aberto ? "▾" : "▸"} {artigo.titulo}</span>
            {atualizada && (
              <span title={`Atualizado nos últimos ${DIAS_DESTAQUE} dias`}
                    style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                             letterSpacing: "0.03em", background: "var(--accent-soft)",
                             color: "var(--accent)", border: "1px solid var(--accent)",
                             borderRadius: 10, padding: "1px 8px" }}>
                🆕 Atualizado
              </span>
            )}
          </div>
          {artigo.categoria && (
            <span style={{ fontSize: 11, color: "var(--accent)",
                           background: "var(--bg)", borderRadius: 4,
                           padding: "1px 8px", marginTop: 4, display: "inline-block" }}>
              {artigo.categoria}
            </span>
          )}
        </div>
        {podeEditar ? (
          <>
            <button onClick={onEdit} style={{ padding: "2px 10px" }}>Editar</button>
            <button onClick={onDelete}
                    style={{ padding: "2px 10px", color: "var(--red)" }}>Excluir</button>
          </>
        ) : (
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}
                title="Somente administradores editam regras de negócio">
            🔒 Somente admin
          </span>
        )}
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
      <div style={{ fontSize: 14 }}><Markdown texto={texto} /></div>
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
function Editor({ artigo, categorias, isAdmin, onClose, onSaved }) {
  const novo = !artigo.id;
  // Modo "regra": formulário simplificado (título + conteúdo), sem pitches.
  const ehRegra = (artigo.categoria || "") === CATEGORIA_REGRAS;
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
    // Regra normativa: só admin pode gravar nessa categoria (backend também barra).
    if ((form.categoria || "").trim() === CATEGORIA_REGRAS && !isAdmin) {
      toast.error(`Apenas administradores podem usar a categoria "${CATEGORIA_REGRAS}".`);
      return;
    }
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
          <h2 style={{ fontSize: 18 }}>
            {ehRegra
              ? (novo ? "Nova seção de regra" : "Editar seção de regra")
              : (novo ? "Novo material" : "Editar material")}
          </h2>
          <button onClick={onClose} style={{ padding: "4px 10px" }}>✕</button>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {ehRegra ? (
            <>
              <div>
                <label>Título da seção *</label>
                <input value={form.titulo} onChange={set("titulo")}
                       placeholder="Ex: Prazos de garantia" autoFocus />
              </div>
              <div>
                <label>Conteúdo</label>
                <textarea rows={12} value={form.resolucao} onChange={set("resolucao")}
                          placeholder="Escreva o texto da regra. As quebras de linha são preservadas."
                          style={{ width: "100%", resize: "vertical", lineHeight: 1.6 }} />
                <AjudaMarkdown />
              </div>
            </>
          ) : (
          <>
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
            <AjudaMarkdown />
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
          </>
          )}

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
