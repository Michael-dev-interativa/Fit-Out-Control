

// Versão simplificada e robusta: sempre loga o base e força uso do VITE_API_URL
export function apiUrl(path = "") {
  const base =
    import.meta.env.VITE_API_URL?.trim().replace(/\/$/, "") ||
    (typeof window !== "undefined" && window.__API_URL__?.trim().replace(/\/$/, "")) ||
    "http://localhost:3001";
  if (typeof window !== "undefined") {
    console.log("[API Config] base:", base, "path:", path, "VITE_API_URL:", import.meta.env.VITE_API_URL);
  }
  return `${base}${path.startsWith("/") ? path : "/" + path}`;
}
