// Resolve base URL da API em tempo de build e runtime
// Vite substitui import.meta.env.VITE_API_URL em build-time
const getApiBase = () => {
  // 1. Variável de ambiente (resolvida em build-time pelo Vite)
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    const cleaned = String(envUrl).trim().replace(/\/$/, '');
    if (cleaned) {
      console.log('[API Config] Using VITE_API_URL:', cleaned);
      return cleaned;
    }
  }

  // 2. Runtime injection (útil para Docker/containers)
  if (typeof window !== 'undefined') {
    const injected = window.__API_URL__ || window.API_URL;
    if (injected) {
      const cleaned = String(injected).trim().replace(/\/$/, '');
      if (cleaned) {
        console.log('[API Config] Using window.__API_URL__:', cleaned);
        return cleaned;
      }
    }

    // 3. IMPORTANTE: Em produção SEM variável configurada, NÃO use location.origin
    // pois isso apontaria para o frontend (Vercel) ao invés do backend
    // Remova este bloco se você SEMPRE configurar VITE_API_URL em produção
    // if (window.location && window.location.origin) {
    //   return window.location.origin;
    // }
  }

  // 4. Fallback local development
  console.log('[API Config] Using localhost fallback');
  return 'http://localhost:3000';
};

export const API_BASE = getApiBase();

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

// Log inicial para debug
console.log('[API Config] API_BASE resolved to:', API_BASE);
console.log('[API Config] VITE_API_URL from env:', import.meta.env.VITE_API_URL);
