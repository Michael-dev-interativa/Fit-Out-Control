import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RespostaVistoria, UnidadeEmpreendimento, FormularioVistoria } from '@/api/entities';
import { Loader2, AlertTriangle, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function NovoVistoriadeObra() {
  const navigate = useNavigate();
  const location = useLocation();
  const unidadeId = new URLSearchParams(location.search).get('unidadeId');
  const empreendimentoId = new URLSearchParams(location.search).get('empreendimentoId');

  const [status, setStatus] = useState('loading'); // 'loading' | 'selecting' | 'creating' | 'error'
  const [unidades, setUnidades] = useState([]);
  const [error, setError] = useState(null);
  const [errorDetail, setErrorDetail] = useState(null);

  const criarVistoria = async (idUnidade) => {
    setStatus('creating');
    try {
      // respostas_vistoria requires id_formulario NOT NULL — fetch any available form
      let idFormulario = null;
      try {
        const forms = await FormularioVistoria.list();
        if (Array.isArray(forms) && forms.length > 0) idFormulario = forms[0].id;
      } catch { /* silently skip if endpoint unavailable */ }

      const payload = {
        nome_arquivo: 'vistoria-obra-padrao',
        nome_vistoria: 'Vistoria de Obra Padrão',
        id_empreendimento: empreendimentoId,
        id_unidade: idUnidade,
        data_vistoria: new Date().toISOString(),
        revisao: '00',
        estrutura_formulario: { secoes: [], observacoes_gerais: '', cliente: '' },
      };
      if (idFormulario) payload.id_formulario = idFormulario;

      const nova = await RespostaVistoria.create(payload);
      if (!nova?.id) throw new Error('Falha ao criar vistoria: resposta sem ID');
      navigate(`/EditarVistoriadeObra?relatorioId=${nova.id}`, { replace: true });
    } catch (err) {
      const backendMsg = err.payload?.message || err.payload?.error || (typeof err.payload === 'string' ? err.payload : null);
      if (err.status === 401) {
        setError('Sessão expirada. Faça login novamente para continuar.');
        setErrorDetail(backendMsg || null);
      } else if (err.status === 500) {
        setError('Erro interno no servidor ao criar vistoria.');
        setErrorDetail(backendMsg || 'Se o problema persistir, entre em contato com o suporte.');
      } else {
        setError(err.message || 'Erro ao criar vistoria');
        setErrorDetail(backendMsg || null);
      }
      setStatus('error');
    }
  };

  useEffect(() => {
    const init = async () => {
      if (!empreendimentoId) {
        setError('Empreendimento não informado.');
        setStatus('error');
        return;
      }

      if (unidadeId) {
        criarVistoria(unidadeId);
        return;
      }

      try {
        const lista = await UnidadeEmpreendimento.filter({ id_empreendimento: empreendimentoId }, '-created_date');
        const arr = Array.isArray(lista) ? lista : [];

        if (arr.length === 0) {
          setError('Nenhuma unidade encontrada. Cadastre uma unidade no empreendimento antes de criar uma vistoria.');
          setStatus('error');
        } else if (arr.length === 1) {
          criarVistoria(arr[0].id);
        } else {
          setUnidades(arr);
          setStatus('selecting');
        }
      } catch (err) {
        setError('Erro ao buscar unidades do empreendimento.');
        setStatus('error');
      }
    };

    init();
  }, [unidadeId, empreendimentoId]);

  if (status === 'error') {
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

  if (status === 'selecting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-lg">
          <Building2 className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 text-center mb-2">Selecione a Unidade</h2>
          <p className="text-gray-500 text-center mb-6 text-sm">Escolha para qual unidade deseja criar a vistoria.</p>
          <div className="space-y-3">
            {unidades.map((u) => (
              <Card
                key={u.id}
                className="cursor-pointer hover:border-blue-500 hover:shadow-sm transition-all"
                onClick={() => criarVistoria(u.id)}
              >
                <CardContent className="py-4 px-5">
                  <p className="font-medium text-gray-800">{u.unidade_empreendimento || `Unidade ${u.id}`}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button variant="ghost" className="w-full mt-6 text-gray-500" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      <p className="mt-4 text-gray-600">
        {status === 'creating' ? 'Criando vistoria de obra...' : 'Carregando...'}
      </p>
    </div>
  );
}
