import { useState, useEffect } from "react";

// Tema claro/escuro. Aplica data-theme="dark" no <html> e persiste a escolha.
// Usa localStorage para lembrar entre sessões (preferência visual não é dado
// sensível). Se indisponível, cai para memória da sessão.
const CHAVE = "tema";

function lerTemaSalvo() {
  try {
    return localStorage.getItem(CHAVE) || "light";
  } catch {
    return "light";
  }
}

export function useTheme() {
  const [tema, setTema] = useState(lerTemaSalvo);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema);
    try { localStorage.setItem(CHAVE, tema); } catch { /* ignora */ }
  }, [tema]);

  const alternar = () => setTema((t) => (t === "dark" ? "light" : "dark"));
  return { tema, alternar };
}
