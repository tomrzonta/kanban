import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import TicketCard from "./TicketCard";

// Coluna do Kanban. Altura cheia, título fixo, cards roláveis na vertical.
// SortableContext habilita a reordenação dos cards dentro desta coluna.
export default function Column({ column, tickets, onOpenTicket }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${column.id}`,
    data: { columnId: column.id, isColumn: true },
  });

  return (
    <div style={{ background: "var(--bg)", display: "flex",
                  flexDirection: "column", width: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "center", gap: 8, padding: "0 4px 10px",
                    flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden",
                       textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              title={column.name}>
          {column.name}
        </span>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)",
                       background: "var(--surface)", borderRadius: 10,
                       padding: "1px 8px", flexShrink: 0 }}>
          {tickets.length}
        </span>
      </div>

      <div ref={setNodeRef}
           style={{ flex: 1, minHeight: 60, overflowY: "auto",
                    borderRadius: "var(--radius)", padding: 4,
                    background: isOver ? "rgba(29,158,117,0.08)" : "transparent",
                    outline: isOver ? "2px dashed var(--accent)" : "none",
                    transition: "background 0.12s" }}>
        <SortableContext items={tickets.map((t) => t.id)}
                         strategy={verticalListSortingStrategy}>
          {tickets.map((t) => (
            <TicketCard key={t.id} ticket={t} column={column}
                        onOpen={onOpenTicket} />
          ))}
        </SortableContext>
        {tickets.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--text-tertiary)",
                        textAlign: "center", padding: "16px 0" }}>
            Solte aqui
          </div>
        )}
      </div>
    </div>
  );
}
