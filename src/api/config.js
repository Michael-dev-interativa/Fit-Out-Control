
// Resolve base URL da API em tempo de build e runtime, com suporte a api-base.json
let API_BASE = null;
let apiBasePromise = null;

function getApiBaseSync() {
  // 1. Variável de ambiente (build-time)
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    const cleaned = String(envUrl).trim().replace(/\/$/, '');
    if (cleaned) {
      console.log('[API Config] Using VITE_API_URL:', cleaned);
      return cleaned;
    }
  }
  // 2. Runtime injection (window)
  if (typeof window !== 'undefined') {
    const injected = window.__API_URL__ || window.API_URL;
    if (injected) {
      const cleaned = String(injected).trim().replace(/\/$/, '');
      if (cleaned) {
        console.log('[API Config] Using window.__API_URL__:', cleaned);
        return cleaned;
      }
    }
  }
  // 3. Fallback local dev
  return 'http://localhost:3000';
}

// Busca api-base.json em tempo de execução (apenas browser)
async function getApiBaseAsync() {
  if (API_BASE) return API_BASE;
  // Primeiro tenta env/build/runtime
  const sync = getApiBaseSync();
  if (sync && !sync.includes('localhost:3000')) {
    API_BASE = sync;
    return API_BASE;
  }
  // Se está no browser, tenta buscar api-base.json
  if (typeof window !== 'undefined' && window.fetch) {
    try {
      const resp = await window.fetch('/api-base.json', { cache: 'no-store' });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.API_BASE) {
          API_BASE = String(data.API_BASE).trim().replace(/\/$/, '');
          console.log('[API Config] Using API_BASE from api-base.json:', API_BASE);
          return API_BASE;
        }
      }
    } catch (e) {
      console.warn('[API Config] Falha ao buscar api-base.json', e);
    }
  }
  // Fallback final
  API_BASE = sync;
  console.log('[API Config] Fallback API_BASE:', API_BASE);
  return API_BASE;
}

// Função para uso em componentes async
export async function apiUrlAsync(path) {
  if (!apiBasePromise) apiBasePromise = getApiBaseAsync();
  const base = await apiBasePromise;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

// Função síncrona (para uso legado, mas pode retornar localhost em prod)
export function apiUrl(path) {
  if (!API_BASE) API_BASE = getApiBaseSync();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

// Log inicial para debug
getApiBaseAsync().then(base => {
  console.log('[API Config] API_BASE resolved to:', base);
  console.log('[API Config] VITE_API_URL from env:', import.meta.env.VITE_API_URL);
});
