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
    base = "https://fit-out-backend.onrender.com";
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

  // Se já é URL completa
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    // Se for localhost, substituir pelo API_BASE correto
    if (filePath.includes('localhost')) {
      const correctedUrl = filePath.replace(/http:\/\/localhost:\d+/, API_BASE);
      console.log('🔧 Corrigindo URL localhost:', { original: filePath, corrigida: correctedUrl, API_BASE });
      return correctedUrl;
    }
    return filePath;
  }

  // Remove barra inicial e adiciona 'uploads/' se necessário
  const cleanPath = filePath.replace(/^\//, '');
  const finalPath = cleanPath.startsWith('uploads/') ? cleanPath : `uploads/${cleanPath}`;

  return `${API_BASE}/${finalPath}`;
}
