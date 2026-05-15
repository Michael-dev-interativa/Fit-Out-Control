import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RespostaVistoria } from '@/api/entities';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function NovoVistoriadeObra() {
  const navigate = useNavigate();
  const location = useLocation();
  const unidadeId = new URLSearchParams(location.search).get('unidadeId');
  const empreendimentoId = new URLSearchParams(location.search).get('empreendimentoId');
  const [error, setError] = useState(null);
  const [errorDetail, setErrorDetail] = useState(null);

  useEffect(() => {
    const criarVistoria = async () => {
      try {
        if (!empreendimentoId) throw new Error('Empreendimento não informado');
        if (!unidadeId) throw new Error('Unidade não informada. Use a tela de empreendimento para iniciar uma vistoria.');

        const nova = await RespostaVistoria.create({
          nome_arquivo: 'vistoria-obra-padrao',
          nome_vistoria: 'Vistoria de Obra Padrão',
          id_empreendimento: empreendimentoId,
          id_unidade: unidadeId,
          data_vistoria: new Date().toISOString(),
          revisao: '00',
          estrutura_formulario: { secoes: [], observacoes_gerais: '', cliente: '' },
        });
        if (!nova?.id) throw new Error('Falha ao criar vistoria: resposta sem ID');
        navigate(`/EditarVistoriadeObra?relatorioId=${nova.id}`, { replace: true });
      } catch (err) {
        if (err.status === 401) {
          setError('Sessão expirada. Faça login novamente para continuar.');
          setErrorDetail(null);
        } else if (err.status === 500) {
          setError('Erro interno no servidor ao criar vistoria.');
          setErrorDetail('Se o problema persistir, entre em contato com o suporte.');
        } else {
          setError(err.message || 'Erro ao criar vistoria');
          setErrorDetail(null);
        }
      }
    };
    criarVistoria();
    // eslint-disable-next-line
  }, [unidadeId, empreendimentoId]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-700 mb-2">Erro ao criar vistoria</h2>
          <p className="text-gray-600 mb-2">{error}</p>
          {errorDetail && <p className="text-sm text-gray-400 mb-4">{errorDetail}</p>}
          <button
            className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded font-medium text-gray-700"
            onClick={() => navigate(-1)}
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      <p className="mt-4 text-gray-600">Criando vistoria de obra padrão...</p>
    </div>
  );
}
