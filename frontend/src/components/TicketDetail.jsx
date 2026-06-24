import { useState, useEffect } from "react";
import { api } from "../api/client";
import { contatoInfo, formatVencimento } from "../hooks/useSla";

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
    await api.moveTicket(ticket.id, {
      to_column_id: Number(toColumnId),
      new_order_index: 0,
    });
    onMoved();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "flex-start", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18 }}>{ticket.titulo}</h2>
          <div style={{ display: "flex", gap: 6 }}>
            {onEdit && <button onClick={() => onEdit(ticket)}>✎ Editar</button>}
            <button onClick={onClose} style={{ padding: "4px 10px" }}>✕</button>
          </div>
        </div>

        {/* Seletor de etapa — move o ticket sem precisar arrastar. */}
        <div style={{ marginBottom: 16 }}>
          <label>Etapa atual</label>
          <select value={ticket.column_id} onChange={(e) => mover(e.target.value)}>
            {columns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Todos os campos, sempre visíveis. Vazio = "—". */}
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr",
                     gap: "8px 16px", fontSize: 13, margin: 0 }}>
          <Item label="Impressora" value={`${ticket.marca} · ${ticket.modelo}`} />
          <Item label="Nº de série" value={ticket.serial_number} />
          <Item label="Fornecedor" value={ticket.fornecedor_nome} />
          <Item label="Tipo de defeito" value={ticket.defeito_nome} />
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
