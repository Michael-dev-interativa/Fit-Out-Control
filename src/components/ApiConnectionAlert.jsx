import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { API_BASE } from '@/api/config';

export default function ApiConnectionAlert() {
  const [status, setStatus] = useState('checking'); // checking, ok, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const healthUrl = `${API_BASE}/health`;
      console.log('[Health Check] Tentando:', healthUrl);

      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[Health Check] Sucesso:', data);
        setStatus('ok');
        setMessage(`Conectado ao backend: ${API_BASE}`);
      } else {
        throw new Error(`Status ${response.status}`);
      }
    } catch (error) {
      console.error('[Health Check] Falhou:', error);
      setStatus('error');
      setMessage(
        `❌ Backend não acessível!\n` +
        `Tentando conectar em: ${API_BASE}\n\n` +
        `Possíveis causas:\n` +
        `• VITE_API_URL não configurada no Vercel\n` +
        `• Backend offline no Render\n` +
        `• Erro de CORS`
      );
    }
  };

  if (status === 'checking') {
    return (
      <Alert className="fixed bottom-4 right-4 w-96 bg-blue-50 border-blue-200">
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Verificando conexão...</AlertTitle>
        <AlertDescription className="text-xs">
          Conectando ao backend em {API_BASE}
        </AlertDescription>
      </Alert>
    );
  }

  if (status === 'error') {
    return (
      <Alert className="fixed bottom-4 right-4 w-96 bg-red-50 border-red-200">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-red-800">Erro de Conexão</AlertTitle>
        <AlertDescription className="text-xs text-red-700 whitespace-pre-line">
          {message}
        </AlertDescription>
      </Alert>
    );
  }

  // Status OK - não mostra nada após 3 segundos
  return null;
}
