import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { apiUrlAsync } from '@/api/config';

export default function ApiConnectionAlert() {
  const [status, setStatus] = useState('checking'); // checking, ok, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkConnection();
    // eslint-disable-next-line
  }, []);

  const checkConnection = async () => {
    try {
      const healthUrl = await apiUrlAsync('/health');
      console.log('[Health Check] Tentando:', healthUrl);

      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[Health Check] Sucesso:', data);
        setStatus('ok');
        setMessage(`Conectado ao backend: ${healthUrl.replace(/\/health$/, '')}`);
      } else {
        throw new Error(`Status ${response.status}`);
      }
    } catch (error) {
      console.error('[Health Check] Falhou:', error);
      // Tenta mostrar a base da API mesmo em erro
      let apiBase = '';
      try {
        apiBase = (await apiUrlAsync('')).replace(/\/$/, '');
      } catch { }
      setStatus('error');
      setMessage(
        `❌ Backend não acessível!\n` +
        `Tentando conectar em: ${apiBase}\n\n` +
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
          Conectando ao backend...
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
