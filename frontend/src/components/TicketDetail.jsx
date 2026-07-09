import { useState, useEffect } from "react";
import { api } from "../api/client";
import { contatoInfo, formatVencimento, garantiaInfo } from "../hooks/useSla";

// Modal de detalhes do ticket. Mostra TODOS os campos, sempre — os vazios
// aparecem como "—" para deixar claro que existem e estão em branco.
const ORIGEM_LABEL = {
  reclame_aqui: "Reclame Aqui",
  atendimento_interno: "Atendimento Interno",
  redes_sociais: "Redes Sociais",
  email: "E-mail",
  telefone: "Telefone",
};

export default function TicketDetail({ ticket, columns, onClose, onMoved, onEdit, isAdmin }) {
  if (!ticket) return null;

  // Anexos do ticket.
  const [anexos, setAnexos] = useState([]);
  const [enviando, setEnviando] = useState(false);

  // Desfecho do ticket (pode ser marcado a qualquer momento).
  const [desfechos, setDesfechos] = useState([]);
  const [desfechoId, setDesfechoId] = useState(ticket.desfecho_id || "");
  const [erroMover, setErroMover] = useState(null);

  // Timeline de eventos + comentário.
  const [eventos, setEventos] = useState([]);
  const [comentario, setComentario] = useState("");

  // Gastos discriminados do ticket (frete reverso, reenvio, peça...).
  const [gastos, setGastos] = useState([]);
  const [totalGastos, setTotalGastos] = useState(0);
  const [categoriasGasto, setCategoriasGasto] = useState([]);
  const [novoGasto, setNovoGasto] = useState({ categoria_id: "", valor: "", descricao: "" });

  const carregarGastos = () =>
    api.listGastos(ticket.id).then((r) => {
      setGastos(r.gastos); setTotalGastos(r.total);
    }).catch(() => {});

  useEffect(() => {
    api.listDesfechos().then(setDesfechos).catch(() => setDesfechos([]));
    api.listEventos(ticket.id).then(setEventos).catch(() => setEventos([]));
    api.listCategoriasGasto().then(setCategoriasGasto).catch(() => setCategoriasGasto([]));
    carregarGastos();
  }, [ticket.id]);

  async function adicionarGasto() {
    if (!novoGasto.valor || Number(novoGasto.valor) <= 0) {
      alert("Informe um valor de gasto válido."); return;
    }
    try {
      await api.createGasto(ticket.id, {
        categoria_id: novoGasto.categoria_id ? Number(novoGasto.categoria_id) : null,
        valor: Number(novoGasto.valor),
        descricao: novoGasto.descricao || null,
      });
      setNovoGasto({ categoria_id: "", valor: "", descricao: "" });
      carregarGastos();
    } catch (e) { alert(String(e.message || e).replace(/^API \d+:\s*/, "")); }
  }
  async function removerGasto(id) {
    try { await api.deleteGasto(id); carregarGastos(); }
    catch (e) { alert(String(e.message || e).replace(/^API \d+:\s*/, "")); }
  }

  async function enviarComentario() {
    if (!comentario.trim()) return;
    try {
      await api.addComentario(ticket.id, comentario.trim());
      setComentario("");
      setEventos(await api.listEventos(ticket.id));
    } catch (e) {
      alert(String(e.message || e).replace(/^API \d+:\s*/, ""));
    }
  }

  const desfechoSel = desfechos.find((d) => d.id === Number(desfechoId));
  const ehParcial = desfechoSel?.impacto === "parcial";

  async function registrarContatoCliente() {
    try {
      await api.registrarContato(ticket.id);
      // Fecha o detalhe: a flag de contato foi desligada e a lista recarrega,
      // então o aviso some do card. onMoved já dispara o recarregamento + close.
      onMoved();
      onClose?.();
    } catch (e) {
      alert(String(e.message || e).replace(/^API \d+:\s*/, ""));
    }
  }

  async function salvarDesfecho() {
    try {
      await api.updateTicket(ticket.id, {
        desfecho_id: desfechoId ? Number(desfechoId) : null,
        // O valor do parcial agora vem da soma dos gastos lançados, não de um
        // campo manual. prejuizo_real fica como fallback de tickets antigos.
      });
      onMoved();
    } catch (e) {
      alert(String(e.message || e).replace(/^API \d+:\s*/, ""));
    }
  }

  useEffect(() => {
    api.listAttachments(ticket.id).then(setAnexos).catch(() => setAnexos([]));
  }, [ticket.id]);

  async function enviarArquivo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnviando(true);
    try {
      await api.uploadAttachment(ticket.id, file);
      setAnexos(await api.listAttachments(ticket.id));
    } catch (err) {
      alert(String(err.message || err));
    } finally {
      setEnviando(false);
      e.target.value = ""; // permite reenviar o mesmo arquivo
    }
  }

  async function removerAnexo(att) {
    if (!confirm(`Remover o anexo "${att.original_name}"?`)) return;
    try {
      await api.deleteAttachment(att.id);
      setAnexos(await api.listAttachments(ticket.id));
    } catch (err) {
      alert(String(err.message || err).replace(/^API \d+:\s*/, ""));
    }
  }

  const prejuizo = Number(ticket.custo_unitario) * (ticket.quantidade || 1);
  const colunaAtual = columns.find((c) => c.id === ticket.column_id);
  const origem = ORIGEM_LABEL[ticket.origem] || ticket.origem;
  const criado = ticket.created_at
    ? new Date(ticket.created_at).toLocaleString("pt-BR")
    : "—";

  // Contato com cliente (flag manual OU coluna aguardando cliente).
  const c = contatoInfo(ticket, colunaAtual);
  const g = colunaAtual?.is_done ? { faixa: "normal" } : garantiaInfo(ticket);
  const venc = formatVencimento(c.vencimento);
  const prazoRetorno = !c.precisaContato
    ? "Não"
    : !venc
      ? "Sim, sem prazo definido"
      : c.atrasado
        ? `Venceu em ${venc} (atrasado ${Math.abs(Math.round(c.restante))}h)`
        : `Contatar até ${venc} (faltam ${Math.round(c.restante)}h)`;
  const fonteTxt = c.fonte === "coluna" ? " · prazo da coluna"
                 : c.fonte === "ticket" ? " · prazo do ticket" : "";

  async function mover(toColumnId) {
    if (Number(toColumnId) === ticket.column_id) return;
    setErroMover(null);
    try {
      await api.moveTicket(ticket.id, {
        to_column_id: Number(toColumnId),
        new_order_index: 0,
      });
      onMoved();
    } catch (e) {
      // O backend exige desfecho ao concluir; mostra o aviso de forma amigável.
      setErroMover(String(e.message || e).replace(/^API \d+:\s*/, ""));
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            {ticket.codigo_interno && (
              <div style={{ fontSize: 12, color: "var(--accent)",
                            fontWeight: 600, marginBottom: 2 }}>
                {ticket.codigo_interno}
              </div>
            )}
            <h2 style={{ fontSize: 18 }}>{ticket.titulo}</h2>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {onEdit && <button onClick={() => onEdit(ticket)}>✎ Editar</button>}
            <button onClick={onClose} style={{ padding: "4px 10px" }}>✕</button>
          </div>
        </div>

        {/* Alerta de garantia (30 dias desde a abertura). */}
        {g.dias != null && g.faixa !== "normal" && (
          <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 6,
                        fontSize: 13, fontWeight: 600,
                        background: g.faixa === "critico" ? "#fdecec" : "#fdf2d8",
                        color: g.faixa === "critico" ? "#a32d2d" : "#946800",
                        border: g.faixa === "critico" ? "1px solid #e03e3e" : "none" }}>
            {g.faixa === "critico"
              ? `⚠ CRÍTICO: ${g.dias} dias desde a abertura — prazo de garantia (30 dias) vencido. Reembolsar ou enviar nova impressora.`
              : `Atenção: ${g.dias} dias desde a abertura — faltam ${g.restante} dias para o limite de garantia.`}
          </div>
        )}

        {/* Botão: marca que o contato foi feito — desliga o aviso e volta ao
            SLA normal da coluna. Para agendar um próximo contato, use o prazo
            de retorno na edição do ticket. */}
        {c.precisaContato && !colunaAtual?.is_done && (
          <div style={{ marginBottom: 12 }}>
            <button onClick={registrarContatoCliente}
                    style={{ background: "#185fa5", color: "#fff" }}>
              📞 Marcar contato como feito
            </button>
          </div>
        )}

        {/* Seletor de etapa — move o ticket sem precisar arrastar. */}
        <div style={{ marginBottom: 12 }}>
          <label>Etapa atual</label>
          <select value={ticket.column_id} onChange={(e) => mover(e.target.value)}>
            {columns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {erroMover && (
            <div style={{ color: "var(--red)", fontSize: 12, marginTop: 6 }}>
              {erroMover}
            </div>
          )}
        </div>

        {/* Desfecho — define como o prejuízo conta nas análises. Obrigatório
            ao concluir; pode ser ajustado a qualquer momento. */}
        <div style={{ marginBottom: 16, padding: 12, background: "var(--bg)",
                      borderRadius: "var(--radius)" }}>
          <label>Desfecho</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center",
                        flexWrap: "wrap" }}>
            <select value={desfechoId} style={{ flex: 1, minWidth: 180 }}
                    onChange={(e) => setDesfechoId(e.target.value)}>
              <option value="">Não definido</option>
              {desfechos.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <button className="primary" onClick={salvarDesfecho}>Salvar desfecho</button>
          </div>
          {desfechoSel && (
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 6 }}>
              {desfechoSel.impacto === "sem_prejuizo" && "Este desfecho não conta prejuízo nas análises."}
              {desfechoSel.impacto === "total" && "Conta o valor cheio (custo × quantidade) como prejuízo."}
              {desfechoSel.impacto === "parcial" && "O prejuízo é a soma dos gastos lançados abaixo."}
              {desfechoSel.impacto === "informativo" && "Caso informativo: fica fora dos cálculos de dinheiro (conta como resolvido, sem prejuízo nem economia)."}
            </div>
          )}

          {/* Gastos discriminados: só fazem sentido no caso parcial. */}
          {ehParcial && (
            <div style={{ marginTop: 12, background: "var(--bg)",
                          borderRadius: "var(--radius)", padding: 12 }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>
                  Gastos do ticket
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>
                  Total: R$ {totalGastos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {gastos.length > 0 && (
                <div style={{ display: "grid", gap: 4, marginBottom: 8 }}>
                  {gastos.map((g) => (
                    <div key={g.id} style={{ display: "flex", alignItems: "center",
                                             gap: 8, fontSize: 13,
                                             padding: "4px 0",
                                             borderBottom: "1px solid var(--border)" }}>
                      <span style={{ flex: 1 }}>
                        {g.categoria_nome || "Sem categoria"}
                        {g.descricao && <span style={{ color: "var(--text-tertiary)" }}> · {g.descricao}</span>}
                      </span>
                      <span style={{ fontWeight: 600 }}>
                        R$ {Number(g.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                      <button onClick={() => removerGasto(g.id)}
                              style={{ padding: "0 6px", color: "var(--red)" }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Adicionar gasto */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <select value={novoGasto.categoria_id}
                        onChange={(e) => setNovoGasto({ ...novoGasto, categoria_id: e.target.value })}
                        style={{ flex: "1 1 130px", minWidth: 0 }}>
                  <option value="">Categoria…</option>
                  {categoriasGasto.filter((c) => c.active).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <input type="number" step="0.01" min="0" placeholder="Valor R$"
                       value={novoGasto.valor}
                       onChange={(e) => setNovoGasto({ ...novoGasto, valor: e.target.value })}
                       style={{ flex: "0 1 110px" }} />
                <input placeholder="Descrição (opcional)"
                       value={novoGasto.descricao}
                       onChange={(e) => setNovoGasto({ ...novoGasto, descricao: e.target.value })}
                       style={{ flex: "1 1 140px", minWidth: 0 }} />
                <button onClick={adicionarGasto}>+ Adicionar</button>
              </div>
            </div>
          )}
        </div>

        {/* Todos os campos, sempre visíveis. Vazio = "—". */}
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr",
                     gap: "8px 16px", fontSize: 13, margin: 0 }}>
          <Item label="Impressora" value={`${ticket.marca} · ${ticket.modelo}`} />
          <Item label="Nº de série" value={ticket.serial_number} />
          <Item label="Fornecedor" value={ticket.fornecedor_nome} />
          <Item label="Tipo de defeito" value={ticket.defeito_nome} />
          <Item label="Responsável"
                value={ticket.responsavel_nome || ticket.responsavel_username} />
          <Item label="Desfecho" value={ticket.desfecho_nome} />
          <Item label="Quantidade" value={ticket.quantidade} />
          <Item label="Custo unitário"
                value={`R$ ${Number(ticket.custo_unitario).toFixed(2)}`} />
          <Item label="Prejuízo" value={`R$ ${prejuizo.toFixed(2)}`} danger />
          <Item label="Origem" value={origem} />
          <Item label="Nota fiscal" value={ticket.numero_nf} />
          <Item label="Rastreio" value={ticket.codigo_rastreio} />
          <Item label="Ticket suporte (Bambu/importadora)" value={ticket.ticket_suporte_externo} />
          <Item label="Faixa de prazo" value={{"1_7":"1-7 dias","8_90":"8-90 dias","91_mais":"91+ dias"}[ticket.faixa_prazo]} />
          <Item label="Etapa" value={colunaAtual?.name} />
          <Item label="Precisa contato"
                value={c.precisaContato
                  ? (ticket.requer_contato_cliente ? "Sim (marcado)" : "Sim (coluna)")
                  : "Não"}
                danger={c.precisaContato} />
          <Item label="Prazo de contato" value={`${prazoRetorno}${fonteTxt}`}
                danger={c.atrasado} />
          <Item label="Criado em" value={criado} />
          {g.dias != null && (
            <Item label="Dias desde abertura"
                  value={`${g.dias} ${g.dias === 1 ? "dia" : "dias"}`}
                  danger={g.faixa === "critico"} />
          )}
        </dl>

        <div style={{ marginTop: 16 }}>
          <label>Problema</label>
          <p style={{ margin: 0, fontSize: 13, whiteSpace: "pre-wrap" }}>
            {ticket.problema || "—"}
          </p>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Notas do atendimento</label>
          <p style={{ margin: 0, fontSize: 13, whiteSpace: "pre-wrap",
                      color: ticket.notas ? "var(--text)" : "var(--text-tertiary)" }}>
            {ticket.notas || "—"}
          </p>
        </div>

        {/* Anexos: NF, fotos do defeito, etc. */}
        <div style={{ marginTop: 16, paddingTop: 16,
                      borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between",
                        alignItems: "center", marginBottom: 8 }}>
            <label style={{ margin: 0 }}>Anexos</label>
            <label className="primary" style={{
              display: "inline-block", cursor: enviando ? "default" : "pointer",
              fontSize: 12, padding: "5px 12px", borderRadius: "var(--radius)",
              background: "var(--accent)", color: "#fff", opacity: enviando ? 0.6 : 1 }}>
              {enviando ? "Enviando…" : "+ Adicionar arquivo"}
              <input type="file" hidden disabled={enviando}
                     onChange={enviarArquivo} style={{ display: "none" }} />
            </label>
          </div>

          {anexos.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: 0 }}>
              Nenhum anexo.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {anexos.map((a) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center",
                              gap: 8, fontSize: 13, background: "var(--bg)",
                              borderRadius: "var(--radius)", padding: "6px 10px" }}>
                  <span style={{ flex: 1, overflow: "hidden",
                                 textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    📎 {a.original_name}
                  </span>
                  <button onClick={() => api.downloadAttachment(a.id, a.original_name)}
                          style={{ padding: "2px 10px" }}>Baixar</button>
                  {isAdmin && (
                    <button onClick={() => removerAnexo(a)} title="Remover"
                            style={{ padding: "2px 8px", color: "var(--red)" }}>🗑</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timeline: comentários + eventos automáticos */}
        <div style={{ marginTop: 16, paddingTop: 16,
                      borderTop: "1px solid var(--border)" }}>
          <label>Linha do tempo</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input value={comentario} onChange={(e) => setComentario(e.target.value)}
                   onKeyDown={(e) => e.key === "Enter" && enviarComentario()}
                   placeholder="Escreva um comentário…" style={{ flex: 1 }} />
            <button className="primary" onClick={enviarComentario}>Comentar</button>
          </div>

          {eventos.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: 0 }}>
              Nenhuma atividade ainda.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {eventos.map((e) => (
                <EventoLinha key={e.id} ev={e} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Uma linha da timeline. Ícone e cor variam por tipo de evento.
function EventoLinha({ ev }) {
  const meta = {
    comentario: { icone: "💬", cor: "var(--text)" },
    movimento: { icone: "➡", cor: "var(--text-secondary)" },
    recebimento: { icone: "📦", cor: "var(--text-secondary)" },
    desfecho: { icone: "✓", cor: "var(--text-secondary)" },
    contato: { icone: "📞", cor: "var(--text-secondary)" },
  }[ev.tipo] || { icone: "•", cor: "var(--text-secondary)" };

  const quando = ev.criado_em
    ? new Date(ev.criado_em).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "";
  const ehComentario = ev.tipo === "comentario";

  return (
    <div style={{ display: "flex", gap: 8, fontSize: 13,
                  background: ehComentario ? "var(--bg)" : "transparent",
                  borderRadius: "var(--radius)",
                  padding: ehComentario ? "8px 10px" : "2px 0" }}>
      <span>{meta.icone}</span>
      <div style={{ flex: 1 }}>
        <div style={{ color: meta.cor }}>{ev.texto}</div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
          {ev.autor || "Sistema"} · {quando}
        </div>
      </div>
    </div>
  );
}

// Mostra "—" quando o valor é vazio/nulo, em cor suave, para nunca "sumir".
function Item({ label, value, danger }) {
  const vazio = value === null || value === undefined || value === "";
  return (
    <>
      <dt style={{ color: "var(--text-secondary)" }}>{label}</dt>
      <dd style={{ margin: 0, fontWeight: 500,
                   color: vazio ? "var(--text-tertiary)"
                                : danger ? "var(--red)" : "var(--text)" }}>
        {vazio ? "—" : value}
      </dd>
    </>
  );
}
