import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import TicketDetail from "../components/TicketDetail";

// Aba de Recebimentos (RMA): registra a chegada de impressoras com defeito,
// vinculadas a um ticket em aberto. Ao registrar, o ticket pode mover para a
// coluna marcada como "destino ao receber".
export default function Recebimentos({ onReter }) {
  const [itens, setItens] = useState([]);
  const [condicoes, setCondicoes] = useState([]);
  const [erro, setErro] = useState(null);
  const [msg, setMsg] = useState(null);

  // Busca de ticket por código/título: termo digitado, sugestões e o escolhido.
  const [buscaTicket, setBuscaTicket] = useState("");
  const [sugestoes, setSugestoes] = useState([]);
  const [ticketSel, setTicketSel] = useState(null);

  // Para abrir o detalhe completo ao clicar numa linha da lista.
  const [ticketDetalhe, setTicketDetalhe] = useState(null);
  const [columns, setColumns] = useState([]);

  const vazio = {
    ticket_id: "", data_recebimento: new Date().toISOString().slice(0, 10),
    numero_nf: "", quantidade: 1, condicao: "", observacao: "",
  };
  const [form, setForm] = useState(vazio);
  const [fotos, setFotos] = useState([]);          // fotos de unboxing a anexar
  const [enviandoFotos, setEnviandoFotos] = useState(false);
  // Checklist do modelo do ticket: componentes esperados, estados possíveis e
  // os valores preenchidos ({ [nome]: { estado, comentario } }).
  const [checklistComp, setChecklistComp] = useState([]);
  const [checklistEstados, setChecklistEstados] = useState([]);
  const [checklistVals, setChecklistVals] = useState({});

  const carregar = useCallback(() => {
    api.listRecebimentos().then(setItens);
  }, []);

  useEffect(() => {
    carregar();
    api.recebimentoCondicoes().then(setCondicoes);
    api.listColumns().then(setColumns);
    api.listChecklistEstados().then(setChecklistEstados).catch(() => {});
  }, [carregar]);

  // Monta o objeto do ticket (a partir dos aliases vindos do recebimento) e
  // abre o modal de detalhes completo.
  function abrirTicket(r) {
    setTicketDetalhe({
      id: r.ticket_id,
      codigo_interno: r.codigo_interno,
      titulo: r.titulo,
      problema: r.problema,
      origem: r.origem,
      numero_nf: r.ticket_nf,
      codigo_rastreio: r.codigo_rastreio,
      notas: r.notas,
      serial_number: r.serial_number,
      requer_contato_cliente: r.requer_contato_cliente,
      retorno_horas: r.retorno_horas,
      retorno_definido_em: r.retorno_definido_em,
      printer_model_id: r.printer_model_id,
      quantidade: r.ticket_qtd,
      custo_unitario: r.custo_unitario,
      supplier_id: r.supplier_id,
      defect_type_id: r.defect_type_id,
      responsavel_id: r.responsavel_id,
      column_id: r.column_id,
      order_index: r.order_index,
      created_at: r.created_at,
      last_moved_at: r.last_moved_at,
      marca: r.marca,
      fabricante: r.fabricante,
      modelo: r.modelo,
      fornecedor_nome: r.fornecedor_nome,
      defeito_nome: r.defeito_nome,
      responsavel_nome: r.responsavel_nome,
      responsavel_username: r.responsavel_username,
    });
  }

  // Busca tickets conforme o usuário digita (com pequeno atraso para não
  // disparar a cada tecla). Só busca a partir de 1 caractere.
  useEffect(() => {
    if (ticketSel) return; // já escolheu, não fica buscando
    const termo = buscaTicket.trim();
    if (!termo) { setSugestoes([]); return; }
    const timer = setTimeout(() => {
      api.ticketsAbertos(termo).then(setSugestoes).catch(() => setSugestoes([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [buscaTicket, ticketSel]);

  function escolherTicket(t) {
    setTicketSel(t);
    setForm((f) => ({ ...f, ticket_id: t.id }));
    setSugestoes([]);
    setBuscaTicket("");
    // Carrega o checklist do modelo do ticket.
    setChecklistComp([]); setChecklistVals({});
    if (t.printer_model_id) {
      api.checklistDoModelo(t.printer_model_id).then((rows) => {
        setChecklistComp(rows);
        const init = {};
        rows.forEach((r) => { init[r.componente_nome] = { estado: "", comentario: "" }; });
        setChecklistVals(init);
      }).catch(() => {});
    }
  }

  function limparTicket() {
    setTicketSel(null);
    setForm((f) => ({ ...f, ticket_id: "" }));
    setChecklistComp([]); setChecklistVals({});
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function registrar() {
    setErro(null); setMsg(null);
    if (!form.ticket_id) { setErro("Selecione o ticket vinculado."); return; }
    if (!form.condicao) { setErro("Selecione a condição do item."); return; }
    // Checklist obrigatório: o modelo precisa ter checklist e todos os estados preenchidos.
    if (checklistComp.length === 0) {
      setErro("O modelo desta impressora não tem checklist cadastrado. "
        + "Cadastre no Catálogo → Checklist antes de receber.");
      return;
    }
    for (const c of checklistComp) {
      if (!checklistVals[c.componente_nome]?.estado) {
        setErro(`Preencha o estado do componente "${c.componente_nome}" no checklist.`);
        return;
      }
    }
    const checklist = checklistComp.map((c) => ({
      componente_nome: c.componente_nome,
      estado: checklistVals[c.componente_nome].estado,
      comentario: checklistVals[c.componente_nome].comentario || null,
    }));
    try {
      const ticketId = form.ticket_id;
      const r = await api.createRecebimento({
        ...form,
        quantidade: Number(form.quantidade),
        numero_nf: form.numero_nf || null,
        observacao: form.observacao || null,
        checklist,
      });

      // Sobe as fotos de unboxing como anexos do ticket (se houver).
      let fotosMsg = "";
      if (fotos.length > 0) {
        setEnviandoFotos(true);
        let ok = 0, falhas = 0;
        for (const f of fotos) {
          try { await api.uploadAttachment(ticketId, f); ok++; }
          catch { falhas++; }
        }
        setEnviandoFotos(false);
        fotosMsg = ` ${ok} foto(s) anexada(s)`
          + (falhas ? `, ${falhas} falharam` : "") + ".";
      }

      setForm(vazio);
      setFotos([]);
      setTicketSel(null);
      setChecklistComp([]); setChecklistVals({});
      setBuscaTicket("");
      carregar();
      // Feedback: avisa se moveu o ticket ou se faltou marcar a coluna.
      if (r.aviso) setMsg(r.aviso + fotosMsg);
      else if (r.moveu_ticket) setMsg(`Recebimento registrado. Ticket movido para "${r.coluna_destino}".` + fotosMsg);
      else setMsg("Recebimento registrado." + fotosMsg);
    } catch (e) {
      setEnviandoFotos(false);
      setErro(String(e.message || e).replace(/^API \d+:\s*/, ""));
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Formulário */}
      <section style={{ background: "var(--surface)", border: "1px solid var(--border)",
                        borderRadius: "var(--radius-lg)", padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, marginBottom: 16 }}>Registrar recebimento (RMA)</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1", position: "relative" }}>
            <label>Ticket vinculado *</label>

            {ticketSel ? (
              // Ticket já escolhido: mostra qual é, com opção de trocar.
              <div style={{ display: "flex", alignItems: "center", gap: 10,
                            background: "var(--bg)", border: "1px solid var(--border)",
                            borderRadius: "var(--radius)", padding: "8px 12px" }}>
                <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                  {ticketSel.codigo_interno || "—"}
                </span>
                <span style={{ flex: 1 }}>
                  {ticketSel.titulo}
                  <span style={{ color: "var(--text-tertiary)", marginLeft: 6 }}>
                    ({ticketSel.fabricante} {ticketSel.modelo})
                  </span>
                </span>
                <button type="button" onClick={limparTicket}
                        style={{ padding: "2px 10px" }}>Trocar</button>
              </div>
            ) : (
              // Campo de busca: digita código/título e escolhe da lista.
              <>
                <input value={buscaTicket}
                       onChange={(e) => setBuscaTicket(e.target.value)}
                       placeholder="Digite o código (ex: GAR-2026-0042), título ou modelo…" />
                {sugestoes.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0,
                                zIndex: 10, background: "var(--surface)",
                                border: "1px solid var(--border)",
                                borderRadius: "var(--radius)", marginTop: 4,
                                maxHeight: 240, overflowY: "auto",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                    {sugestoes.map((t) => (
                      <div key={t.id} onClick={() => escolherTicket(t)}
                           style={{ padding: "8px 12px", cursor: "pointer",
                                    borderBottom: "1px solid var(--border)" }}
                           onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg)"}
                           onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                        <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                          {t.codigo_interno || "—"}
                        </span>
                        <span style={{ marginLeft: 8 }}>{t.titulo}</span>
                        <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                          {t.fabricante} {t.modelo}
                          {t.serial_number ? ` · SN ${t.serial_number}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {buscaTicket.trim() && sugestoes.length === 0 && (
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)",
                                marginTop: 4 }}>
                    Nenhum ticket em aberto encontrado para "{buscaTicket}".
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <label>Data de recebimento</label>
            <input type="date" value={form.data_recebimento}
                   onChange={set("data_recebimento")} />
          </div>
          <div>
            <label>Nota fiscal</label>
            <input value={form.numero_nf} onChange={set("numero_nf")} />
          </div>
          <div>
            <label>Quantidade</label>
            <input type="number" min="1" value={form.quantidade}
                   onChange={set("quantidade")} />
          </div>
          <div>
            <label>Condição *</label>
            <select value={form.condicao} onChange={set("condicao")}>
              <option value="">Selecione…</option>
              {condicoes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label>Observação</label>
            <textarea rows={2} value={form.observacao} onChange={set("observacao")}
                      style={{ width: "100%", resize: "vertical" }} />
          </div>

          {ticketSel && (
            <div style={{ gridColumn: "1 / -1" }}>
              <label>Checklist de recebimento *</label>
              {checklistComp.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--red)",
                              background: "var(--surface)", border: "1px solid var(--red)",
                              borderRadius: "var(--radius)", padding: "10px 12px", marginTop: 4 }}>
                  ⚠ O modelo desta impressora não tem checklist cadastrado.
                  Cadastre em <strong>Catálogo → Checklist</strong> antes de receber.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {checklistComp.map((c) => {
                    const v = checklistVals[c.componente_nome] || { estado: "", comentario: "" };
                    return (
                      <div key={c.id} style={{ display: "flex", gap: 8, flexWrap: "wrap",
                                               alignItems: "center", background: "var(--surface)",
                                               border: "1px solid var(--border)",
                                               borderRadius: "var(--radius)", padding: "8px 10px" }}>
                        <span style={{ flex: "1 1 140px", fontWeight: 500 }}>{c.componente_nome}</span>
                        <select value={v.estado}
                                onChange={(e) => setChecklistVals((s) => ({ ...s,
                                  [c.componente_nome]: { ...v, estado: e.target.value } }))}
                                style={{ flex: "0 1 160px",
                                         borderColor: v.estado ? "var(--border)" : "var(--red)" }}>
                          <option value="">Estado…</option>
                          {checklistEstados.map((e) => <option key={e} value={e}>{e}</option>)}
                        </select>
                        <input value={v.comentario}
                               onChange={(e) => setChecklistVals((s) => ({ ...s,
                                 [c.componente_nome]: { ...v, comentario: e.target.value } }))}
                               placeholder="Comentário (opcional)" style={{ flex: "2 1 180px" }} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div style={{ gridColumn: "1 / -1" }}>
            <label>Fotos do unboxing (opcional)</label>
            <input type="file" accept="image/*" multiple
                   onChange={(e) => setFotos([...fotos, ...Array.from(e.target.files)])}
                   style={{ display: "block", marginTop: 4 }} />
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>
              Registre como o equipamento chegou. As fotos ficam anexadas ao ticket.
            </div>
            {fotos.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {fotos.map((f, i) => (
                  <span key={i} style={{ fontSize: 12, background: "var(--bg)",
                                         borderRadius: 6, padding: "3px 8px",
                                         display: "inline-flex", alignItems: "center", gap: 6 }}>
                    🖼 {f.name}
                    <button type="button"
                            onClick={() => setFotos(fotos.filter((_, j) => j !== i))}
                            style={{ padding: "0 4px", color: "var(--red)",
                                     background: "none", border: "none", cursor: "pointer" }}>
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {erro && <div style={{ color: "var(--red)", fontSize: 13, marginTop: 12 }}>{erro}</div>}
        {msg && <div style={{ color: "var(--accent)", fontSize: 13, marginTop: 12 }}>{msg}</div>}

        <div style={{ marginTop: 16 }}>
          <button className="primary" onClick={registrar} disabled={enviandoFotos}>
            {enviandoFotos ? "Enviando fotos…" : "+ Registrar recebimento"}
          </button>
        </div>
      </section>

      {/* Histórico de recebimentos */}
      <section style={{ background: "var(--surface)", border: "1px solid var(--border)",
                        borderRadius: "var(--radius-lg)", padding: 20 }}>
        <h3 style={{ fontSize: 15, marginBottom: 16 }}>Recebimentos registrados ({itens.length})</h3>
        {itens.length === 0 ? (
          <p style={{ color: "var(--text-tertiary)" }}>Nenhum recebimento ainda.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: "var(--text-secondary)", textAlign: "left" }}>
                <th style={{ padding: "8px 6px", fontWeight: 500 }}>Data</th>
                <th style={{ padding: "8px 6px", fontWeight: 500 }}>Ticket</th>
                <th style={{ padding: "8px 6px", fontWeight: 500 }}>Impressora</th>
                <th style={{ padding: "8px 6px", fontWeight: 500 }}>Qtd</th>
                <th style={{ padding: "8px 6px", fontWeight: 500 }}>Condição</th>
                <th style={{ padding: "8px 6px", fontWeight: 500 }}>NF</th>
                <th style={{ padding: "8px 6px", fontWeight: 500 }}></th>
              </tr>
            </thead>
            <tbody>
              {itens.map((r) => (
                <tr key={r.id} onClick={() => abrirTicket(r)}
                    style={{ borderTop: "1px solid var(--border)", cursor: "pointer" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "8px 6px" }}>
                    {new Date(r.data_recebimento).toLocaleDateString("pt-BR")}
                  </td>
                  <td style={{ padding: "8px 6px" }}>
                    <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                      {r.codigo_interno || "—"}
                    </span>
                    <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                      {r.titulo}
                    </div>
                  </td>
                  <td style={{ padding: "8px 6px", color: "var(--text-secondary)" }}>
                    {r.fabricante} {r.modelo}
                  </td>
                  <td style={{ padding: "8px 6px" }}>{r.quantidade}</td>
                  <td style={{ padding: "8px 6px" }}>
                    {r.condicao}
                    {r.observacao && (
                      <div style={{ color: "var(--text-tertiary)", fontSize: 12 }}>
                        {r.observacao}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "8px 6px", color: "var(--text-secondary)" }}>
                    {r.numero_nf || "—"}
                  </td>
                  <td style={{ padding: "8px 6px" }} onClick={(e) => e.stopPropagation()}>
                    {onReter && r.codigo_interno && (
                      <button onClick={() => onReter(r.codigo_interno)}
                              title="Cadastrar esta impressora como retida"
                              style={{ padding: "2px 10px", whiteSpace: "nowrap" }}>
                        Reter
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Detalhe completo do ticket (modo leitura, sem editar). */}
      {ticketDetalhe && (
        <TicketDetail ticket={ticketDetalhe} columns={columns}
                      onClose={() => setTicketDetalhe(null)}
                      onMoved={() => setTicketDetalhe(null)} />
      )}
    </div>
  );
}
