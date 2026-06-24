import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Plugin React habilita o JSX e o fast refresh (hot reload).
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0", // necessário para o Vite ser acessível de fora do container
    port: 5173,
  },
});
