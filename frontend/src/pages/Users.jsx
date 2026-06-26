import { useState, useEffect } from "react";
import { api } from "../api/client";

// Tela de gestão de usuários (só admin). Lista, cria, altera papel e remove.
// O próprio usuário logado (currentUser) não pode se rebaixar nem se remover.
export default function Users({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [erro, setErro] = useState(null);
  const [novo, setNovo] = useState({ username: "", nome: "", senha: "", role: "atendente" });

  const carregar = () => api.listUsers().then(setUsers).catch((e) => setErro(String(e.message || e)));
  useEffect(() => { carregar(); }, []);

  async function criar() {
    setErro(null);
    if (!novo.username.trim() || !novo.senha.trim()) {
      setErro("Informe ao menos usuário e senha.");
      return;
    }
    try {
      await api.createUser({
        username: novo.username.trim(),
        nome: novo.nome.trim() || null,
        senha: novo.senha,
        role: novo.role,
      });
      setNovo({ username: "", nome: "", senha: "", role: "atendente" });
      carregar();
    } catch (e) {
      setErro(String(e.message || e).replace(/^API \d+:\s*/, ""));
    }
  }

  async function trocarPapel(u, role) {
    try {
      await api.updateUserRole(u.id, role);
      carregar();
    } catch (e) {
      alert(String(e.message || e).replace(/^API \d+:\s*/, ""));
    }
  }

  async function remover(u) {
    if (!confirm(`Remover o usuário "${u.username}"?`)) return;
    try {
      await api.deleteUser(u.id);
      carregar();
    } catch (e) {
      alert(String(e.message || e).replace(/^API \d+:\s*/, ""));
    }
  }

  async function redefinirSenha(u) {
    const nova = prompt(`Nova senha para "${u.username}":`);
    if (nova == null) return;            // cancelou
    if (nova.trim().length < 4) {
      alert("A senha deve ter ao menos 4 caracteres.");
      return;
    }
    try {
      await api.resetSenha(u.id, nova);
      alert(`Senha de "${u.username}" redefinida com sucesso.`);
    } catch (e) {
      alert(String(e.message || e).replace(/^API \d+:\s*/, ""));
    }
  }

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Formulário de novo usuário */}
      <section style={{ background: "var(--surface)", border: "1px solid var(--border)",
                        borderRadius: "var(--radius-lg)", padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, marginBottom: 16 }}>Novo usuário</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label>Usuário (login) *</label>
            <input value={novo.username}
                   onChange={(e) => setNovo({ ...novo, username: e.target.value })} />
          </div>
          <div>
            <label>Nome</label>
            <input value={novo.nome}
                   onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
          </div>
          <div>
            <label>Senha *</label>
            <input type="password" value={novo.senha}
                   onChange={(e) => setNovo({ ...novo, senha: e.target.value })} />
          </div>
          <div>
            <label>Permissão</label>
            <select value={novo.role}
                    onChange={(e) => setNovo({ ...novo, role: e.target.value })}>
              <option value="atendente">Atendente (só tickets)</option>
              <option value="admin">Admin (acesso total)</option>
            </select>
          </div>
        </div>
        {erro && <div style={{ color: "var(--red)", fontSize: 13, marginTop: 12 }}>{erro}</div>}
        <div style={{ marginTop: 16 }}>
          <button className="primary" onClick={criar}>+ Criar usuário</button>
        </div>
      </section>

      {/* Lista de usuários */}
      <section style={{ background: "var(--surface)", border: "1px solid var(--border)",
                        borderRadius: "var(--radius-lg)", padding: 20 }}>
        <h3 style={{ fontSize: 15, marginBottom: 16 }}>Usuários ({users.length})</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ color: "var(--text-secondary)", textAlign: "left" }}>
              <th style={{ padding: "6px 4px", fontWeight: 500 }}>Usuário</th>
              <th style={{ padding: "6px 4px", fontWeight: 500 }}>Nome</th>
              <th style={{ padding: "6px 4px", fontWeight: 500 }}>Permissão</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const ehVoce = u.id === currentUser.id;
              return (
                <tr key={u.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px 4px" }}>
                    {u.username}
                    {ehVoce && (
                      <span style={{ marginLeft: 6, fontSize: 11,
                                     color: "var(--text-tertiary)" }}>(você)</span>
                    )}
                  </td>
                  <td style={{ padding: "8px 4px", color: "var(--text-secondary)" }}>
                    {u.nome || "—"}
                  </td>
                  <td style={{ padding: "8px 4px" }}>
                    {/* Não dá para alterar o próprio papel (evita se trancar fora). */}
                    <select value={u.role} disabled={ehVoce}
                            onChange={(e) => trocarPapel(u, e.target.value)}>
                      <option value="atendente">Atendente</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button onClick={() => redefinirSenha(u)} title="Redefinir senha"
                            style={{ padding: "2px 8px", marginRight: 4 }}>🔑</button>
                    {!ehVoce && (
                      <button onClick={() => remover(u)} title="Remover"
                              style={{ color: "var(--red)", padding: "2px 8px" }}>🗑</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
