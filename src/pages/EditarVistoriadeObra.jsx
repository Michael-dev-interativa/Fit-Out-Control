import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { InspecaoVistoriaObraPadrao, Empreendimento } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Trash2, Save, Eye, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

const RESPOSTAS = ['Conforme', 'Não Conforme', 'N/A', 'Não Verificado'];

const DEFAULT_SECOES = [
  {
    nome_secao: 'Documentação de Obra',
    perguntas: [
      { pergunta: 'Alvará de construção disponível', resposta: '', observacao: '' },
      { pergunta: 'Projeto aprovado disponível', resposta: '', observacao: '' },
      { pergunta: 'ART/RRT de responsabilidade técnica', resposta: '', observacao: '' },
      { pergunta: 'Diário de obra atualizado', resposta: '', observacao: '' },
    ],
  },
  {
    nome_secao: 'Estrutura',
    perguntas: [
      { pergunta: 'Vigas e pilares sem fissuras aparentes', resposta: '', observacao: '' },
      { pergunta: 'Lajes sem infiltração', resposta: '', observacao: '' },
      { pergunta: 'Escoramentos removidos conforme projeto', resposta: '', observacao: '' },
    ],
  },
  {
    nome_secao: 'Alvenaria e Revestimentos',
    perguntas: [
      { pergunta: 'Alvenaria executada conforme projeto', resposta: '', observacao: '' },
      { pergunta: 'Revestimento interno adequado', resposta: '', observacao: '' },
      { pergunta: 'Revestimento externo adequado', resposta: '', observacao: '' },
      { pergunta: 'Regularização de piso executada', resposta: '', observacao: '' },
    ],
  },
  {
    nome_secao: 'Instalações Elétricas',
    perguntas: [
      { pergunta: 'Quadros elétricos instalados e identificados', resposta: '', observacao: '' },
      { pergunta: 'Eletrodutos e fiação conforme projeto', resposta: '', observacao: '' },
      { pergunta: 'Tomadas e interruptores instalados', resposta: '', observacao: '' },
      { pergunta: 'Aterramento executado', resposta: '', observacao: '' },
    ],
  },
  {
    nome_secao: 'Instalações Hidrossanitárias',
    perguntas: [
      { pergunta: 'Tubulações de água fria instaladas', resposta: '', observacao: '' },
      { pergunta: 'Tubulações de esgoto instaladas', resposta: '', observacao: '' },
      { pergunta: 'Pontos de água quente instalados', resposta: '', observacao: '' },
      { pergunta: 'Teste de estanqueidade realizado', resposta: '', observacao: '' },
    ],
  },
  {
    nome_secao: 'Esquadrias e Vidros',
    perguntas: [
      { pergunta: 'Esquadrias instaladas e alinhadas', resposta: '', observacao: '' },
      { pergunta: 'Vidros instalados sem trincas', resposta: '', observacao: '' },
      { pergunta: 'Vedação e silicone aplicados', resposta: '', observacao: '' },
    ],
  },
  {
    nome_secao: 'Segurança e Limpeza',
    perguntas: [
      { pergunta: 'EPI em uso pelos trabalhadores', resposta: '', observacao: '' },
      { pergunta: 'Andaimes e escoramentos seguros', resposta: '', observacao: '' },
      { pergunta: 'Limpeza geral do canteiro', resposta: '', observacao: '' },
      { pergunta: 'Sinalização de obra adequada', resposta: '', observacao: '' },
    ],
  },
];

export default function EditarVistoriadeObra() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const relatorioId = params.get('relatorioId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [empreendimento, setEmpreendimento] = useState(null);
  const [expandedSections, setExpandedSections] = useState({ 0: true });

  const [titulo, setTitulo] = useState('Vistoria de Obra Padrão');
  const [subtitulo, setSubtitulo] = useState('');
  const [cliente, setCliente] = useState('');
  const [dataInspecao, setDataInspecao] = useState('');
  const [revisao, setRevisao] = useState('00');
  const [engResponsavel, setEngResponsavel] = useState('');
  const [observacoesGerais, setObservacoesGerais] = useState('');
  const [secoes, setSecoes] = useState(DEFAULT_SECOES);

  useEffect(() => {
    if (!relatorioId) { setError('ID não informado'); setLoading(false); return; }
    const load = async () => {
      try {
        const data = await InspecaoVistoriaObraPadrao.get(relatorioId);
        if (!data) throw new Error('Vistoria não encontrada');

        setTitulo(data.titulo_relatorio || 'Vistoria de Obra Padrão');
        setSubtitulo(data.subtitulo_relatorio || '');
        setCliente(data.cliente || '');
        setDataInspecao(data.data_inspecao ? data.data_inspecao.slice(0, 10) : '');
        setRevisao(data.revisao || '00');
        setEngResponsavel(data.eng_responsavel || '');
        setObservacoesGerais(data.observacoes_gerais || '');
        setSecoes(Array.isArray(data.secoes) && data.secoes.length ? data.secoes : DEFAULT_SECOES);

        if (data.id_empreendimento) {
          const emp = await Empreendimento.get(data.id_empreendimento);
          setEmpreendimento(emp);
          if (!data.cliente && emp?.cli_empreendimento) setCliente(emp.cli_empreendimento);
        }
      } catch (err) {
        setError(err.message || 'Erro ao carregar vistoria');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [relatorioId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await InspecaoVistoriaObraPadrao.update(relatorioId, {
        titulo_relatorio: titulo,
        subtitulo_relatorio: subtitulo,
        cliente,
        data_inspecao: dataInspecao || null,
        revisao,
        eng_responsavel: engResponsavel,
        observacoes_gerais: observacoesGerais,
        secoes,
      });
      navigate(createPageUrl(`VisualizarInspecaoVistoriaObraPadrao?relatorioId=${relatorioId}`));
    } catch (err) {
      alert('Erro ao salvar: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const addSection = () => {
    const idx = secoes.length;
    setSecoes(prev => [...prev, { nome_secao: 'Nova Seção', perguntas: [{ pergunta: '', resposta: '', observacao: '' }] }]);
    setExpandedSections(prev => ({ ...prev, [idx]: true }));
  };

  const removeSection = (idx) => setSecoes(prev => prev.filter((_, i) => i !== idx));

  const updateSectionName = (idx, name) =>
    setSecoes(prev => prev.map((s, i) => i === idx ? { ...s, nome_secao: name } : s));

  const addQuestion = (secIdx) =>
    setSecoes(prev => prev.map((s, i) => i === secIdx
      ? { ...s, perguntas: [...s.perguntas, { pergunta: '', resposta: '', observacao: '' }] }
      : s));

  const removeQuestion = (secIdx, qIdx) =>
    setSecoes(prev => prev.map((s, i) => i === secIdx
      ? { ...s, perguntas: s.perguntas.filter((_, j) => j !== qIdx) }
      : s));

  const updateQuestion = (secIdx, qIdx, field, value) =>
    setSecoes(prev => prev.map((s, i) => i === secIdx
      ? { ...s, perguntas: s.perguntas.map((p, j) => j === qIdx ? { ...p, [field]: value } : p) }
      : s));

  const toggleSection = (idx) =>
    setExpandedSections(prev => ({ ...prev, [idx]: !prev[idx] }));

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );

  if (error) return (
    <div className="p-8 text-center">
      <p className="text-red-600 mb-4">{error}</p>
      <Button onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-1">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <h1 className="text-2xl font-bold">Editar Vistoria de Obra</h1>
          {empreendimento && (
            <p className="text-sm text-gray-500 mt-0.5">{empreendimento.nome_empreendimento}</p>
          )}
        </div>
        <div className="flex gap-2 mt-1">
          <Button variant="outline" onClick={() => navigate(createPageUrl(`VisualizarInspecaoVistoriaObraPadrao?relatorioId=${relatorioId}`))}>
            <Eye className="w-4 h-4 mr-2" />Ver Relatório
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* Informações Gerais */}
      <Card>
        <CardHeader><CardTitle className="text-base">Informações Gerais</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1 md:col-span-2">
            <Label>Título do Relatório</Label>
            <Input value={titulo} onChange={e => setTitulo(e.target.value)} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Subtítulo</Label>
            <Input value={subtitulo} onChange={e => setSubtitulo(e.target.value)} placeholder="Ex.: Vistoria de acompanhamento #1" />
          </div>
          <div className="space-y-1">
            <Label>Cliente</Label>
            <Input value={cliente} onChange={e => setCliente(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Engenheiro Responsável</Label>
            <Input value={engResponsavel} onChange={e => setEngResponsavel(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Data da Inspeção</Label>
            <Input type="date" value={dataInspecao} onChange={e => setDataInspecao(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Revisão</Label>
            <Input value={revisao} onChange={e => setRevisao(e.target.value)} placeholder="00" />
          </div>
        </CardContent>
      </Card>

      {/* Seções */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Seções da Vistoria</h2>
          <Button variant="outline" size="sm" onClick={addSection}>
            <Plus className="w-4 h-4 mr-1" />Adicionar Seção
          </Button>
        </div>

        {secoes.map((secao, secIdx) => (
          <Card key={secIdx} className="border overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer select-none bg-gray-50 hover:bg-gray-100 transition-colors"
              onClick={() => toggleSection(secIdx)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Input
                  value={secao.nome_secao}
                  onChange={e => { e.stopPropagation(); updateSectionName(secIdx, e.target.value); }}
                  onClick={e => e.stopPropagation()}
                  className="font-semibold text-sm border-0 shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent w-auto flex-1"
                />
                <span className="text-xs text-gray-400 shrink-0">({secao.perguntas.length} itens)</span>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={e => { e.stopPropagation(); removeSection(secIdx); }}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {expandedSections[secIdx]
                  ? <ChevronUp className="w-4 h-4 text-gray-400" />
                  : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </div>

            {expandedSections[secIdx] && (
              <CardContent className="pt-3 space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1 mb-1">
                  <span className="col-span-5">Item / Pergunta</span>
                  <span className="col-span-3">Resposta</span>
                  <span className="col-span-3">Observação</span>
                  <span className="col-span-1"></span>
                </div>
                {secao.perguntas.map((pergunta, qIdx) => (
                  <div key={qIdx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <Input
                        value={pergunta.pergunta}
                        onChange={e => updateQuestion(secIdx, qIdx, 'pergunta', e.target.value)}
                        placeholder="Descrição do item..."
                        className="text-sm h-8"
                      />
                    </div>
                    <div className="col-span-3">
                      <Select
                        value={pergunta.resposta || ''}
                        onValueChange={v => updateQuestion(secIdx, qIdx, 'resposta', v)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="—">—</SelectItem>
                          {RESPOSTAS.map(r => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Input
                        value={pergunta.observacao}
                        onChange={e => updateQuestion(secIdx, qIdx, 'observacao', e.target.value)}
                        placeholder="Obs..."
                        className="text-sm h-8"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={() => removeQuestion(secIdx, qIdx)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700 mt-1 h-7 text-xs"
                  onClick={() => addQuestion(secIdx)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />Adicionar Item
                </Button>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Observações Gerais */}
      <Card>
        <CardHeader><CardTitle className="text-base">Observações Gerais</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            value={observacoesGerais}
            onChange={e => setObservacoesGerais(e.target.value)}
            placeholder="Observações e considerações gerais da vistoria..."
            rows={4}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 pb-8">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? 'Salvando...' : 'Salvar Vistoria'}
        </Button>
      </div>
    </div>
  );
}
