import React, { useState } from 'react';

/**
 * Componente de imagem com fallback automático para imagens não encontradas
 */
export function ImageWithFallback({ src, alt, className, fallbackSrc, ...props }) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleError = () => {
    console.warn('Imagem não encontrada:', src);
    setError(true);
    setLoading(false);
  };

  const handleLoad = () => {
    setLoading(false);
  };

  // Se houve erro e não tem fallback, mostra placeholder
  if (error && !fallbackSrc) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-200 ${className}`}
        {...props}
      >
        <div className="text-center p-4">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="mt-2 text-xs text-gray-500">
            Imagem não disponível
            <br />
            <span className="text-[10px]">Faça upload novamente</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {loading && (
        <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
          <div className="animate-pulse">Carregando...</div>
        </div>
      )}
      <img
        src={error ? fallbackSrc : src}
        alt={alt}
        className={`${className} ${loading ? 'hidden' : ''}`}
        onError={handleError}
        onLoad={handleLoad}
        {...props}
      />
    </>
  );
}
