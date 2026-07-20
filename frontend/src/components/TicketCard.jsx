import { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { slaColor, slaStatus, contatoInfo, formatVencimento, garantiaInfo, GARANTIA_COLORS } from "../hooks/useSla";

// Rótulos curtos das faixas de prazo (exibidos no card).
const FAIXA_LABEL = { "1_7": "1-7 dias", "8_90": "8-90 dias", "91_mais": "91+ dias" };

const STATUS_BADGE = {
  risco: { txt: "SLA em risco", bg: "#fdf0d5", fg: "#854f0b" },
  estourado: { txt: "SLA estourado", bg: "#fceaea", fg: "#a32d2d" },
};

export default function TicketCard({ ticket, column, onOpen }) {
  // useSortable: além de arrastar, calcula a posição de destino entre os cards
  // (reordenação dentro da coluna) e anima a troca.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ticket.id, data: { columnId: column.id } });

  // Recalcula a cada minuto para o contador andar sem recarregar a página.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const status = slaStatus(ticket, column);
  const badge = STATUS_BADGE[status];
  const horas = Math.round((Date.now() - new Date(ticket.last_moved_at)) / 3.6e6);

  // Alerta de logística: após 7 dias desde a abertura, se a análise remota não
  // resolveu (impressora ainda não recebida) e o ticket não está concluído,
  // sinaliza que é hora de solicitar o envio à sede — antes que o transporte
  // coma o prazo legal de 30 dias.
  const DIAS_SOLICITAR_ENVIO = 7;
  const diasAbertura = ticket.created_at
    ? Math.floor((Date.now() - new Date(ticket.created_at)) / 86400000)
    : 0;
  const solicitarEnvio = !column.is_done && !ticket.tem_recebimento
    && diasAbertura >= DIAS_SOLICITAR_ENVIO;

  const c = contatoInfo(ticket, column);
  const vencimento = formatVencimento(c.vencimento);

  // Prazo de garantia (30 dias desde a abertura). Não se aplica a concluídos.
  const g = column.is_done ? { faixa: "normal" } : garantiaInfo(ticket);
  const critico = g.faixa === "critico";

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: "flex", gap: 8, padding: "10px 12px", marginBottom: 8,
    background: critico ? "rgba(224, 62, 62, 0.12)" : "var(--surface)",
    border: critico ? "1px solid #e03e3e" : "1px solid var(--border)",
    borderLeft: `4px solid ${critico ? "#e03e3e" : slaColor(ticket, column)}`,
    borderRadius: "0 var(--radius) var(--radius) 0",
    opacity: isDragging ? 0.4 : column.is_done ? 0.85 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Punho de arraste — só aqui responde ao drag, o resto abre o detalhe. */}
      <div {...listeners} {...attributes} title="Arraste para mover ou reordenar"
           style={{ cursor: "grab", color: "var(--text-tertiary)", fontSize: 16,
                    lineHeight: 1, userSelect: "none", touchAction: "none" }}>
        ⠿
      </div>

      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => onOpen(ticket)}>
        {!column.is_done && (() => {
          // Status de SLA da etapa, sempre visível: no prazo / perto / vencido.
          const st = slaStatus(ticket, column);
          const rotulo = { ok: "No prazo", warn: "Prazo próximo", late: "SLA vencido" }[st];
          if (!rotulo) return null;
          const cores = {
            ok: { bg: "#e8f5ee", fg: "#1d7a4d" },
            warn: { bg: "#fdf2d8", fg: "#946800" },
            late: { bg: "#fdecec", fg: "#a32d2d" },
          }[st];
          return (
            <div style={{ display: "inline-block", fontSize: 10, fontWeight: 600,
                          background: cores.bg, color: cores.fg,
                          borderRadius: 4, padding: "1px 7px", marginBottom: 4 }}>
              {st === "late" ? "⏰ " : ""}{rotulo}
            </div>
          );
        })()}
        {critico && (
          <div style={{ fontSize: 11, fontWeight: 700, color: "#fff",
                        background: "#e03e3e", borderRadius: 4, padding: "2px 8px",
                        display: "inline-block", marginBottom: 4 }}>
            ⚠ CRÍTICO · {g.dias} dias (garantia vencida)
          </div>
        )}
        {!critico && g.faixa === "atencao" && (
          <div style={{ fontSize: 10, fontWeight: 600, color: "#946800",
                        background: "#fdf2d8", borderRadius: 4, padding: "1px 7px",
                        display: "inline-block", marginBottom: 4 }}>
            {g.dias} dias · garantia em {g.restante}d
          </div>
        )}
        {ticket.codigo_interno && (
          <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 600,
                        letterSpacing: 0.3, marginBottom: 2 }}>
            {ticket.codigo_interno}
          </div>
        )}
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
          {ticket.titulo}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
          {ticket.marca} · {ticket.modelo}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
          {ticket.defeito_nome || "Sem defeito definido"}
        </div>
        {(ticket.responsavel_nome || ticket.responsavel_username) && (
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
            👤 {ticket.responsavel_nome || ticket.responsavel_username}
          </div>
        )}
        {ticket.ticket_suporte_externo && (
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
            🎫 Suporte: {ticket.ticket_suporte_externo}
          </div>
        )}
        {ticket.faixa_prazo && FAIXA_LABEL[ticket.faixa_prazo] && (
          <div style={{ marginTop: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600,
                           background: "var(--accent-soft)", color: "var(--accent)",
                           border: "1px solid var(--accent)",
                           borderRadius: 10, padding: "2px 10px",
                           display: "inline-block" }}>
              📅 {FAIXA_LABEL[ticket.faixa_prazo]}
            </span>
          </div>
        )}
        {!column.is_done && g.dias != null && g.faixa === "normal" && (
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
            🗓 {g.dias} {g.dias === 1 ? "dia" : "dias"} desde a abertura
          </div>
        )}

        {solicitarEnvio && (
          <div style={{ marginTop: 8 }}>
            <span title={`${diasAbertura} dias desde a abertura sem receber a impressora`}
                  style={{ fontSize: 11, fontWeight: 700,
                           background: "#fceaea", color: "#a32d2d",
                           border: "1px solid #e03e3e",
                           borderRadius: 10, padding: "2px 10px",
                           display: "inline-block" }}>
              📦 Solicitar envio
            </span>
          </div>
        )}

        {badge && (
          <span className="pill" style={{ background: badge.bg, color: badge.fg,
                                          marginTop: 8 }}>
            {badge.txt}
          </span>
        )}

        {c.precisaContato && !column.is_done ? (
          <div style={{ marginTop: 8, padding: "6px 8px", borderRadius: 6,
                        fontSize: 11,
                        background: c.atrasado ? "#fceaea" : "#e6f1fb",
                        color: c.atrasado ? "#a32d2d" : "#185fa5" }}>
            <div style={{ fontWeight: 600 }}>
              📞 {c.atrasado ? "Contato ATRASADO" : "Contatar cliente"}
            </div>
            {vencimento ? (
              <div style={{ marginTop: 2 }}>
                {c.atrasado ? "Venceu" : "Até"} {vencimento}
                {c.restante != null && (
                  <> · {c.atrasado
                    ? `há ${Math.abs(Math.round(c.restante))}h`
                    : `faltam ${Math.round(c.restante)}h`}</>
                )}
                {c.fonte === "coluna" && (
                  <span style={{ color: "var(--text-tertiary)" }}> (SLA da coluna)</span>
                )}
              </div>
            ) : (
              <div style={{ marginTop: 2 }}>Sem prazo definido</div>
            )}
          </div>
        ) : null}

        <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-tertiary)" }}>
          ⏱ {horas}h nesta etapa · {ticket.origem}
        </div>
      </div>
    </div>
  );
}
