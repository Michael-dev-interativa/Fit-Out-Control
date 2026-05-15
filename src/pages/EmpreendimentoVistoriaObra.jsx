
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { UnidadeEmpreendimento } from '@/api/entities';

// Página inteligente de redirecionamento para vistoria padrão
export default function EmpreendimentoVistoriaObra() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const empreendimentoId = queryParams.get('empreendimentoId');
  const unidadeId = queryParams.get('unidadeId');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debug, setDebug] = useState("");

  useEffect(() => {
    const run = async () => {
      setDebug(`Params: empreendimentoId=${empreendimentoId} unidadeId=${unidadeId}`);
      if (!empreendimentoId) {
        setDebug(d => d + '\nFaltando empreendimentoId, voltando para Empreendimentos');
        navigate(createPageUrl('Empreendimentos'), { replace: true });
        return;
      }

      // Se unidadeId já está na URL, vai direto
      if (unidadeId) {
        setDebug(d => d + `\nRedirecionando para NovoVistoriadeObra unidadeId=${unidadeId}`);
        navigate(createPageUrl(`NovoVistoriadeObra?unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`), { replace: true });
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setDebug(d => d + '\nBuscando unidades...');
        // Busca unidades do empreendimento
        const unidades = await UnidadeEmpreendimento.filter({ id_empreendimento: empreendimentoId }, "-created_date");
        setDebug(d => d + `\nUnidades retornadas: ${JSON.stringify(unidades)}`);
        if (Array.isArray(unidades)) {
          if (unidades.length === 1) {
            setDebug(d => d + `\nApenas uma unidade encontrada: ${unidades[0].id}`);
            navigate(createPageUrl(`NovoVistoriadeObra?unidadeId=${unidades[0].id}&empreendimentoId=${empreendimentoId}`), { replace: true });
            return;
          }
          if (unidades.length > 1) {
            setDebug(d => d + `\nMais de uma unidade, abrindo seleção em NovoVistoriadeObra.`);
            navigate(createPageUrl(`NovoVistoriadeObra?empreendimentoId=${empreendimentoId}`), { replace: true });
            return;
          }
        }
        setDebug(d => d + '\nNenhuma unidade encontrada, redirecionando para cadastro.');
        // Se não houver unidade, direciona para cadastro de unidade
        navigate(createPageUrl(`Empreendimento?empreendimentoId=${empreendimentoId}&novaUnidade=1`), { replace: true });
      } catch (e) {
        setError('Erro ao buscar unidades.');
        setDebug(d => d + `\nErro: ${e?.message || e}`);
        setTimeout(() => navigate(createPageUrl('Empreendimentos'), { replace: true }), 2000);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [empreendimentoId, unidadeId, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <span className="text-lg text-gray-600">Redirecionando para a criação da Vistoria de Obra...</span>
        <pre className="mt-4 p-2 bg-gray-100 text-xs text-left rounded max-w-xl overflow-x-auto">{debug}</pre>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <span className="text-lg text-red-600">{error}</span>
        <pre className="mt-4 p-2 bg-gray-100 text-xs text-left rounded max-w-xl overflow-x-auto">{debug}</pre>
      </div>
    );
  }
  return null;
}
