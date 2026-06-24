import { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { slaColor, slaStatus, contatoInfo, formatVencimento } from "../hooks/useSla";

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

  const c = contatoInfo(ticket, column);
  const vencimento = formatVencimento(c.vencimento);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: "flex", gap: 8, padding: "10px 12px", marginBottom: 8,
    background: "var(--surface)", border: "1px solid var(--border)",
    borderLeft: `4px solid ${slaColor(ticket, column)}`,
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
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
          {ticket.titulo}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
          {ticket.marca} · {ticket.modelo}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
          {ticket.defeito_nome || "Sem defeito definido"}
        </div>

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
