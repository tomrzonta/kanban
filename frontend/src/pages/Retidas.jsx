import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";

// Aba "Impressoras retidas": controle das impressoras que ficaram com a empresa
// após troca de garantia. Cada uma tem origem (ticket ou avulsa), um estado que
// evolui (com histórico) e pode ser canibalizada (peças retiradas).

export default function Retidas({ isAdmin, reterTicket, onConsumidoReter }) {
  const [itens, setItens] = useState([]);
  const [estados, setEstados] = useState([]);
  const [busca, setBusca] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [editando, setEditando] = useState(null); // {} novo, obj edição
  const [detalhe, setDetalhe] = useState(null);    // retida aberta no painel
  const [gerirEstados, setGerirEstados] = useState(false);
  const toast = useToast();

  // Se veio um pedido de "reter" a partir de um recebimento, abre o editor já
  // com o código do ticket para puxar os dados.
  useEffect(() => {
    if (reterTicket) {
      setEditando({ ticket_ref_inicial: reterTicket });
      onConsumidoReter && onConsumidoReter();
    }
  }, [reterTicket, onConsumidoReter]);

  const carregar = useCallback(() => {
    api.listRetidas({ q: busca, estadoId: filtroEstado || undefined })
      .then(setItens).catch(() => {});
  }, [busca, filtroEstado]);

  useEffect(() => { api.listEstadosRetida().then(setEstados).catch(() => {}); }, [gerirEstados]);
  useEffect(() => { const t = setTimeout(carregar, 250); return () => clearTimeout(t); }, [carregar]);

  async function excluir(r) {
    if (!confirm(`Excluir a impressora retida${r.numero_serie ? ` (SN ${r.numero_serie})` : ""}?\n`
      + "Isso remove também o histórico e as peças registradas.")) return;
    try { await api.deleteRetida(r.id); toast.success("Retida excluída."); carregar(); }
    catch (e) { toast.error(String(e.message || e)); }
  }

  // Cor do selo de estado (neutra; destaque só para sucata/cemitério).
  const corEstado = (nome) => {
    const n = (nome || "").toLowerCase();
    if (n.includes("sucata")) return { bg: "#fceaea", fg: "#a32d2d" };
    if (n.includes("cemitério") || n.includes("cemiterio")) return { bg: "#fdf0d5", fg: "#854f0b" };
    if (n.includes("farm") || n.includes("uso")) return { bg: "#e6f4ea", fg: "#1d7a4d" };
    if (n.includes("recuperada")) return { bg: "var(--accent-soft)", fg: "var(--accent)" };
    return { bg: "var(--bg)", fg: "var(--text-secondary)" };
  };

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap",
                    alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label>Buscar</label>
          <input value={busca} onChange={(e) => setBusca(e.target.value)}
                 placeholder="SN, marca ou modelo…" />
        </div>
        <div style={{ minWidth: 180 }}>
          <label>Estado</label>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todos</option>
            {estados.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        {isAdmin && (
          <button onClick={() => setGerirEstados(true)}>⚙ Estados</button>
        )}
        <button className="primary" onClick={() => setEditando({})}>+ Nova retida</button>
      </div>

      {itens.length === 0 ? (
        <p style={{ color: "var(--text-tertiary)" }}>
          Nenhuma impressora retida cadastrada.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-secondary)" }}>
                {["SN", "Fabricante / Modelo", "Origem", "Condição", "Estado", "Local", ""].map((h, i) => (
                  <th key={i} style={{ padding: "8px 10px",
                                       borderBottom: "1px solid var(--border)",
                                       whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itens.map((r) => {
                const c = corEstado(r.estado_nome);
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--border)",
                                          cursor: "pointer" }}
                      onClick={() => setDetalhe(r)}>
                    <td style={{ padding: "8px 10px", fontWeight: 600 }}>{r.numero_serie || "—"}</td>
                    <td style={{ padding: "8px 10px" }}>{r.marca} · {r.modelo}</td>
                    <td style={{ padding: "8px 10px", color: "var(--text-secondary)" }}>
                      {r.ticket_codigo || "Avulsa"}
                    </td>
                    <td style={{ padding: "8px 10px", color: "var(--text-secondary)" }}>
                      {r.condicao || "—"}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      {r.estado_nome ? (
                        <span style={{ fontSize: 11, fontWeight: 600, background: c.bg,
                                       color: c.fg, borderRadius: 10, padding: "2px 10px",
                                       whiteSpace: "nowrap" }}>{r.estado_nome}</span>
                      ) : "—"}
                    </td>
                    <td style={{ padding: "8px 10px", color: "var(--text-secondary)" }}>
                      {r.local || "—"}
                    </td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}
                        onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setEditando(r)} style={{ padding: "2px 8px" }}>Editar</button>{" "}
                      <button onClick={() => excluir(r)}
                              style={{ padding: "2px 8px", color: "var(--red)" }}>Excluir</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editando !== null && (
        <EditorRetida retida={editando} estados={estados}
                      onClose={() => setEditando(null)}
                      onSaved={() => { setEditando(null); carregar(); }} />
      )}
      {detalhe && (
        <DetalheRetida retida={detalhe} estados={estados} todas={itens}
                       onClose={() => setDetalhe(null)}
                       onMudou={() => carregar()} />
      )}
      {gerirEstados && (
        <GerirEstados onClose={() => setGerirEstados(false)} />
      )}
    </div>
  );
}

// Modal de criar/editar uma retida, com opção de puxar dados de um ticket.
function EditorRetida({ retida, estados, onClose, onSaved }) {
  const novo = !retida.id;
  const [form, setForm] = useState({
    ticket_id: retida.ticket_id || "", ticket_codigo: retida.ticket_codigo || "",
    marca: retida.marca || "",
    modelo: retida.modelo || "", numero_serie: retida.numero_serie || "",
    condicao: retida.condicao || "", estado_id: retida.estado_id || "",
    local: retida.local || "", observacao: retida.observacao || "",
  });
  const [salvando, setSalvando] = useState(false);
  const toast = useToast();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Puxa marca/modelo/SN de um ticket (aceita o código GAR). `ref` opcional
  // permite chamar automaticamente (ex: ao vir do botão "Reter" no recebimento).
  async function puxarTicket(refArg) {
    const ref = (typeof refArg === "string" ? refArg : form.ticket_id).trim();
    if (!ref) { toast.error("Informe o código do ticket (ex: GAR-2026-0001)."); return; }
    try {
      const d = await api.dadosDoTicket(ref);
      setForm((f) => ({ ...f,
        ticket_id: d.id, ticket_codigo: d.codigo_interno,
        marca: d.marca || f.marca, modelo: d.modelo || f.modelo,
        numero_serie: d.serial_number || f.numero_serie,
        condicao: f.condicao || d.problema || "" }));
      toast.success(`Dados do ticket ${d.codigo_interno} carregados.`);
    } catch (e) { toast.error("Ticket não encontrado. Confira o código (ex: GAR-2026-0001)."); }
  }

  // Se o editor foi aberto pelo botão "Reter" (recebimento), já puxa os dados.
  useEffect(() => {
    if (retida.ticket_ref_inicial) puxarTicket(retida.ticket_ref_inicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function salvar() {
    setSalvando(true);
    const payload = { ...form };
    delete payload.ticket_codigo; // campo só de exibição, não vai ao backend
    payload.estado_id = form.estado_id ? Number(form.estado_id) : null;
    payload.ticket_id = (form.ticket_id || "").trim() || null;
    for (const k of ["marca","modelo","numero_serie","condicao","local","observacao"])
      if (payload[k] === "") payload[k] = null;
    try {
      if (novo) await api.createRetida(payload);
      else await api.updateRetida(retida.id, payload);
      toast.success(novo ? "Retida cadastrada." : "Retida atualizada.");
      onSaved();
    } catch (e) { toast.error(String(e.message || e)); }
    finally { setSalvando(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}
           style={{ width: 560, maxHeight: "90vh", overflowY: "auto" }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>
          {novo ? "Nova impressora retida" : "Editar retida"}
        </h2>
        {novo && (
          <div style={{ background: "var(--bg)", borderRadius: "var(--radius)",
                        padding: 12, marginBottom: 16 }}>
            <label style={{ fontSize: 12 }}>Origem: ticket do cliente (opcional)</label>
            {form.ticket_codigo ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>
                  ✓ Vinculado ao ticket {form.ticket_codigo}
                </span>
                <button onClick={() => setForm((f) => ({ ...f, ticket_id: "", ticket_codigo: "" }))}
                        style={{ padding: "2px 8px" }}>Trocar</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <input value={form.ticket_id} onChange={set("ticket_id")}
                       placeholder="Código do ticket (ex: GAR-2026-0001)" style={{ flex: 1 }}
                       onKeyDown={(e) => e.key === "Enter" && puxarTicket()} />
                <button onClick={puxarTicket}>Puxar dados</button>
              </div>
            )}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Campo label="Marca"><input value={form.marca} onChange={set("marca")} /></Campo>
          <Campo label="Modelo"><input value={form.modelo} onChange={set("modelo")} /></Campo>
          <Campo label="Nº de série"><input value={form.numero_serie} onChange={set("numero_serie")} /></Campo>
          <Campo label="Estado / destino">
            <select value={form.estado_id} onChange={set("estado_id")}>
              <option value="">—</option>
              {estados.filter((e) => e.active).map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </Campo>
          <Campo label="Condição (como veio)">
            <input value={form.condicao} onChange={set("condicao")}
                   placeholder="Ex: liga mas não extruda" />
          </Campo>
          <Campo label="Local (se em uso)">
            <input value={form.local} onChange={set("local")} placeholder="Ex: Farm 2" />
          </Campo>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12 }}>Observação</label>
          <textarea rows={2} value={form.observacao} onChange={set("observacao")}
                    style={{ width: "100%", resize: "vertical" }} />
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

// Painel de detalhe: mudar estado, ver histórico, gerenciar peças canibalizadas.
function DetalheRetida({ retida, estados, todas, onClose, onMudou }) {
  const [historico, setHistorico] = useState([]);
  const [pecas, setPecas] = useState([]);
  const [pecasPadrao, setPecasPadrao] = useState([]);
  const [notas, setNotas] = useState([]);
  const [novaNota, setNovaNota] = useState("");
  const [novoEstado, setNovoEstado] = useState("");
  const [localMudanca, setLocalMudanca] = useState("");
  const [notaMudanca, setNotaMudanca] = useState("");
  // Destino da peça: tipo escolhido (texto | retida | ticket) + valor.
  const [novaPeca, setNovaPeca] = useState({ peca: "", destino_ticket_ref: "" });
  // Estado/local exibidos no cabeçalho — atualizam ao mudar, sem fechar o painel.
  const [estadoAtual, setEstadoAtual] = useState(retida.estado_nome);
  const [localAtual, setLocalAtual] = useState(retida.local);
  const toast = useToast();

  const carregar = useCallback(() => {
    api.historicoRetida(retida.id).then(setHistorico).catch(() => {});
    api.listPecasRetida(retida.id).then(setPecas).catch(() => {});
    api.listNotasRetida(retida.id).then(setNotas).catch(() => {});
  }, [retida.id]);
  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { api.listPecasPadrao().then(setPecasPadrao).catch(() => {}); }, []);

  async function mudar() {
    if (!novoEstado) { toast.error("Escolha o novo estado."); return; }
    try {
      await api.mudarEstadoRetida(retida.id, {
        estado_id: Number(novoEstado),
        local: localMudanca || null, nota: notaMudanca || null });
      toast.success("Estado atualizado.");
      // Atualiza o cabeçalho na hora (o objeto 'retida' é prop, não muda sozinho).
      const est = estados.find((e) => e.id === Number(novoEstado));
      if (est) setEstadoAtual(est.name);
      if (localMudanca) setLocalAtual(localMudanca);
      setNovoEstado(""); setLocalMudanca(""); setNotaMudanca("");
      carregar(); onMudou();
    } catch (e) { toast.error(String(e.message || e)); }
  }

  async function addPeca() {
    if (!novaPeca.peca.trim()) { toast.error("Informe a peça retirada."); return; }
    try {
      await api.createPecaRetida(retida.id, {
        peca: novaPeca.peca.trim(),
        destino_ticket_ref: novaPeca.destino_ticket_ref.trim() || null });
      setNovaPeca({ peca: "", destino_ticket_ref: "" });
      carregar();
      api.listPecasPadrao().then(setPecasPadrao).catch(() => {});
    } catch (e) { toast.error(String(e.message || e)); }
  }
  async function removerPeca(id) {
    try { await api.deletePecaRetida(id); carregar(); }
    catch (e) { toast.error(String(e.message || e)); }
  }

  async function addNota() {
    if (!novaNota.trim()) return;
    try { await api.createNotaRetida(retida.id, novaNota.trim()); setNovaNota(""); carregar(); }
    catch (e) { toast.error(String(e.message || e)); }
  }
  async function removerNota(id) {
    if (!confirm("Excluir esta nota?")) return;
    try { await api.deleteNotaRetida(id); carregar(); }
    catch (e) { toast.error(String(e.message || e)); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}
           style={{ width: 680, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontSize: 18, flex: 1 }}>
            {retida.marca} {retida.modelo} · SN {retida.numero_serie || "—"}
          </h2>
          <button onClick={onClose} style={{ padding: "4px 10px" }}>✕</button>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
          Origem: {retida.ticket_codigo || "Avulsa"} · Estado atual:{" "}
          <strong>{estadoAtual || "—"}</strong>
          {localAtual && ` · Local: ${localAtual}`}
        </div>

        {/* Mudar estado */}
        <div style={{ background: "var(--bg)", borderRadius: "var(--radius)",
                      padding: 12, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Mudar estado / destino</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select value={novoEstado} onChange={(e) => setNovoEstado(e.target.value)}
                    style={{ flex: "1 1 160px" }}>
              <option value="">Novo estado…</option>
              {estados.filter((e) => e.active).map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            <input value={localMudanca} onChange={(e) => setLocalMudanca(e.target.value)}
                   placeholder="Local (ex: Farm 2)" style={{ flex: "1 1 120px" }} />
            <input value={notaMudanca} onChange={(e) => setNotaMudanca(e.target.value)}
                   placeholder="Nota (opcional)" style={{ flex: "2 1 160px" }} />
            <button className="primary" onClick={mudar}>Registrar</button>
          </div>
        </div>

        {/* Peças canibalizadas */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Peças retiradas</div>
          {pecas.length > 0 && (
            <div style={{ display: "grid", gap: 4, marginBottom: 8 }}>
              {pecas.map((p) => (
                <div key={p.id} style={{ display: "flex", gap: 8, fontSize: 13,
                                         padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ flex: 1 }}>
                    <strong>{p.peca}</strong>
                    {p.destino_ticket_codigo && (
                      <span style={{ color: "var(--accent)", marginLeft: 6 }}>
                        → {p.destino_ticket_codigo}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: 8 }}>
                      {p.criado_em ? new Date(p.criado_em.replace(" ", "T")).toLocaleString("pt-BR") : ""}
                      {p.autor_nome && ` · ${p.autor_nome}`}
                    </span>
                  </span>
                  <button onClick={() => removerPeca(p.id)}
                          style={{ color: "var(--red)", padding: "0 6px" }}>✕</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <input value={novaPeca.peca}
                   onChange={(e) => setNovaPeca({ ...novaPeca, peca: e.target.value })}
                   list="lista-pecas-padrao" placeholder="Peça (busque ou digite uma nova)…"
                   style={{ flex: "2 1 160px" }} />
            <datalist id="lista-pecas-padrao">
              {pecasPadrao.filter((p) => p.active).map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
            <input value={novaPeca.destino_ticket_ref}
                   onChange={(e) => setNovaPeca({ ...novaPeca, destino_ticket_ref: e.target.value })}
                   placeholder="Ticket (opcional, ex: GAR-2026-0001)"
                   style={{ flex: "1 1 140px" }}
                   onKeyDown={(e) => e.key === "Enter" && addPeca()} />
            <button onClick={addPeca}>+ Peça</button>
          </div>
        </div>

        {/* Notas (diário) */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Notas / anotações</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <input value={novaNota} onChange={(e) => setNovaNota(e.target.value)}
                   placeholder="Registrar algo feito nesta impressora…" style={{ flex: 1 }}
                   onKeyDown={(e) => e.key === "Enter" && addNota()} />
            <button onClick={addNota}>+ Nota</button>
          </div>
          {notas.length > 0 && (
            <div style={{ display: "grid", gap: 6 }}>
              {notas.map((n) => (
                <div key={n.id} style={{ fontSize: 13, background: "var(--bg)",
                                         borderRadius: "var(--radius)", padding: "8px 10px",
                                         display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div>{n.texto}</div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                      {n.criado_em ? new Date(n.criado_em.replace(" ", "T")).toLocaleString("pt-BR") : ""}
                      {(n.autor_nome || n.autor_username) && ` · ${n.autor_nome || n.autor_username}`}
                    </div>
                  </div>
                  <button onClick={() => removerNota(n.id)}
                          style={{ color: "var(--red)", padding: "0 6px" }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Histórico */}
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Histórico de estados</div>
          {historico.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Sem histórico.</p>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {historico.map((h, i) => (
                <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)",
                                      borderLeft: "2px solid var(--border)", paddingLeft: 10 }}>
                  <strong style={{ color: "var(--text)" }}>
                    {h.estado_de ? `${h.estado_de} → ` : ""}{h.estado_para}
                  </strong>
                  {h.local && ` · ${h.local}`}
                  {h.nota && ` · ${h.nota}`}
                  <div style={{ fontSize: 11 }}>
                    {h.criado_em ? new Date(h.criado_em.replace(" ", "T")).toLocaleString("pt-BR") : ""}
                    {(h.autor_nome || h.autor_username) && ` · ${h.autor_nome || h.autor_username}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Modal para gerenciar os estados (admin).
function GerirEstados({ onClose }) {
  const [estados, setEstados] = useState([]);
  const [nome, setNome] = useState("");
  const toast = useToast();
  const carregar = useCallback(() => { api.listEstadosRetida().then(setEstados); }, []);
  useEffect(() => { carregar(); }, [carregar]);

  async function criar() {
    if (!nome.trim()) return;
    try { await api.createEstadoRetida({ name: nome.trim(), active: 1, ordem: estados.length });
      setNome(""); carregar(); }
    catch (e) { toast.error(String(e.message || e)); }
  }
  async function excluir(e) {
    if (!confirm(`Excluir o estado "${e.name}"?`)) return;
    try { await api.deleteEstadoRetida(e.id); carregar(); }
    catch (err) { toast.error(String(err.message || err)); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 420 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Estados / destinos</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input value={nome} onChange={(e) => setNome(e.target.value)}
                 placeholder="Novo estado" style={{ flex: 1 }}
                 onKeyDown={(e) => e.key === "Enter" && criar()} />
          <button className="primary" onClick={criar}>+ Add</button>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {estados.map((e) => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8,
                                     background: "var(--surface)", border: "1px solid var(--border)",
                                     borderRadius: "var(--radius)", padding: "6px 12px" }}>
              <span style={{ flex: 1 }}>{e.name}</span>
              <button onClick={() => excluir(e)}
                      style={{ padding: "2px 8px", color: "var(--red)" }}>🗑</button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
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
