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
    return "https://fitout-backend.onrender.com";
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
    base = "https://fitout-backend.onrender.com";
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

  // Se já é URL completa
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    // Se for localhost, substituir pelo API_BASE correto
    if (filePath.includes('localhost')) {
      return filePath.replace(/http:\/\/localhost:\d+/, currentApiBase);
    }
    return filePath;
  }

  // Remove barra inicial e adiciona 'uploads/' se necessário
  const cleanPath = filePath.replace(/^\//, '');
  const finalPath = cleanPath.startsWith('uploads/') ? cleanPath : `uploads/${cleanPath}`;

  return `${currentApiBase}/${finalPath}`;
}
