import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Esta página faz o redirecionamento direto para a criação da vistoria padrão
export default function EmpreendimentoVistoriaObra() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const empreendimentoId = queryParams.get('empreendimentoId');
  const unidadeId = queryParams.get('unidadeId');

  useEffect(() => {
    // Redireciona para a criação direta da vistoria padrão
    if (empreendimentoId && unidadeId) {
      navigate(createPageUrl(`NovoVistoriadeObra?unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`), { replace: true });
    } else if (empreendimentoId) {
      // Se não há unidade, pode-se abrir seleção ou cadastro de unidade
      navigate(createPageUrl(`Empreendimento?empreendimentoId=${empreendimentoId}`), { replace: true });
    } else {
      // Fallback: volta para lista de empreendimentos
      navigate(createPageUrl('Empreendimentos'), { replace: true });
    }
  }, [empreendimentoId, unidadeId, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <span className="text-lg text-gray-600">Redirecionando para a criação da Vistoria de Obra...</span>
    </div>
  );
}
