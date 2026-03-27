// API Base URL resolver - centralizado para evitar erros de "not defined"

async function loadRuntimeConfig() {
  try {
    const response = await fetch('/api-config.json');
    if (response.ok) {
      const config = await response.json();
      return config.apiUrl;
    }
  } catch (error) {
    console.warn('Could not load runtime config:', error);
  }
  return null;
}

function getApiBase() {
  // Se está rodando em localhost, usa o backend local
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:5000";
  }

  // Em produção no Render, sempre usar o backend correto
  if (typeof window !== "undefined" && window.location.hostname.includes("onrender.com")) {
    return "https://backend-fitout.onrender.com";
  }

  // Pega o VITE_API_URL do ambiente (injetado em build time)
  const envUrl = import.meta.env.VITE_API_URL;

  // Fallback 1: Variável de ambiente
  let base = envUrl && String(envUrl).trim().replace(/\/$/, "");

  // Fallback 2: window.__API_URL__ (runtime injection)
  if (!base && typeof window !== "undefined") {
    const injected = window.__API_URL__ || window.API_URL;
    base = injected && String(injected).trim().replace(/\/$/, "");
  }

  // Fallback 3: URL de produção (hardcoded)
  if (!base) {
    base = "https://backend-fitout.onrender.com";
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

// Função para construir URLs de uploads/imagens
export function getUploadUrl(filePath) {
  if (!filePath) return null;

  // Recalcula API_BASE para pegar hostname atual
  const currentApiBase = getApiBase();

  // Log SEMPRE para debug em produção
  console.log('[getUploadUrl] Input:', filePath, '| API Base:', currentApiBase);

  // Se já é URL completa, retorna como está
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    console.log('[getUploadUrl] → Already full URL, returning as-is');
    return filePath;
  }

  // Suporte a imagens locais offline (DataURL / blob URL)
  if (filePath.startsWith('data:') || filePath.startsWith('blob:')) {
    console.log('[getUploadUrl] → Local data/blob URL, returning as-is');
    return filePath;
  }

  // Se é um caminho de API (/api/files/123), usa diretamente
  if (filePath.startsWith('/api/')) {
    const fullUrl = `${currentApiBase}${filePath}`;
    console.log('[getUploadUrl] → API path converted to:', fullUrl);
    return fullUrl;
  }

  // Remove barra inicial
  const cleanPath = filePath.replace(/^\//, '');

  // Se é um caminho antigo de uploads (uploads/xxxxx.jpg)
  if (cleanPath.startsWith('uploads/')) {
    const fullUrl = `${currentApiBase}/${cleanPath}`;
    console.log('[getUploadUrl] → Uploads path converted to:', fullUrl);
    return fullUrl;
  }

  // Senão, adiciona 'uploads/' (fallback para compatibilidade)
  const fullUrl = `${currentApiBase}/uploads/${cleanPath}`;
  console.log('[getUploadUrl] → Fallback path converted to:', fullUrl);
  return fullUrl;
}
