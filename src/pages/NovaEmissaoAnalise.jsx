import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Empreendimento, UnidadeEmpreendimento, RelatorioAnaliseTecnica } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from 'lucide-react';

const emptyProjeto = () => ({
  item: '',
  acao: '',
  descricao: '',
  situacao: 'PD',
  comentarios: [],
});

const emptyArquivo = () => ({
  disciplina: '',
  descricao: '',
  arquivo: '',
  ref: '0',
  data_cadastro: new Date().toISOString().slice(0, 10),
  status: 'PD',
  comentario_tecnico: '',
  resposta_cliente: '',
  status_resposta: 'Pendente',
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
      descricao: '',
      data: new Date().toISOString().slice(0, 10),
    },
  ],
  lista_arquivos: [emptyArquivo()],
  projetos: [emptyProjeto()],
  instalacoes_eletricas: [],
  instalacoes_hidraulicas: [],
  projeto_legal_bombeiro: [],
  instalacoes_hvac: [],
  conclusao: [],
  nota_geral: 'Conforme informado, toda e qualquer dimensionamento indicado em projetos é de inteira responsabilidade da licitante e seu respectivo projetista. A análise técnica da Interativa visa avaliar as interferências que podem fazer causar desconformidades das instalações.',
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
  const addRevisao = () => setField('revisoes', [...(form.revisoes || []), { rev: String(form.revisoes?.length || 0), descricao: '', data: new Date().toISOString().slice(0, 10) }]);
  const updateRevisao = (index, key, value) => {
    const updated = [...(form.revisoes || [])];
    updated[index] = { ...updated[index], [key]: value };
    setField('revisoes', updated);
  };
  const removeRevisao = (index) => setField('revisoes', (form.revisoes || []).filter((_, idx) => idx !== index));

  const addArquivo = () => setField('lista_arquivos', [...(form.lista_arquivos || []), emptyArquivo()]);
  const updateArquivo = (index, key, value) => {
    const updated = [...(form.lista_arquivos || [])];
    updated[index] = { ...updated[index], [key]: value };
    setField('lista_arquivos', updated);
  };
  const removeArquivo = (index) => setField('lista_arquivos', (form.lista_arquivos || []).filter((_, idx) => idx !== index));

  const handleCreate = async () => {
    if (!form.id_empreendimento) {
      setError('Empreendimento obrigatorio.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const payload = {
        ...form,
        id_empreendimento: Number(form.id_empreendimento),
        id_unidade: form.id_unidade ? Number(form.id_unidade) : null,
        numero_os: form.numero_os?.trim() || null,
        metragem: form.metragem?.trim() || null,
        edificio_pavimento: form.edificio_pavimento?.trim() || null,
        nome_arquivo: form.nome_arquivo?.trim() || null,
        fase_emissao: form.fase_emissao?.trim() || null,
        data_emissao: form.data_emissao || null,
        nota_geral: form.nota_geral?.trim() || null,
        titulo_capa: form.titulo_capa?.trim() || 'RELATORIO',
        subtitulo_capa: form.subtitulo_capa?.trim() || 'Analise Tecnica',
        texto_rodape_capa: form.texto_rodape_capa?.trim() || null,
        status_relatorio: form.status_relatorio?.trim() || 'Rascunho',
        consultor_responsavel: form.consultor_responsavel?.trim() || null,
      };

      const created = await RelatorioAnaliseTecnica.create(payload);

      navigate(createPageUrl(`EditarRelatorioAnaliseTecnica?id=${created.id}&empreendimentoId=${form.id_empreendimento}`));
    } catch (e) {
      const details = e?.message ? ` (${e.message})` : '';
      setError(`Erro ao criar relatorio de analise tecnica${details}`);
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
            <h1 className="text-2xl font-bold">Novo Relatório de Análise Técnica</h1>
            <p className="text-sm text-gray-500">Preencha os dados iniciais e continue na tela de edição completa.</p>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando empreendimento e unidades...
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Dados Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>OS</Label>
                    <Input placeholder="Ex: AUTOPEL-12" value={form.numero_os || ''} onChange={(e) => setField('numero_os', e.target.value)} />
                  </div>
                  <div>
                    <Label>Metragem (m²)</Label>
                    <Input placeholder="Ex: 795" value={form.metragem || ''} onChange={(e) => setField('metragem', e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Edifício / Pavimento</Label>
                    <Input placeholder="Ex: Edifício Citadel - 12º pavimento" value={form.edificio_pavimento || ''} onChange={(e) => setField('edificio_pavimento', e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Nome do Arquivo</Label>
                    <Input placeholder="Ex: AUTOPEL_12-RITOR-CONS-001-R00" value={form.nome_arquivo || ''} onChange={(e) => setField('nome_arquivo', e.target.value)} />
                  </div>
                  <div>
                    <Label>Data de Emissão</Label>
                    <Input type="date" value={form.data_emissao || ''} onChange={(e) => setField('data_emissao', e.target.value)} />
                  </div>
                  <div>
                    <Label>Fase de Emissão</Label>
                    <Input value={form.fase_emissao || ''} onChange={(e) => setField('fase_emissao', e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Revisões</CardTitle>
                <Button size="sm" variant="outline" onClick={addRevisao}>
                  <Plus className="w-4 h-4 mr-1" />Adicionar
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {(form.revisoes || []).map((rev, index) => (
                  <div key={`rev-${index}`} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div>
                      <Label>Rev.</Label>
                      <Input value={rev.rev || ''} onChange={(e) => updateRevisao(index, 'rev', e.target.value)} />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Input value={rev.descricao || ''} onChange={(e) => updateRevisao(index, 'descricao', e.target.value)} />
                    </div>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label>Data</Label>
                        <Input type="date" value={rev.data || ''} onChange={(e) => updateRevisao(index, 'data', e.target.value)} />
                      </div>
                      <Button size="icon" variant="ghost" className="text-red-500" onClick={() => removeRevisao(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Lista Mestra de Arquivos Analisados</CardTitle>
                <Button size="sm" variant="outline" onClick={addArquivo}>
                  <Plus className="w-4 h-4 mr-1" />Adicionar
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700">
                        <th className="border px-2 py-2 text-left w-24">DES</th>
                        <th className="border px-2 py-2 text-left">DESCRIÇÃO</th>
                        <th className="border px-2 py-2 text-left">ARQUIVO</th>
                        <th className="border px-2 py-2 text-left w-20">REV</th>
                        <th className="border px-2 py-2 text-left w-40">DATA DE CADASTRO</th>
                        <th className="border px-2 py-2 text-left w-24">STATUS</th>
                        <th className="border px-2 py-2 text-left min-w-48">COMENTÁRIO TÉCNICO</th>
                        <th className="border px-2 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(form.lista_arquivos || []).map((arquivo, index) => (
                        <tr key={`arquivo-${index}`}>
                          <td className="border px-1 py-1"><Input className="border-0 bg-transparent h-8 text-xs p-1" value={arquivo.disciplina || ''} onChange={(e) => updateArquivo(index, 'disciplina', e.target.value)} /></td>
                          <td className="border px-1 py-1"><Input className="border-0 bg-transparent h-8 text-xs p-1" value={arquivo.descricao || ''} onChange={(e) => updateArquivo(index, 'descricao', e.target.value)} /></td>
                          <td className="border px-1 py-1"><Input className="border-0 bg-transparent h-8 text-xs p-1" value={arquivo.arquivo || ''} onChange={(e) => updateArquivo(index, 'arquivo', e.target.value)} /></td>
                          <td className="border px-1 py-1"><Input className="border-0 bg-transparent h-8 text-xs p-1" value={arquivo.ref || ''} onChange={(e) => updateArquivo(index, 'ref', e.target.value)} /></td>
                          <td className="border px-1 py-1"><Input type="date" className="border-0 bg-transparent h-8 text-xs p-1" value={arquivo.data_cadastro || ''} onChange={(e) => updateArquivo(index, 'data_cadastro', e.target.value)} /></td>
                          <td className="border px-1 py-1">
                            <select className="w-full h-8 rounded-md border-0 bg-transparent text-xs" value={arquivo.status || 'PD'} onChange={(e) => updateArquivo(index, 'status', e.target.value)}>
                              <option value="PD">PD</option>
                              <option value="OK">OK</option>
                              <option value="IN">IN</option>
                            </select>
                          </td>
                          <td className="border px-1 py-1"><Input className="border-0 bg-transparent h-8 text-xs p-1" placeholder="Observação técnica..." value={arquivo.comentario_tecnico || ''} onChange={(e) => updateArquivo(index, 'comentario_tecnico', e.target.value)} /></td>
                          <td className="border px-1 py-1 text-center">
                            <Button size="icon" variant="ghost" className="text-red-500 h-8 w-8" onClick={() => removeArquivo(index)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Nota Geral</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea rows={4} value={form.nota_geral || ''} onChange={(e) => setField('nota_geral', e.target.value)} />
              </CardContent>
            </Card>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={goBack}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar e Continuar'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
