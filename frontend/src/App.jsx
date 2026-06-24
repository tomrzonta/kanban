// Componente raiz. Controla autenticação: sem login mostra a tela de Login;
// logado mostra o app. A aba Catálogo só aparece para admin.
import { useState, useEffect } from "react";
import KanbanBoard from "./components/KanbanBoard";
import Dashboard from "./pages/Dashboard";
import Concluidos from "./pages/Concluidos";
import Catalog from "./pages/Catalog";
import Users from "./pages/Users";
import Login from "./pages/Login";
import { api, setToken, getToken } from "./api/client";

export default function App() {
  const [user, setUser] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [view, setView] = useState("kanban");

  // Ao abrir, se há token salvo, valida com /me para recuperar a sessão.
  useEffect(() => {
    if (!getToken()) { setCarregando(false); return; }
    api.me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setCarregando(false));
  }, []);

  // Se o token expirar durante o uso, o cliente dispara este evento.
  useEffect(() => {
    const sair = () => setUser(null);
    window.addEventListener("auth-expired", sair);
    return () => window.removeEventListener("auth-expired", sair);
  }, []);

  function logout() {
    setToken(null);
    setUser(null);
    setView("kanban");
  }

  if (carregando) return null;
  if (!user) return <Login onLogin={setUser} />;

  const isAdmin = user.role === "admin";
  const TABS = [
    { id: "kanban", label: "Quadro" },
    { id: "concluidos", label: "Concluídos" },
    { id: "dashboard", label: "Dashboard" },
    ...(isAdmin ? [
      { id: "catalog", label: "Catálogo" },
      { id: "users", label: "Usuários" },
    ] : []),
  ];

  const tabStyle = (active) => ({
    padding: "8px 16px", border: "none",
    borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
    background: "none", cursor: "pointer",
    fontWeight: active ? 600 : 400,
    color: active ? "var(--text)" : "var(--text-secondary)",
  });

  return (
    <div className="app-shell">
      <header className="app-header" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "center", marginBottom: 12 }}>
          <h1 style={{ fontSize: 22 }}>Garantias 3D</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12,
                        fontSize: 13, color: "var(--text-secondary)" }}>
            <span>
              {user.nome || user.username}
              <span style={{ marginLeft: 6, fontSize: 11,
                             background: isAdmin ? "#e6f1fb" : "#eee",
                             color: isAdmin ? "#185fa5" : "#666",
                             padding: "1px 8px", borderRadius: 10 }}>
                {isAdmin ? "admin" : "atendente"}
              </span>
            </span>
            <button onClick={logout}>Sair</button>
          </div>
        </div>
        <nav style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)" }}>
          {TABS.map((t) => (
            <button key={t.id} style={tabStyle(view === t.id)}
                    onClick={() => setView(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <div className={`app-content${view !== "kanban" ? " scrollable" : ""}`}>
        {view === "kanban" && <KanbanBoard isAdmin={isAdmin} />}
        {view === "concluidos" && <Concluidos isAdmin={isAdmin} />}
        {view === "dashboard" && <Dashboard />}
        {view === "catalog" && isAdmin && <Catalog />}
        {view === "users" && isAdmin && <Users currentUser={user} />}
      </div>
    </div>
  );
}
