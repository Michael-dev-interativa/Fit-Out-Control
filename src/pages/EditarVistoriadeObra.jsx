import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { RespostaVistoria, Empreendimento } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import { getUploadUrl } from '@/api/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Trash2, Save, Eye, ChevronDown, ChevronUp, Loader2, Camera } from 'lucide-react';

import { OP, OP_LAUDOS, DEFAULT_SECOES } from '@/lib/vistoriaObraDefaults';

// Migra perguntas antigas (sem tipo/opcoes) para o novo formato
const migrateSecoes = (secoes) =>
  secoes.map(s => ({
    ...s,
    perguntas: (s.perguntas || []).map(p => ({
      foto: null,
      ...p,
      tipo: p.tipo || 'select',
      opcoes: Array.isArray(p.opcoes) ? p.opcoes : OP,
    })),
  }));

// ─── Linha de pergunta ────────────────────────────────────────────────────────
function QuestionRow({ perg, secIdx, qIdx, onUpdate, onRemove }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await UploadFile({ file });
      onUpdate(secIdx, qIdx, 'foto', res?.file_url || res?.file_path || null);
    } catch {
      // silent
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (perg.tipo === 'signature') {
    return (
      <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg border border-dashed border-gray-200">
        <span className="text-sm text-gray-600 italic">{perg.pergunta}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">— assinatura na impressão —</span>
          <button onClick={() => onRemove(secIdx, qIdx)} className="text-gray-300 hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  const hasPhoto = perg.tipo === 'select_with_photo';
  const photoUrl = perg.foto ? getUploadUrl(perg.foto) : null;

  return (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-2">
      <div className="flex items-start gap-2">
        <p className="flex-1 text-sm text-gray-800 leading-snug">{perg.pergunta || '—'}</p>
        <button onClick={() => onRemove(secIdx, qIdx)} className="text-gray-300 hover:text-red-500 transition-colors mt-0.5 shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Resposta */}
        <Select value={perg.resposta || ''} onValueChange={v => onUpdate(secIdx, qIdx, 'resposta', v)}>
          <SelectTrigger className="h-8 text-xs w-44 shrink-0">
            <SelectValue placeholder="— Selecionar —" />
          </SelectTrigger>
          <SelectContent>
            {(perg.opcoes || []).map(o => (
              <SelectItem key={o.texto} value={o.texto}>{o.texto}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Foto */}
        {hasPhoto && (
          <>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
            {photoUrl ? (
              <div className="relative shrink-0">
                <img src={photoUrl} alt="" className="h-8 w-12 object-cover rounded border border-gray-200" />
                <button
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs leading-none"
                  onClick={() => onUpdate(secIdx, qIdx, 'foto', null)}
                >×</button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 border border-dashed border-gray-300 rounded px-2 h-8 transition-colors shrink-0"
              >
                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                {uploading ? 'Enviando...' : 'Foto'}
              </button>
            )}
          </>
        )}

        {/* Observação */}
        <Input
          value={perg.observacao || ''}
          onChange={e => onUpdate(secIdx, qIdx, 'observacao', e.target.value)}
          placeholder="Observação..."
          className="text-xs h-8 flex-1 min-w-28"
        />
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function EditarVistoriadeObra() {
  const navigate = useNavigate();
  const location = useLocation();
  const relatorioId = new URLSearchParams(location.search).get('relatorioId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [empreendimento, setEmpreendimento] = useState(null);
  const [expanded, setExpanded] = useState({ 0: true });

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
        const data = await RespostaVistoria.get(relatorioId);
        if (!data) throw new Error('Vistoria não encontrada');

        const ef = data.estrutura_formulario || {};
        setTitulo(data.nome_vistoria || 'Vistoria de Obra Padrão');
        setSubtitulo(data.texto_escopo_consultoria || '');
        setCliente(ef.cliente || '');
        setDataInspecao(data.data_vistoria ? data.data_vistoria.slice(0, 10) : '');
        setRevisao(data.revisao || '00');
        setEngResponsavel(data.consultor_responsavel || '');
        setObservacoesGerais(ef.observacoes_gerais || '');
        setSecoes(
          Array.isArray(ef.secoes) && ef.secoes.length
            ? migrateSecoes(ef.secoes)
            : DEFAULT_SECOES
        );

        if (data.id_empreendimento) {
          const emp = await Empreendimento.get(data.id_empreendimento);
          setEmpreendimento(emp);
          if (!ef.cliente && emp?.cli_empreendimento) setCliente(emp.cli_empreendimento);
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
      await RespostaVistoria.update(relatorioId, {
        nome_vistoria: titulo,
        texto_escopo_consultoria: subtitulo,
        consultor_responsavel: engResponsavel,
        data_vistoria: dataInspecao || null,
        revisao,
        estrutura_formulario: {
          cliente,
          observacoes_gerais: observacoesGerais,
          secoes,
        },
      });
      navigate(createPageUrl(`VisualizarInspecaoVistoriaObraPadrao?relatorioId=${relatorioId}`));
    } catch (err) {
      if (err.status === 401 || err.status === 404) {
        alert('Sessão expirada. Faça logout e login novamente, depois tente salvar outra vez.');
        return;
      }
      alert('Erro ao salvar: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const addSection = () => {
    const idx = secoes.length;
    setSecoes(prev => [...prev, { nome_secao: 'Nova Seção', perguntas: [{ pergunta: '', tipo: 'select', opcoes: OP, resposta: '', observacao: '', foto: null }] }]);
    setExpanded(prev => ({ ...prev, [idx]: true }));
  };

  const removeSection = (idx) => setSecoes(prev => prev.filter((_, i) => i !== idx));

  const updateSectionName = (idx, name) =>
    setSecoes(prev => prev.map((s, i) => i === idx ? { ...s, nome_secao: name } : s));

  const addQuestion = (secIdx) =>
    setSecoes(prev => prev.map((s, i) => i === secIdx
      ? { ...s, perguntas: [...s.perguntas, { pergunta: '', tipo: 'select_with_photo', opcoes: OP, resposta: '', observacao: '', foto: null }] }
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
    setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));

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
      {/* Cabeçalho */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-1">
            <ArrowLeft className="w-4 h-4" />Voltar
          </button>
          <h1 className="text-2xl font-bold">Editar Vistoria de Obra</h1>
          {empreendimento && <p className="text-sm text-gray-500 mt-0.5">{empreendimento.nome_empreendimento}</p>}
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
          <h2 className="text-lg font-semibold">Itens da Vistoria</h2>
          <Button variant="outline" size="sm" onClick={addSection}>
            <Plus className="w-4 h-4 mr-1" />Nova Seção
          </Button>
        </div>

        {secoes.map((secao, secIdx) => (
          <Card key={secIdx} className="border overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer select-none bg-slate-800 hover:bg-slate-700 transition-colors"
              onClick={() => toggleSection(secIdx)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="font-semibold text-sm text-white truncate">{secao.nome_secao}</span>
                <span className="text-xs text-slate-400 shrink-0">({secao.perguntas.length} itens)</span>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={e => { e.stopPropagation(); removeSection(secIdx); }}
                  className="p-1 text-slate-400 hover:text-red-400 transition-colors rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {expanded[secIdx]
                  ? <ChevronUp className="w-4 h-4 text-slate-400" />
                  : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </div>

            {expanded[secIdx] && (
              <CardContent className="pt-3 space-y-2 bg-white">
                {secao.perguntas.map((perg, qIdx) => (
                  <QuestionRow
                    key={qIdx}
                    perg={perg}
                    secIdx={secIdx}
                    qIdx={qIdx}
                    onUpdate={updateQuestion}
                    onRemove={removeQuestion}
                  />
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700 h-7 text-xs mt-1"
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
