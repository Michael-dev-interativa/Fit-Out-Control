import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Empreendimento, UnidadeEmpreendimento, RelatorioAnaliseTecnica } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

const emptyProjeto = () => ({
  item: '',
  acao: '',
  descricao: '',
  situacao: 'PD',
  comentarios: [],
});

const emptyForm = ({ empreendimentoId, unidadeId }) => ({
  id_empreendimento: empreendimentoId || '',
  id_unidade: unidadeId || '',
  numero_os: '',
  metragem: '',
  edificio_pavimento: '',
  nome_arquivo: '',
  data_emissao: new Date().toISOString().slice(0, 10),
  fase_emissao: '1a Emissao',
  revisoes: [
    {
      rev: '0',
      descricao: 'Emissao inicial',
      data: new Date().toISOString().slice(0, 10),
    },
  ],
  lista_arquivos: [],
  projetos: [emptyProjeto()],
  instalacoes_eletricas: [],
  instalacoes_hidraulicas: [],
  projeto_legal_bombeiro: [],
  instalacoes_hvac: [],
  conclusao: [],
  nota_geral: '',
  titulo_capa: 'RELATORIO',
  subtitulo_capa: 'Analise Tecnica',
  texto_rodape_capa: '',
  status_relatorio: 'Rascunho',
  consultor_responsavel: '',
});

export default function NovaEmissaoAnalise() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const empreendimentoId = params.get('empreendimentoId') || params.get('emp') || '';
  const unidadeIdFromQuery = params.get('id_unidade') || params.get('unidade') || '';

  const [empreendimento, setEmpreendimento] = useState(null);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(() => emptyForm({ empreendimentoId, unidadeId: unidadeIdFromQuery }));

  useEffect(() => {
    const loadData = async () => {
      if (!empreendimentoId) {
        setLoading(false);
        setError('Empreendimento nao informado na URL.');
        return;
      }

      try {
        setLoading(true);
        const [emp, unidadesData] = await Promise.all([
          Empreendimento.get(empreendimentoId),
          UnidadeEmpreendimento.filter({ id_empreendimento: empreendimentoId }, 'unidade_empreendimento'),
        ]);

        setEmpreendimento(emp || null);
        setUnidades(unidadesData || []);
        setForm((prev) => ({
          ...prev,
          id_empreendimento: empreendimentoId,
          id_unidade: prev.id_unidade || unidadeIdFromQuery || '',
          numero_os: prev.numero_os || emp?.os_number || '',
          texto_rodape_capa: prev.texto_rodape_capa || emp?.texto_capa_rodape || '',
        }));
      } catch (e) {
        setError('Falha ao carregar dados iniciais.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [empreendimentoId, unidadeIdFromQuery]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleCreate = async () => {
    if (!form.id_empreendimento) {
      setError('Empreendimento obrigatorio.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const created = await RelatorioAnaliseTecnica.create({
        ...form,
        id_empreendimento: Number(form.id_empreendimento),
        id_unidade: form.id_unidade ? Number(form.id_unidade) : null,
      });

      navigate(createPageUrl(`EditarRelatorioAnaliseTecnica?id=${created.id}&empreendimentoId=${form.id_empreendimento}`));
    } catch (e) {
      setError('Erro ao criar relatorio de analise tecnica.');
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    if (empreendimentoId) {
      navigate(createPageUrl(`EmpreendimentoRelatorioAnaliseTecnica?empreendimentoId=${empreendimentoId}`));
      return;
    }
    navigate(createPageUrl('Empreendimentos'));
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50 text-gray-900">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={goBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Nova Emissao de Analise Tecnica</h1>
            <p className="text-sm text-gray-500">Crie o relatorio e continue na tela de edicao completa.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados Iniciais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando empreendimento e unidades...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Empreendimento</Label>
                    <Input value={empreendimento?.nome_empreendimento || ''} disabled />
                  </div>
                  <div>
                    <Label>Unidade</Label>
                    <select
                      value={form.id_unidade || 'none'}
                      onChange={(e) => setField('id_unidade', e.target.value === 'none' ? '' : e.target.value)}
                      className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
                    >
                      <option value="none">Sem unidade</option>
                      {unidades.map((u) => (
                        <option key={u.id} value={String(u.id)}>
                          {u.unidade_empreendimento}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Numero OS</Label>
                    <Input value={form.numero_os || ''} onChange={(e) => setField('numero_os', e.target.value)} />
                  </div>
                  <div>
                    <Label>Metragem</Label>
                    <Input value={form.metragem || ''} onChange={(e) => setField('metragem', e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Edificio / Pavimento</Label>
                    <Input value={form.edificio_pavimento || ''} onChange={(e) => setField('edificio_pavimento', e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Nome do Arquivo</Label>
                    <Input value={form.nome_arquivo || ''} onChange={(e) => setField('nome_arquivo', e.target.value)} />
                  </div>
                  <div>
                    <Label>Data de Emissao</Label>
                    <Input type="date" value={form.data_emissao || ''} onChange={(e) => setField('data_emissao', e.target.value)} />
                  </div>
                  <div>
                    <Label>Fase de Emissao</Label>
                    <Input value={form.fase_emissao || ''} onChange={(e) => setField('fase_emissao', e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Consultor Responsavel</Label>
                    <Input value={form.consultor_responsavel || ''} onChange={(e) => setField('consultor_responsavel', e.target.value)} />
                  </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={goBack}>Voltar</Button>
                  <Button onClick={handleCreate} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Criando...' : 'Criar Relatorio'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
