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
  const [prejuizoReal, setPrejuizoReal] = useState(
    ticket.prejuizo_real != null ? String(ticket.prejuizo_real) : "");
  const [erroMover, setErroMover] = useState(null);

  useEffect(() => {
    api.listDesfechos().then(setDesfechos).catch(() => setDesfechos([]));
  }, []);

  const desfechoSel = desfechos.find((d) => d.id === Number(desfechoId));
  const ehParcial = desfechoSel?.impacto === "parcial";

  async function registrarContatoCliente() {
    try {
      await api.registrarContato(ticket.id);
      onMoved(); // recarrega para refletir o cronômetro reiniciado
    } catch (e) {
      alert(String(e.message || e).replace(/^API \d+:\s*/, ""));
    }
  }

  async function salvarDesfecho() {
    try {
      await api.updateTicket(ticket.id, {
        desfecho_id: desfechoId ? Number(desfechoId) : null,
        prejuizo_real: ehParcial && prejuizoReal ? Number(prejuizoReal) : null,
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

        {/* Botão de registrar contato — reinicia o cronômetro do SLA da coluna. */}
        {c.precisaContato && !colunaAtual?.is_done && (
          <div style={{ marginBottom: 12 }}>
            <button onClick={registrarContatoCliente}
                    style={{ background: "#185fa5", color: "#fff" }}>
              📞 Registrar contato com o cliente (reinicia o prazo)
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
            {ehParcial && (
              <input type="number" step="0.01" min="0" placeholder="Valor perdido R$"
                     value={prejuizoReal} style={{ width: 150 }}
                     onChange={(e) => setPrejuizoReal(e.target.value)} />
            )}
            <button className="primary" onClick={salvarDesfecho}>Salvar desfecho</button>
          </div>
          {desfechoSel && (
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 6 }}>
              {desfechoSel.impacto === "sem_prejuizo" && "Este desfecho não conta prejuízo nas análises."}
              {desfechoSel.impacto === "total" && "Conta o valor cheio (custo × quantidade) como prejuízo."}
              {desfechoSel.impacto === "parcial" && "Conta como prejuízo o valor informado ao lado."}
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
