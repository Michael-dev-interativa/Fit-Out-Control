// API Base URL resolver - centralizado para evitar erros de "not defined"

function getApiBase() {
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

  return base;
}

// Exporta a constante API_BASE
export const API_BASE = getApiBase();

// Exporta a função apiUrl para construir URLs completas
export function apiUrl(path = "") {
  const cleanPath = path.startsWith("/") ? path : "/" + path;
  return `${API_BASE}${cleanPath}`;
}

// Log único de configuração (apenas uma vez)
if (!window.__apiConfigLogged) {
  window.__apiConfigLogged = true;
  console.group("📡 API Configuration");
  console.log("VITE_API_URL:", import.meta.env.VITE_API_URL);
  console.log("Resolved base:", API_BASE);
  console.log("Environment:", import.meta.env.MODE);
  console.groupEnd();
}
