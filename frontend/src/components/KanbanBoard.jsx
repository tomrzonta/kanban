import { useState, useEffect } from "react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { api } from "../api/client";
import Column from "./Column";
import TicketForm from "./TicketForm";
import TicketDetail from "./TicketDetail";
import ColumnManager from "./ColumnManager";

// Verifica se o ticket bate com o texto buscado (em vários campos).
// Busca vazia mostra tudo. Comparação sem distinção de maiúsc/minúsc.
function filtraBusca(t, busca) {
  const q = busca.trim().toLowerCase();
  if (!q) return true;
  const campos = [t.codigo_interno, t.titulo, t.serial_number, t.numero_nf,
                  t.marca, t.modelo, t.fornecedor_nome, t.defeito_nome,
                  t.responsavel_nome, t.responsavel_username];
  return campos.some((c) => (c || "").toString().toLowerCase().includes(q));
}

// Oculta do quadro os concluídos há mais de 48h (continuam no banco e na aba
// Concluídos). Conta a partir de last_moved_at (entrada na coluna de conclusão).
const HORAS_VISIVEL_CONCLUIDO = 48;
function visivelNoQuadro(t, column) {
  if (!column?.is_done) return true;
  const horas = (Date.now() - new Date(t.last_moved_at)) / 3.6e6;
  return horas < HORAS_VISIVEL_CONCLUIDO;
}

export default function KanbanBoard({ isAdmin }) {
  const [columns, setColumns] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [showForm, setShowForm] = useState(false);    // criar ticket
  const [editing, setEditing] = useState(null);       // ticket em edição
  const [selected, setSelected] = useState(null);     // ticket no modal de detalhe
  const [manageCols, setManageCols] = useState(false); // gerenciar colunas
  const [busca, setBusca] = useState("");               // texto de busca no quadro

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  async function carregar() {
    const [cols, tks] = await Promise.all([api.listColumns(), api.listTickets()]);
    setColumns(cols);
    setTickets(tks);
    return tks;
  }

  async function aposEditar() {
    const editadoId = editing?.id;
    setEditing(null);
    const tks = await carregar();
    const atualizado = tks.find((t) => t.id === editadoId);
    if (atualizado) setSelected(atualizado);
  }

  useEffect(() => { carregar(); }, []);

  // Resolve para onde o card foi solto. `over` pode ser:
  //  - outro CARD (over.id é um ticket): destino = a coluna desse card, na
  //    posição desse card.
  //  - a ÁREA DA COLUNA (over.data.current.isColumn): destino = essa coluna,
  //    no fim da lista.
  function resolverDestino(over) {
    const d = over.data.current || {};
    if (d.isColumn) {
      return { colId: d.columnId, overTicketId: null };
    }
    // veio de um card
    return { colId: d.columnId, overTicketId: over.id };
  }

  async function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;

    const ticketId = active.id;
    const origem = tickets.find((t) => t.id === ticketId);
    if (!origem) return;

    const { colId: destinoColId, overTicketId } = resolverDestino(over);
    if (destinoColId == null) return;

    const naColunaDestino = tickets
      .filter((t) => t.column_id === destinoColId)
      .sort((a, b) => a.order_index - b.order_index);

    // Posição de destino: índice do card sob o cursor; se soltou na área da
    // coluna (sem card sob o cursor), vai para o fim.
    let novaPos = overTicketId
      ? naColunaDestino.findIndex((t) => t.id === overTicketId)
      : naColunaDestino.length;
    if (novaPos === -1) novaPos = naColunaDestino.length;

    const mesmaColuna = origem.column_id === destinoColId;

    if (mesmaColuna) {
      // --- Reordenar dentro da mesma coluna (só prioridade visual) ---
      const oldIndex = naColunaDestino.findIndex((t) => t.id === ticketId);
      if (oldIndex === -1 || oldIndex === novaPos) return;

      const reordenada = arrayMove(naColunaDestino, oldIndex, novaPos);
      setTickets((prev) => {
        const fora = prev.filter((t) => t.column_id !== destinoColId);
        const dentro = reordenada.map((t, i) => ({ ...t, order_index: i }));
        return [...fora, ...dentro];
      });
      try {
        await api.reorderTickets(destinoColId, reordenada.map((t) => t.id));
      } catch {
        carregar();
      }
    } else {
      // --- Mover para outra coluna (registra histórico no backend) ---
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId
          ? { ...t, column_id: destinoColId, order_index: novaPos } : t))
      );
      try {
        await api.moveTicket(ticketId, {
          to_column_id: destinoColId, new_order_index: novaPos,
        });
        // Encaixa o card na posição exata, regravando a ordem da coluna destino.
        const semEle = naColunaDestino.filter((t) => t.id !== ticketId);
        const idsDestino = [
          ...semEle.slice(0, novaPos).map((t) => t.id),
          ticketId,
          ...semEle.slice(novaPos).map((t) => t.id),
        ];
        await api.reorderTickets(destinoColId, idsDestino);
        carregar();
      } catch {
        carregar();
      }
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8,
                    marginBottom: 16, flexShrink: 0, alignItems: "center" }}>
        <input placeholder="🔍 Buscar por código, título, SN, NF, fabricante, modelo ou responsável…"
               value={busca} onChange={(e) => setBusca(e.target.value)}
               style={{ maxWidth: 420 }} />
        <div style={{ display: "flex", gap: 8 }}>
          {isAdmin && (
            <button onClick={() => setManageCols(true)}>⚙ Gerenciar colunas</button>
          )}
          <button className="primary" onClick={() => setShowForm(true)}>
            + Novo ticket
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}>
        {/* A faixa ocupa a altura restante. Scroll horizontal entre colunas;
            cada coluna rola na vertical internamente. */}
        <div style={{ display: "flex", gap: 16, alignItems: "stretch",
                      overflowX: "auto", flex: 1, minHeight: 0,
                      paddingBottom: 12 }}>
          {columns.map((col) => (
            <div key={col.id} style={{ flex: "0 0 280px", maxWidth: 280,
                                       display: "flex" }}>
              <Column column={col}
                      tickets={tickets
                        .filter((t) => t.column_id === col.id)
                        .filter((t) => visivelNoQuadro(t, col))
                        .filter((t) => filtraBusca(t, busca))
                        .sort((a, b) => a.order_index - b.order_index)}
                      onOpenTicket={setSelected} />
            </div>
          ))}
        </div>
      </DndContext>

      {showForm && (
        <TicketForm columns={columns}
                    onClose={() => setShowForm(false)}
                    onCreated={() => { setShowForm(false); carregar(); }} />
      )}

      {editing && (
        <TicketForm ticket={editing} columns={columns}
                    onClose={() => setEditing(null)}
                    onCreated={aposEditar} />
      )}

      {selected && (
        <TicketDetail ticket={selected} columns={columns} isAdmin={isAdmin}
                      onClose={() => setSelected(null)}
                      onMoved={() => { setSelected(null); carregar(); }}
                      onEdit={(t) => { setSelected(null); setEditing(t); }} />
      )}

      {manageCols && (
        <ColumnManager columns={columns}
                       onClose={() => setManageCols(false)}
                       onChange={carregar} />
      )}
    </div>
  );
}
