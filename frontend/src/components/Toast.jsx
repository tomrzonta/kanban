import { createContext, useContext, useState, useCallback } from "react";

// Sistema de notificações (toasts) no canto superior direito.
// Uso: const toast = useToast(); toast.error("mensagem") ou toast.success(...).
// As notificações somem sozinhas após alguns segundos.
const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  // Fallback seguro: se por algum motivo não houver provider, não quebra a tela.
  if (!ctx) return { show: () => {}, error: () => {}, success: () => {}, info: () => {} };
  return ctx;
}

const DURACAO_MS = 5000; // tempo até sumir sozinha

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remover = useCallback((id) => {
    setToasts((lista) => lista.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((mensagem, tipo = "info", duracao = DURACAO_MS) => {
    const id = Date.now() + Math.random();
    setToasts((lista) => [...lista, { id, mensagem, tipo }]);
    setTimeout(() => remover(id), duracao);
  }, [remover]);

  const api = {
    show,
    error: (m, dur) => show(m, "error", dur),
    success: (m, dur) => show(m, "success", dur),
    info: (m, dur) => show(m, "info", dur),
  };

  const cores = {
    error: { bg: "#fdecec", border: "#e03e3e", fg: "#a32d2d", icone: "⚠" },
    success: { bg: "#e8f5ee", border: "#1d9e75", fg: "#1d7a4d", icone: "✓" },
    info: { bg: "var(--surface)", border: "var(--border)", fg: "var(--text)", icone: "ℹ" },
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Pilha de toasts no canto superior direito. */}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999,
                    display: "flex", flexDirection: "column", gap: 8,
                    maxWidth: 380 }}>
        {toasts.map((t) => {
          const c = cores[t.tipo] || cores.info;
          return (
            <div key={t.id} onClick={() => remover(t.id)}
                 style={{ background: c.bg, border: `1px solid ${c.border}`,
                          borderLeft: `4px solid ${c.border}`, color: c.fg,
                          borderRadius: "var(--radius)", padding: "12px 14px",
                          fontSize: 13, cursor: "pointer",
                          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                          display: "flex", gap: 8, alignItems: "flex-start",
                          animation: "toast-in 0.2s ease-out" }}>
              <span style={{ fontWeight: 700 }}>{c.icone}</span>
              <span style={{ flex: 1 }}>{t.mensagem}</span>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
