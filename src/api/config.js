// Resolve base URL da API em tempo de build e runtime
// Vite substitui import.meta.env.VITE_API_URL em build-time
const getApiBase = () => {
  // 1. Variável de ambiente (resolvida em build-time pelo Vite)
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    const cleaned = String(envUrl).trim().replace(/\/$/, '');
    if (cleaned) return cleaned;
  }

  // 2. Runtime injection (útil para Docker/containers)
  if (typeof window !== 'undefined') {
    const injected = window.__API_URL__ || window.API_URL;
    if (injected) {
      const cleaned = String(injected).trim().replace(/\/$/, '');
      if (cleaned) return cleaned;
    }

    // 3. Origem atual (produção sem variável configurada)
    if (window.location && window.location.origin) {
      return window.location.origin;
    }
  }

  // 4. Fallback local development
  return 'http://localhost:3000';
};

export const API_BASE = getApiBase();

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}
