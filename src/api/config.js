// Resolve base URL da API em tempo de build e runtime
export const API_BASE = (() => {
  try {
    const env = (typeof import.meta !== 'undefined') ? import.meta.env : undefined;
    const fromEnv = env?.VITE_API_URL;
    if (fromEnv && String(fromEnv).trim() !== '') return String(fromEnv).replace(/\/$/, '');
    if (typeof window !== 'undefined') {
      const injected = window.__API_URL__ || window.API_URL;
      if (injected) return String(injected).replace(/\/$/, '');
      if (window.location && window.location.origin) return window.location.origin;
    }
    return 'http://localhost:3000';
  } catch {
    return 'http://localhost:3000';
  }
})();

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}
