// Cliente HTTP central. Concentra a base URL, o token de autenticação e o
// tratamento de erro num só lugar.
const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Token guardado em memória + sessionStorage (sobrevive a F5, some ao fechar a aba).
let _token = sessionStorage.getItem("token") || null;

export function setToken(t) {
  _token = t;
  if (t) sessionStorage.setItem("token", t);
  else sessionStorage.removeItem("token");
}
export function getToken() {
  return _token;
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (_token) headers.Authorization = `Bearer ${_token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  // 401: sessão expirou ou inválida — limpa o token e sinaliza para deslogar.
  if (res.status === 401) {
    setToken(null);
    window.dispatchEvent(new Event("auth-expired"));
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  if (!res.ok) {
    // O FastAPI devolve erros como {"detail": "mensagem"}. Extraímos isso para
    // a mensagem ficar limpa onde for exibida (toast, alert, etc.).
    const corpo = await res.text();
    let msg = corpo;
    try {
      const j = JSON.parse(corpo);
      if (j && j.detail) msg = j.detail;
    } catch { /* corpo não era JSON, usa como está */ }
    throw new Error(msg || `Erro ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  // Autenticação
  login: async (username, password) => {
    // O endpoint de login espera form-urlencoded (padrão OAuth2), não JSON.
    const body = new URLSearchParams({ username, password });
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) throw new Error("Usuário ou senha inválidos.");
    return res.json();
  },
  me: () => request("/api/auth/me"),
  listSelectableUsers: () => request("/api/auth/users/selectaveis"),
  listUsers: () => request("/api/auth/users"),
  createUser: (data) =>
    request("/api/auth/users", { method: "POST", body: JSON.stringify(data) }),
  updateUserRole: (id, role) =>
    request(`/api/auth/users/${id}/role?role=${role}`, { method: "PATCH" }),
  resetSenha: (id, novaSenha) =>
    request(`/api/auth/users/${id}/senha?nova_senha=${encodeURIComponent(novaSenha)}`,
            { method: "PATCH" }),

  // Auditoria (só admin)
  listAuditoria: ({ entidade, acao, limit = 100, offset = 0 } = {}) => {
    const qs = new URLSearchParams();
    if (entidade) qs.set("entidade", entidade);
    if (acao) qs.set("acao", acao);
    qs.set("limit", limit); qs.set("offset", offset);
    return request(`/api/auditoria?${qs.toString()}`);
  },
  opcoesAuditoria: () => request("/api/auditoria/opcoes"),

  // Base de conhecimento de atendimento (KB)
  listKb: ({ q, categoria } = {}) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (categoria) p.set("categoria", categoria);
    const qs = p.toString();
    return request(`/api/kb${qs ? `?${qs}` : ""}`);
  },
  kbCategorias: () => request("/api/kb/categorias"),
  createKb: (data) => request("/api/kb", { method: "POST", body: JSON.stringify(data) }),
  updateKb: (id, data) => request(`/api/kb/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteKb: (id) => request(`/api/kb/${id}`, { method: "DELETE" }),
  toggleFavoritoKb: (id) =>
    request(`/api/kb/${id}/favorito`, { method: "PATCH" }),
  deleteUser: (id) =>
    request(`/api/auth/users/${id}`, { method: "DELETE" }),

  // Colunas
  listColumns: () => request("/api/columns"),
  createColumn: (data) =>
    request("/api/columns", { method: "POST", body: JSON.stringify(data) }),
  updateColumn: (id, data) =>
    request(`/api/columns/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteColumn: (id) =>
    request(`/api/columns/${id}`, { method: "DELETE" }),
  reorderColumns: (order) =>
    request("/api/columns/reorder", { method: "PUT", body: JSON.stringify(order) }),

  // Tickets
  listTickets: () => request("/api/tickets"),
  createTicket: (data) =>
    request("/api/tickets", { method: "POST", body: JSON.stringify(data) }),
  updateTicket: (id, data) =>
    request(`/api/tickets/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  moveTicket: (id, body) =>
    request(`/api/tickets/${id}/move`, { method: "PUT", body: JSON.stringify(body) }),
  registrarContato: (id) =>
    request(`/api/tickets/${id}/registrar-contato`, { method: "PUT" }),
  // Timeline do ticket (eventos + comentários)
  listEventos: (id) => request(`/api/tickets/${id}/eventos`),
  addComentario: (id, texto) =>
    request(`/api/tickets/${id}/eventos`, { method: "POST", body: JSON.stringify({ texto }) }),
  reorderTickets: (column_id, ticket_ids) =>
    request("/api/tickets/reorder", {
      method: "PUT", body: JSON.stringify({ column_id, ticket_ids }) }),

  // Anexos
  listAttachments: (ticketId) => request(`/api/tickets/${ticketId}/attachments`),
  uploadAttachment: async (ticketId, file) => {
    // Upload usa multipart/form-data — NÃO definir Content-Type (o browser põe
    // o boundary correto sozinho). Por isso não passa pelo `request` padrão.
    const fd = new FormData();
    fd.append("file", file);
    const headers = {};
    const tk = getToken();
    if (tk) headers.Authorization = `Bearer ${tk}`;
    const res = await fetch(`${BASE}/api/tickets/${ticketId}/attachments`, {
      method: "POST", headers, body: fd,
    });
    if (!res.ok) throw new Error(`Falha no upload (${res.status})`);
    return res.json();
  },
  // Baixa o anexo via fetch (envia o token) e dispara o download no browser.
  downloadAttachment: async (attId, nome) => {
    const headers = {};
    const tk = getToken();
    if (tk) headers.Authorization = `Bearer ${tk}`;
    const res = await fetch(`${BASE}/api/tickets/attachments/${attId}/download`,
                            { headers });
    if (!res.ok) throw new Error("Falha ao baixar o anexo.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nome || "anexo";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
  deleteAttachment: (attId) =>
    request(`/api/tickets/attachments/${attId}`, { method: "DELETE" }),

  // Recebimentos (RMA)
  listRecebimentos: () => request("/api/recebimentos"),
  recebimentoCondicoes: () => request("/api/recebimentos/condicoes"),
  ticketsAbertos: (q) =>
    request(`/api/recebimentos/tickets-abertos${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  createRecebimento: (data) =>
    request("/api/recebimentos", { method: "POST", body: JSON.stringify(data) }),

  // Catálogo
  listBrands: () => request("/api/catalog/brands"),
  createBrand: (data) =>
    request("/api/catalog/brands", { method: "POST", body: JSON.stringify(data) }),
  listModels: (brandId) =>
    request(`/api/catalog/models${brandId ? `?brand_id=${brandId}` : ""}`),
  createModel: (data) =>
    request("/api/catalog/models", { method: "POST", body: JSON.stringify(data) }),
  updateModel: (id, data) =>
    request(`/api/catalog/models/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteModel: (id) =>
    request(`/api/catalog/models/${id}`, { method: "DELETE" }),
  updateBrand: (id, data) =>
    request(`/api/catalog/brands/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteBrand: (id) =>
    request(`/api/catalog/brands/${id}`, { method: "DELETE" }),

  // Entidades simples padronizadas (distribuidora, fornecedor, tipo de defeito).
  // `kind` é o path: "distributors" | "suppliers" | "defect-types".
  listEntities: (kind) => request(`/api/catalog/${kind}`),
  createEntity: (kind, name) =>
    request(`/api/catalog/${kind}`, { method: "POST", body: JSON.stringify({ name }) }),
  updateEntity: (kind, id, name) =>
    request(`/api/catalog/${kind}/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  deleteEntity: (kind, id) =>
    request(`/api/catalog/${kind}/${id}`, { method: "DELETE" }),

  // Análise por dimensão (fornecedor, distribuidora, defeito).
  porDimensao: () => request("/api/reports/por-dimensao"),

  // Desfechos (categorias com impacto no prejuízo)
  listDesfechos: () => request("/api/catalog/desfechos"),
  createDesfecho: (data) =>
    request("/api/catalog/desfechos", { method: "POST", body: JSON.stringify(data) }),
  updateDesfecho: (id, data) =>
    request(`/api/catalog/desfechos/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteDesfecho: (id) =>
    request(`/api/catalog/desfechos/${id}`, { method: "DELETE" }),

  // Tickets concluídos (com filtros) para a aba de consulta.
  concluidos: (filtros) => {
    const qs = new URLSearchParams(
      Object.entries(filtros).filter(([, v]) => v !== "" && v != null)
    ).toString();
    return request(`/api/analytics/concluidos${qs ? `?${qs}` : ""}`);
  },

  // Dashboard analítico com filtros. `filtros` é um objeto; vira query string.
  analyticsDashboard: (filtros) => {
    const qs = new URLSearchParams(
      Object.entries(filtros).filter(([, v]) => v !== "" && v != null)
    ).toString();
    return request(`/api/analytics/dashboard${qs ? `?${qs}` : ""}`);
  },
  analyticsExportUrl: (filtros) => {
    const qs = new URLSearchParams(
      Object.entries(filtros).filter(([, v]) => v !== "" && v != null)
    ).toString();
    return `${BASE}/api/analytics/export.csv${qs ? `?${qs}` : ""}`;
  },
  // Linha do tempo de um ticket (por código interno).
  ticketTimeline: (codigo) =>
    request(`/api/analytics/ticket-timeline?codigo=${encodeURIComponent(codigo)}`),
  // CSV largo completo (base inteira) para Power BI.
  exportCompletoUrl: () => `${BASE}/api/analytics/export-completo.csv`,

  // Relatórios
  mttr: () => request("/api/reports/mttr"),
  volume: () => request("/api/reports/volume"),
  prejuizo: () => request("/api/reports/prejuizo"),
  bottlenecks: () => request("/api/reports/bottlenecks"),

  // Exportação
  excelUrl: () => `${BASE}/api/export/excel`,
};
