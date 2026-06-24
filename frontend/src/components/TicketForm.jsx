import { useState, useEffect } from "react";
import { api } from "../api/client";

// Formulário de ticket que serve para CRIAR e EDITAR.
// Se `ticket` vier preenchido, entra em modo edição (PATCH); senão, cria (POST).
const ORIGENS = [
  "Reclame Aqui",
  "Atendimento Interno",
  "Redes Sociais",
  "E-mail",
  "Telefone",
];

export default function TicketForm({ ticket, columns, onCreated, onClose }) {
  const editando = !!ticket;

  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [defects, setDefects] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    titulo: ticket?.titulo || "",
    problema: ticket?.problema || "",
    supplier_id: ticket?.supplier_id || "",
    defect_type_id: ticket?.defect_type_id || "",
    numero_nf: ticket?.numero_nf || "",
    origem: ticket?.origem || "Atendimento Interno",
    quantidade: ticket?.quantidade || 1,
    codigo_rastreio: ticket?.codigo_rastreio || "",
    serial_number: ticket?.serial_number || "",
    requer_contato_cliente: ticket?.requer_contato_cliente || 0,
    retorno_horas: ticket?.retorno_horas || "",
    notas: ticket?.notas || "",
    brand_id: "",
    printer_model_id: ticket?.printer_model_id || "",
    column_id: ticket?.column_id || columns[0]?.id || "",
  });

  useEffect(() => {
    api.listBrands().then(setBrands);
    api.listEntities("suppliers").then(setSuppliers);
    api.listEntities("defect-types").then(setDefects);
  }, []);

  // Ao trocar a marca, recarrega os modelos. Em edição não limpamos o modelo
  // já escolhido (a impressora não muda numa edição comum).
  useEffect(() => {
    if (!form.brand_id) {
      setModels([]);
      return;
    }
    api.listModels(form.brand_id).then(setModels);
  }, [form.brand_id]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function salvar() {
    setError(null);
    if (!form.titulo || !form.problema || !form.column_id) {
      setError("Preencha título, problema e coluna.");
      return;
    }
    setSaving(true);
    try {
      // Converte os selects para número ou null.
      const fks = {
        supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
        defect_type_id: form.defect_type_id ? Number(form.defect_type_id) : null,
      };
      if (editando) {
        await api.updateTicket(ticket.id, {
          titulo: form.titulo,
          problema: form.problema,
          ...fks,
          numero_nf: form.numero_nf || null,
          codigo_rastreio: form.codigo_rastreio || null,
          serial_number: form.serial_number || null,
          notas: form.notas || null,
          quantidade: Number(form.quantidade),
          requer_contato_cliente: form.requer_contato_cliente ? 1 : 0,
          retorno_horas: form.retorno_horas ? Number(form.retorno_horas) : null,
        });
      } else {
        if (!form.printer_model_id) {
          setError("Selecione a marca e o modelo.");
          setSaving(false);
          return;
        }
        const { brand_id, ...payload } = form;
        await api.createTicket({
          ...payload,
          ...fks,
          printer_model_id: Number(payload.printer_model_id),
          column_id: Number(payload.column_id),
          quantidade: Number(payload.quantidade),
          numero_nf: payload.numero_nf || null,
          codigo_rastreio: payload.codigo_rastreio || null,
          serial_number: payload.serial_number || null,
          notas: payload.notas || null,
          requer_contato_cliente: payload.requer_contato_cliente ? 1 : 0,
          retorno_horas: payload.retorno_horas ? Number(payload.retorno_horas) : null,
        });
      }
      onCreated();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>
          {editando ? "Editar ticket" : "Novo ticket de garantia"}
        </h2>

        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label>Título *</label>
            <input value={form.titulo} onChange={set("titulo")}
                   placeholder="Resumo do problema" />
          </div>

          <div>
            <label>Problema *</label>
            <textarea value={form.problema} onChange={set("problema")}
                      rows={3} placeholder="Descrição detalhada" />
          </div>

          {/* Impressora só é escolhida na criação. Na edição mostramos fixa. */}
          {editando ? (
            <div>
              <label>Impressora</label>
              <input value={`${ticket.marca} · ${ticket.modelo}`} disabled
                     style={{ background: "var(--bg)" }} />
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label>Fabricante *</label>
                <select value={form.brand_id} onChange={set("brand_id")}>
                  <option value="">Selecione…</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label>Modelo *</label>
                <select value={form.printer_model_id} onChange={set("printer_model_id")}
                        disabled={!form.brand_id}>
                  <option value="">Selecione…</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — R$ {Number(m.current_price).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label>Fornecedor</label>
              <select value={form.supplier_id} onChange={set("supplier_id")}>
                <option value="">Selecione…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Tipo de defeito</label>
              <select value={form.defect_type_id} onChange={set("defect_type_id")}>
                <option value="">Selecione…</option>
                {defects.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label>Quantidade</label>
              <input type="number" min="1" value={form.quantidade}
                     onChange={set("quantidade")} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label>Nota fiscal</label>
              <input value={form.numero_nf} onChange={set("numero_nf")} />
            </div>
            <div>
              <label>Origem</label>
              <select value={form.origem} onChange={set("origem")}
                      disabled={editando}>
                {ORIGENS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label>Código de rastreio</label>
              <input value={form.codigo_rastreio} onChange={set("codigo_rastreio")} />
            </div>
            <div>
              <label>Número de série (SN)</label>
              <input value={form.serial_number} onChange={set("serial_number")}
                     placeholder="SN da impressora" />
            </div>
          </div>

          {/* Coluna inicial só na criação; depois se move pelo quadro/detalhe. */}
          {!editando && (
            <div>
              <label>Coluna inicial *</label>
              <select value={form.column_id} onChange={set("column_id")}>
                {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {/* Sinalização de contato com cliente + prazo individual de retorno. */}
          <div style={{ border: "1px solid var(--border)",
                        borderRadius: "var(--radius)", padding: 12,
                        background: "var(--bg)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8,
                            margin: 0, marginBottom: form.requer_contato_cliente ? 12 : 0 }}>
              <input type="checkbox" style={{ width: "auto" }}
                     checked={!!form.requer_contato_cliente}
                     onChange={(e) => setForm((f) => ({
                       ...f, requer_contato_cliente: e.target.checked ? 1 : 0 }))} />
              Requer contato com o cliente
            </label>
            {form.requer_contato_cliente ? (
              <div>
                <label>Retornar em (horas)</label>
                <input type="number" min="1" value={form.retorno_horas}
                       onChange={set("retorno_horas")}
                       placeholder="Ex: 8 — prazo próprio deste ticket"
                       style={{ maxWidth: 240 }} />
                <p style={{ fontSize: 11, color: "var(--text-tertiary)",
                            margin: "6px 0 0" }}>
                  Quando preenchido, este prazo substitui o SLA da coluna no
                  cálculo da cor do card. A contagem começa ao salvar.
                </p>
              </div>
            ) : null}
          </div>

          <div>
            <label>Notas do atendimento</label>
            <textarea value={form.notas} onChange={set("notas")} rows={2} />
          </div>

          {error && <div style={{ color: "var(--red)", fontSize: 13 }}>{error}</div>}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end",
                        marginTop: 8 }}>
            <button onClick={onClose}>Cancelar</button>
            <button className="primary" onClick={salvar} disabled={saving}>
              {saving ? "Salvando…" : editando ? "Salvar alterações" : "Criar ticket"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
