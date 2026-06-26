import { useState } from "react";
import { api } from "../api/client";

// Gerenciador de colunas do Kanban. Permite criar, renomear, configurar SLA e
// flags (aguardando cliente / coluna final), reordenar por setas e excluir.
export default function ColumnManager({ columns, onClose, onChange }) {
  const [novo, setNovo] = useState("");

  async function criar() {
    if (!novo.trim()) return;
    // order_index no fim da lista por padrão.
    await api.createColumn({ name: novo.trim(), order_index: columns.length });
    setNovo("");
    onChange();
  }

  async function salvarCampo(col, campo, valor) {
    await api.updateColumn(col.id, { [campo]: valor });
    onChange();
  }

  async function excluir(col) {
    if (!confirm(`Excluir a coluna "${col.name}"?`)) return;
    try {
      await api.deleteColumn(col.id);
      onChange();
    } catch (e) {
      // O backend bloqueia exclusão de coluna que ainda tem tickets.
      alert(String(e.message || e).replace(/^API \d+:\s*/, ""));
    }
  }

  // Troca o order_index de duas colunas adjacentes e persiste em lote.
  async function mover(idx, dir) {
    const alvo = idx + dir;
    if (alvo < 0 || alvo >= columns.length) return;
    const a = columns[idx], b = columns[alvo];
    await api.reorderColumns([
      { id: a.id, order_index: b.order_index },
      { id: b.id, order_index: a.order_index },
    ]);
    onChange();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}
           style={{ width: 620 }}>
        <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18 }}>Gerenciar colunas</h2>
          <button onClick={onClose} style={{ padding: "4px 10px" }}>✕</button>
        </div>

        {/* Aviso de configuração: qual coluna é a final e qual a de recebimento.
            Ajuda a evitar tickets "sumindo" da aba Concluídos por marcação errada. */}
        {(() => {
          const finais = columns.filter((c) => c.is_done);
          const receb = columns.filter((c) => c.is_received);
          return (
            <div style={{ background: "var(--bg)", borderRadius: "var(--radius)",
                          padding: "10px 12px", marginBottom: 16, fontSize: 12,
                          color: "var(--text-secondary)" }}>
              <div>
                <strong>Coluna final (conclusão):</strong>{" "}
                {finais.length === 0
                  ? <span style={{ color: "var(--red)" }}>nenhuma marcada — tickets concluídos não aparecerão na aba Concluídos.</span>
                  : finais.map((c) => c.name).join(", ")}
              </div>
              <div style={{ marginTop: 4 }}>
                <strong>Destino ao receber (RMA):</strong>{" "}
                {receb.length === 0
                  ? "nenhuma — recebimentos não moverão o ticket."
                  : receb.map((c) => c.name).join(", ")}
              </div>
            </div>
          );
        })()}

        <div style={{ display: "grid", gap: 10 }}>
          {columns.map((col, idx) => (
            <div key={col.id}
                 style={{ border: "1px solid var(--border)",
                          borderRadius: "var(--radius)", padding: 12 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center",
                            marginBottom: 8 }}>
                {/* Setas de reordenação. */}
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <button onClick={() => mover(idx, -1)} disabled={idx === 0}
                          style={{ padding: "0 6px", fontSize: 11 }}>▲</button>
                  <button onClick={() => mover(idx, 1)}
                          disabled={idx === columns.length - 1}
                          style={{ padding: "0 6px", fontSize: 11 }}>▼</button>
                </div>
                <input defaultValue={col.name}
                       onBlur={(e) => e.target.value !== col.name &&
                                       salvarCampo(col, "name", e.target.value)}
                       style={{ flex: 1 }} />
                <button onClick={() => excluir(col)} title="Excluir"
                        style={{ color: "var(--red)" }}>🗑</button>
              </div>

              <div style={{ display: "flex", gap: 16, alignItems: "center",
                            fontSize: 12, flexWrap: "wrap" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  SLA (horas):
                  <input type="number" defaultValue={col.sla_hours ?? ""}
                         placeholder="—"
                         onBlur={(e) => salvarCampo(col, "sla_hours",
                                  e.target.value ? Number(e.target.value) : null)}
                         style={{ width: 70 }} />
                </span>
                <label style={{ display: "flex", alignItems: "center", gap: 4,
                                margin: 0 }}>
                  <input type="checkbox" checked={!!col.is_waiting_client}
                         style={{ width: "auto" }}
                         onChange={(e) => salvarCampo(col, "is_waiting_client",
                                          e.target.checked ? 1 : 0)} />
                  Aguardando cliente
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 4,
                                margin: 0 }}>
                  <input type="checkbox" checked={!!col.is_done}
                         style={{ width: "auto" }}
                         onChange={(e) => salvarCampo(col, "is_done",
                                          e.target.checked ? 1 : 0)} />
                  Coluna final (conclusão)
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 4,
                                margin: 0 }}>
                  <input type="checkbox" checked={!!col.is_received}
                         style={{ width: "auto" }}
                         onChange={(e) => salvarCampo(col, "is_received",
                                          e.target.checked ? 1 : 0)} />
                  Destino ao receber (RMA)
                </label>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <input placeholder="Nome da nova coluna" value={novo}
                 onChange={(e) => setNovo(e.target.value)}
                 onKeyDown={(e) => e.key === "Enter" && criar()} />
          <button className="primary" onClick={criar}
                  style={{ whiteSpace: "nowrap" }}>+ Coluna</button>
        </div>

        <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 12 }}>
          SLA define quando o card fica amarelo (80%) ou vermelho (estourado).
          "Aguardando cliente" separa o tempo de espera externa nos relatórios.
          "Coluna final" marca a etapa de conclusão usada no cálculo do MTTR.
        </p>
      </div>
    </div>
  );
}
