
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

  useEffect(() => {
    const run = async () => {
      if (!empreendimentoId) {
        navigate(createPageUrl('Empreendimentos'), { replace: true });
        return;
      }

      // Se unidadeId já está na URL, vai direto
      if (unidadeId) {
        navigate(createPageUrl(`NovoVistoriadeObra?unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`), { replace: true });
        return;
      }

      try {
        setLoading(true);
        setError(null);
        // Busca unidades do empreendimento
        const unidades = await UnidadeEmpreendimento.filter({ id_empreendimento: empreendimentoId }, "-created_date");
        if (Array.isArray(unidades)) {
          if (unidades.length === 1) {
            navigate(createPageUrl(`NovoVistoriadeObra?unidadeId=${unidades[0].id}&empreendimentoId=${empreendimentoId}`), { replace: true });
            return;
          }
          if (unidades.length > 1) {
            // Se houver mais de uma unidade, direciona para seleção de unidade
            navigate(createPageUrl(`Empreendimento?empreendimentoId=${empreendimentoId}&selecionarUnidade=1`), { replace: true });
            return;
          }
        }
        // Se não houver unidade, direciona para cadastro de unidade
        navigate(createPageUrl(`Empreendimento?empreendimentoId=${empreendimentoId}&novaUnidade=1`), { replace: true });
      } catch (e) {
        setError('Erro ao buscar unidades.');
        setTimeout(() => navigate(createPageUrl('Empreendimentos'), { replace: true }), 2000);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [empreendimentoId, unidadeId, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-lg text-gray-600">Redirecionando para a criação da Vistoria de Obra...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-lg text-red-600">{error}</span>
      </div>
    );
  }
  return null;
}
