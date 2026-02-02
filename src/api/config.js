

// API Base URL resolver - logs detalhados para debug em produção
export function apiUrl(path = "") {
  // Pega o VITE_API_URL do ambiente (injetado em build time)
  const envUrl = import.meta.env.VITE_API_URL;

  // Fallback 1: Variável de ambiente
  let base = envUrl && String(envUrl).trim().replace(/\/$/, "");

  // Fallback 2: window.__API_URL__ (runtime injection)
  if (!base && typeof window !== "undefined") {
    const injected = window.__API_URL__ || window.API_URL;
    base = injected && String(injected).trim().replace(/\/$/, "");
  }

  // Fallback 3: localhost (development)
  if (!base) {
    base = "http://localhost:3000";
  }

  // Logs para debug (apenas em desenvolvimento ou primeira chamada)
  if (typeof window !== "undefined" && !window.__apiConfigLogged) {
    console.group("🔧 API Configuration");
    console.log("VITE_API_URL:", envUrl || "(not set)");
    console.log("window.__API_URL__:", typeof window !== "undefined" ? (window.__API_URL__ || "(not set)") : "N/A");
    console.log("Resolved base:", base);
    console.log("Environment:", import.meta.env.MODE);
    console.groupEnd();
    window.__apiConfigLogged = true;
  }

  const cleanPath = path.startsWith("/") ? path : "/" + path;
  return `${base}${cleanPath}`;
}
