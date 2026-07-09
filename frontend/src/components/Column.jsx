import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import TicketCard from "./TicketCard";

// Paleta de cores para os cabeçalhos das colunas. A cor é estável por posição
// (order_index), então cada etapa tem sua identidade no quadro. Colunas com
// significado (concluído / recebido) usam cores semânticas fixas.
const PALETA = [
  "#2563c8", // azul (marca)
  "#7c3aed", // roxo
  "#0891b2", // ciano
  "#d4537e", // rosa
  "#c2620f", // laranja
  "#5b6675", // cinza-azulado
];

function corDaColuna(column) {
  if (column.is_done) return "#1d7a4d";       // concluído = verde
  if (column.is_received) return "#0891b2";    // recebido = ciano
  return PALETA[(column.order_index ?? 0) % PALETA.length];
}

// Coluna do Kanban. Altura cheia, título fixo, cards roláveis na vertical.
// SortableContext habilita a reordenação dos cards dentro desta coluna.
export default function Column({ column, tickets, onOpenTicket, alertas }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${column.id}`,
    data: { columnId: column.id, isColumn: true },
  });

  const cor = corDaColuna(column);

  return (
    <div style={{ background: "var(--bg)", display: "flex",
                  flexDirection: "column", width: "100%", minHeight: 0 }}>
      {/* Cabeçalho colorido: faixa com a cor da etapa. */}
      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "center", gap: 8, padding: "8px 12px",
                    marginBottom: 8, flexShrink: 0,
                    background: cor, borderRadius: "var(--radius)",
                    color: "#fff" }}>
        <span style={{ fontSize: 13, fontWeight: 700, overflow: "hidden",
                       textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              title={column.name}>
          {column.name}
        </span>
        {alertas && alertas.vencido > 0 && (
          <span title={`${alertas.vencido} com SLA vencido`}
                style={{ fontSize: 11, fontWeight: 700, background: "#e03e3e",
                         color: "#fff", borderRadius: 10, padding: "1px 7px",
                         flexShrink: 0 }}>
            ⏰ {alertas.vencido}
          </span>
        )}
        <span style={{ fontSize: 12, fontWeight: 600,
                       background: "rgba(255,255,255,0.25)", borderRadius: 10,
                       padding: "1px 8px", flexShrink: 0 }}>
          {tickets.length}
        </span>
      </div>

      <div ref={setNodeRef}
           style={{ flex: 1, minHeight: 60, overflowY: "auto",
                    borderRadius: "var(--radius)", padding: 4,
                    background: isOver ? "var(--accent-soft)" : "transparent",
                    outline: isOver ? `2px dashed ${cor}` : "none",
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
