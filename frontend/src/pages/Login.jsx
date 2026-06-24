import { useState } from "react";
import { api, setToken } from "../api/client";

// Tela de login. Ao autenticar, guarda o token e avisa o App (onLogin) com os
// dados do usuário (incluindo o papel).
export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const r = await api.login(username, password);
      setToken(r.access_token);
      onLogin(r.user);
    } catch (err) {
      setErro(String(err.message || err));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center",
                  justifyContent: "center", background: "var(--bg)" }}>
      <form onSubmit={entrar}
            style={{ background: "var(--surface)", border: "1px solid var(--border)",
                     borderRadius: "var(--radius-lg)", padding: 32, width: 340 }}>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Garantias 3D</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 20 }}>
          Entre para acessar o sistema.
        </p>

        <div style={{ marginBottom: 12 }}>
          <label>Usuário</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)}
                 autoFocus />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Senha</label>
          <input type="password" value={password}
                 onChange={(e) => setPassword(e.target.value)} />
        </div>

        {erro && (
          <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>
            {erro}
          </div>
        )}

        <button type="submit" className="primary" disabled={carregando}
                style={{ width: "100%" }}>
          {carregando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
