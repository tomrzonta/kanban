import { useState } from "react";
import { api, setToken } from "../api/client";
import logo from "../assets/logo-stlflix.png";

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
                  justifyContent: "center",
                  background: "radial-gradient(circle at 50% 35%, #16203a 0%, #0a0e16 70%)",
                  padding: 20 }}>
      <form onSubmit={entrar}
            style={{ background: "#161c2b", border: "1px solid #2c3650",
                     borderRadius: "var(--radius-lg)", padding: 36, width: 360,
                     boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)" }}>
        {/* Marca */}
        <div style={{ display: "flex", flexDirection: "column",
                      alignItems: "center", marginBottom: 24 }}>
          <img src={logo} alt="STLFLIX" style={{ height: 64, marginBottom: 12 }} />
          <h1 style={{ fontSize: 22, margin: 0, fontWeight: 700, color: "#f0f3f8" }}>
            Garantias <span style={{ color: "#4d92f0" }}>STLFLIX</span>
          </h1>
          <p style={{ color: "#9aa6ba", fontSize: 13, margin: "4px 0 0" }}>
            Entre para acessar o sistema.
          </p>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ color: "#9aa6ba" }}>Usuário</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)}
                 autoFocus
                 style={{ background: "#0e1420", border: "1px solid #2c3650",
                          color: "#e6ebf2" }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: "#9aa6ba" }}>Senha</label>
          <input type="password" value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 style={{ background: "#0e1420", border: "1px solid #2c3650",
                          color: "#e6ebf2" }} />
        </div>

        {erro && (
          <div style={{ color: "#ff6b6b", fontSize: 13, marginBottom: 12 }}>
            {erro}
          </div>
        )}

        <button type="submit" className="primary" disabled={carregando}
                style={{ width: "100%", background: "#2563c8", borderColor: "#2563c8" }}>
          {carregando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
