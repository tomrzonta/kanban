// Componente raiz. Controla autenticação: sem login mostra a tela de Login;
// logado mostra o app. A aba Catálogo só aparece para admin.
import { useState, useEffect } from "react";
import { useTheme } from "./hooks/useTheme";
import logo from "./assets/logo-stlflix.png";
import KanbanBoard from "./components/KanbanBoard";
import Dashboard from "./pages/Dashboard";
import Diretoria from "./pages/Diretoria";
import Concluidos from "./pages/Concluidos";
import Recebimentos from "./pages/Recebimentos";
import Compras from "./pages/Compras";
import Catalog from "./pages/Catalog";
import Users from "./pages/Users";
import Auditoria from "./pages/Auditoria";
import Atendimento from "./pages/Atendimento";
import Login from "./pages/Login";
import { api, setToken, getToken } from "./api/client";

export default function App() {
  const [user, setUser] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [view, setView] = useState("kanban");
  const { tema, alternar } = useTheme();

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
    { id: "recebimentos", label: "Recebimentos" },
    { id: "compras", label: "Compras" },
    { id: "concluidos", label: "Concluídos" },
    ...(isAdmin ? [{ id: "diretoria", label: "Diretoria" }] : []),
    { id: "dashboard", label: "Operacional" },
    { id: "atendimento", label: "Atendimento" },
    ...(isAdmin ? [
      { id: "catalog", label: "Catálogo" },
      { id: "users", label: "Usuários" },
      { id: "auditoria", label: "Auditoria" },
    ] : []),
  ];

  const tabStyle = (active) => ({
    padding: "8px 16px", border: "none",
    borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
    background: "none", cursor: "pointer",
    fontWeight: active ? 600 : 400,
    color: active ? "var(--accent)" : "var(--text-secondary)",
  });

  return (
    <div className="app-shell">
      <header className="app-header" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={logo} alt="STLFLIX" style={{ height: 32 }} />
            <h1 style={{ fontSize: 22, margin: 0, fontWeight: 700 }}>
              Garantias <span style={{ color: "var(--accent)" }}>STLFLIX</span>
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12,
                        fontSize: 13, color: "var(--text-secondary)" }}>
            <span>
              {user.nome || user.username}
              <span style={{ marginLeft: 6, fontSize: 11,
                             background: isAdmin ? "var(--accent-soft)" : "#eef1f5",
                             color: isAdmin ? "var(--accent)" : "#666",
                             padding: "1px 8px", borderRadius: 10 }}>
                {isAdmin ? "admin" : "atendente"}
              </span>
            </span>
            <button onClick={alternar} title="Alternar tema claro/escuro"
                    style={{ padding: "4px 10px" }}>
              {tema === "dark" ? "☀ Claro" : "🌙 Escuro"}
            </button>
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
        {view === "kanban" && <KanbanBoard isAdmin={isAdmin} user={user} />}
        {view === "recebimentos" && <Recebimentos />}
        {view === "compras" && <Compras />}
        {view === "concluidos" && <Concluidos isAdmin={isAdmin} />}
        {view === "dashboard" && <Dashboard />}
        {view === "diretoria" && isAdmin && <Diretoria />}
        {view === "atendimento" && <Atendimento />}
        {view === "catalog" && isAdmin && <Catalog />}
        {view === "users" && isAdmin && <Users currentUser={user} />}
        {view === "auditoria" && isAdmin && <Auditoria />}
      </div>
    </div>
  );
}
