import { useState, useEffect } from "react";
import SnoozePicker from "./SnoozePicker";
import { api } from "../api/client";
import { useToast } from "./Toast";

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
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  // Modelo (nome) a aplicar assim que os modelos da marca carregarem — usado
  // pelo autopreenchimento por SN, para evitar corrida com o carregamento.
  const [modeloPendente, setModeloPendente] = useState(null);

  const [form, setForm] = useState({
    titulo: ticket?.titulo || "",
    problema: ticket?.problema || "",
    supplier_id: ticket?.supplier_id || "",
    defect_type_id: ticket?.defect_type_id || "",
    responsavel_id: ticket?.responsavel_id || "",
    numero_nf: ticket?.numero_nf || "",
    origem: ticket?.origem || "Atendimento Interno",
    quantidade: ticket?.quantidade || 1,
    codigo_rastreio: ticket?.codigo_rastreio || "",
    ticket_suporte_externo: ticket?.ticket_suporte_externo || "",
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
    api.listSelectableUsers().then(setUsers);
  }, []);

  // Ao trocar a marca, recarrega os modelos. Em edição não limpamos o modelo
  // já escolhido (a impressora não muda numa edição comum).
  useEffect(() => {
    if (!form.brand_id) {
      setModels([]);
      return;
    }
    api.listModels(form.brand_id).then((lista) => {
      setModels(lista);
      // Se há um modelo pendente (vindo do autopreenchimento por SN), casa
      // pelo nome agora que a lista existe — evita a corrida de estado.
      if (modeloPendente) {
        const m = lista.find(
          (x) => x.name.trim().toLowerCase() === modeloPendente.trim().toLowerCase());
        if (m) setForm((f) => ({ ...f, printer_model_id: m.id }));
        setModeloPendente(null);
      }
    });
  }, [form.brand_id, modeloPendente]);

  const toast = useToast();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Ao sair do campo de número de série, busca na base de compras e, se achar,
  // autopreenche marca e modelo. Se não achar, avisa e deixa preenchimento manual.
  async function buscarPorSerie() {
    const sn = (form.serial_number || "").trim();
    if (!sn || editando) return;  // só no cadastro; edição não remexe a impressora
    const T = 7000; // avisos de SN ficam mais tempo, para dar tempo de ler
    try {
      const compra = await api.compraPorSerie(sn);
      if (!compra) {
        toast.info(`SN não encontrado: ${sn}. Preencha a marca e o modelo manualmente.`, T);
        return;
      }
      const forn = compra.fornecedor ? ` — Fornecedor: ${compra.fornecedor}` : "";
      // Casa a marca com o catálogo (case-insensitive).
      const marcaCat = brands.find(
        (b) => b.name.trim().toLowerCase() === (compra.marca || "").trim().toLowerCase());
      if (!marcaCat) {
        toast.info(`Equipamento encontrado: ${compra.marca} ${compra.modelo}${forn}. `
          + `A marca não está no catálogo — cadastre-a ou selecione manualmente.`, T);
        return;
      }
      // Marca a "intenção" de modelo; o efeito de brand_id aplica quando a lista
      // de modelos carregar (evita corrida entre setModels e a seleção).
      setModeloPendente(compra.modelo || null);
      setForm((f) => ({ ...f, brand_id: marcaCat.id, printer_model_id: "" }));

      toast.success(`Equipamento encontrado: ${compra.marca} ${compra.modelo}${forn}. `
        + `Confira se o modelo foi selecionado.`, T);
    } catch (e) {
      toast.error(String(e.message || e));
    }
  }

  async function salvar() {
    setError(null);
    if (!form.titulo || !form.problema || !form.column_id) {
      setError("Preencha título, problema e coluna.");
      return;
    }
    if (!form.responsavel_id) {
      setError("Selecione o responsável pelo ticket.");
      return;
    }
    setSaving(true);
    try {
      // Converte os selects para número ou null.
      const fks = {
        supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
        defect_type_id: form.defect_type_id ? Number(form.defect_type_id) : null,
        responsavel_id: form.responsavel_id ? Number(form.responsavel_id) : null,
      };
      if (editando) {
        await api.updateTicket(ticket.id, {
          titulo: form.titulo,
          problema: form.problema,
          ...fks,
          numero_nf: form.numero_nf || null,
          codigo_rastreio: form.codigo_rastreio || null,
          ticket_suporte_externo: form.ticket_suporte_externo || null,
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
          ticket_suporte_externo: payload.ticket_suporte_externo || null,
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
            <div>
              <label>Responsável *</label>
              <select value={form.responsavel_id} onChange={set("responsavel_id")}>
                <option value="">Selecione…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.nome || u.username}</option>
                ))}
              </select>
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
              <label>Ticket de suporte (Bambu Lab / importadora)</label>
              <input value={form.ticket_suporte_externo}
                     onChange={set("ticket_suporte_externo")}
                     placeholder="Nº do protocolo externo" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label>Número de série (SN)</label>
              <input value={form.serial_number} onChange={set("serial_number")}
                     onBlur={buscarPorSerie}
                     placeholder="Digite a SN para buscar o equipamento" />
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
                <label>Quando retornar ao contato</label>
                <SnoozePicker
                  valor={form.retorno_horas ? Number(form.retorno_horas) : null}
                  onChange={(h) => setForm((f) => ({ ...f, retorno_horas: h }))} />
                <p style={{ fontSize: 11, color: "var(--text-tertiary)",
                            margin: "6px 0 0" }}>
                  Este prazo substitui o SLA da coluna no cálculo da cor do card.
                  A contagem começa ao salvar.
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
