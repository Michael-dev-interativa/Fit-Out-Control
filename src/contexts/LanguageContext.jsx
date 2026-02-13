import React from 'react';

// Minimal language context shim to satisfy imports during build.
// `t` is a Proxy that returns the key name as fallback string.
export function useLanguage() {
  const language = 'pt-BR';
  const t = new Proxy({}, {
    get: (_, prop) => {
      if (typeof prop === 'string') return prop.replace(/([A-Z])/g, ' $1').trim();
      return String(prop);
    }
  });

  return { language, t };
}

export default useLanguage;
