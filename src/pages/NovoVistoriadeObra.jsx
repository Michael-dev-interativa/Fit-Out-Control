import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { InspecaoVistoriaObraPadrao } from '@/api/entities';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function NovoVistoriadeObra() {
  const navigate = useNavigate();
  const location = useLocation();
  const unidadeId = new URLSearchParams(location.search).get('unidadeId');
  const empreendimentoId = new URLSearchParams(location.search).get('empreendimentoId');
  const [error, setError] = useState(null);

  useEffect(() => {
    const criarVistoria = async () => {
      try {
        if (!empreendimentoId) throw new Error('Empreendimento não informado');
        // Cria a vistoria de obra padrão
        const nova = await InspecaoVistoriaObraPadrao.create({
          ...(unidadeId ? { id_unidade: unidadeId } : {}),
          id_empreendimento: empreendimentoId,
        });
        if (!nova?.id) throw new Error('Falha ao criar vistoria');
        // Redireciona para o formulário de edição
        navigate(`/EditarVistoriadeObra?relatorioId=${nova.id}`, { replace: true });
      } catch (err) {
        setError(err.message || 'Erro ao criar vistoria');
      }
    };
    criarVistoria();
    // eslint-disable-next-line
  }, [unidadeId, empreendimentoId]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-700 mb-2">Erro ao criar vistoria</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button className="btn" onClick={() => navigate(-1)}>Voltar</button>
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
