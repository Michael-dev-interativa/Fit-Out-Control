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

const OP = [
  { texto: 'Finalizado', cor: 'green' },
  { texto: 'Em andamento', cor: 'blue' },
  { texto: 'Pendente', cor: 'red' },
  { texto: 'Não se Aplica', cor: 'yellow' },
  { texto: 'Informativo', cor: 'purple' },
];
const OP_LAUDOS = [
  { texto: 'Conforme', cor: 'green' },
  { texto: 'Não Conforme', cor: 'red' },
  { texto: 'Pendente', cor: 'red' },
  { texto: 'Não se Aplica', cor: 'yellow' },
  { texto: 'Informativo', cor: 'purple' },
];

const q = (pergunta, tipo = 'select_with_photo', opcoes = OP) => ({ pergunta, tipo, opcoes, resposta: '', observacao: '', foto: null });
const ql = (pergunta) => q(pergunta, 'select', OP_LAUDOS);

const DEFAULT_SECOES = [
  {
    nome_secao: 'ARQUITETURA',
    perguntas: [
      q('Validação do layout proposto - Divisórias, conforme projeto aprovado'),
      q('Validação do layout proposto - Piso, conforme projeto aprovado'),
      q('Validação do layout proposto - Forro, conforme projeto aprovado'),
      q('Validação dos elementos de fachada, conforme projeto aprovado'),
      q('Validação das readequações nas áreas comuns - Hall dos elevadores ou corredores ou escadas de emergência'),
      q('Validação das readequações nas áreas comuns - Área externa ou subsolos ou coberturas'),
      q('Validação das instalações nas áreas comuns - Áreas técnicas do condomínio para certificar alterações'),
      q('Validação das proteções das áreas comuns'),
      q('Verificação das paredes divisórias entre conjuntos para certificar que não foram passadas instalações ou realizadas furações'),
      q('Validação das intervenções estruturais em lajes e vigas, quando aplicável, conforme projeto aprovado'),
      q('Validação de reforços estruturais, quando aplicável, conforme projeto aprovado'),
      q('Validação de proteção passiva, quando aplicável'),
      q('Validação da impermeabilização das áreas molhadas'),
      q('Verificação possíveis infiltrações no ambiente diretamente abaixo das áreas impermeabilizadas, junto ao condomínio'),
    ],
  },
  {
    nome_secao: 'INSTALAÇÕES ELÉTRICAS E SISTEMAS ELETRÔNICOS',
    perguntas: [
      q('Verificação do quadro elétrico de alimentação do condomínio, para certificar alterações, quando aprovado em projeto'),
      q('Validação dos quadros elétricos dos conjuntos, conforme projeto aprovado'),
      q('Validação do caminhamento das infras estruturas (elétrica e de sistemas), conforme projeto aprovado'),
      q('Verificação do aterramento do piso elevado e conexão com quadro elétrico (Atentar-se se não foi aterrado junto à fachada)'),
      q('Validação das portas automáticas ou com controle de acesso, quando aplicável, conforme projeto aprovado'),
    ],
  },
  {
    nome_secao: 'INSTALAÇÕES HIDRÁULICAS',
    perguntas: [
      q('Validação do caminhamento das tubulações hidrossanitárias, caimentos e suas dimensões e posicionamento conforme projeto aprovado'),
      q('Validação das interligações dos equipamentos de captação com as redes de coleta de efluentes dedicadas (Esgoto à Vácuo, Esgoto Gorduroso, Esgoto Comum, Dreno de Condensado)'),
      q('Validação da interligação das novas tubulações de água fria no Medidor, quando aplicável'),
      q('Validação dos dispositivos redutores de vazão nos novos pontos de água fria (máquina de café e filtros), quando aplicável'),
      q('Validação das instalações de Louças e metais sanitários, quando aplicável, conforme diretriz LEED e manual de obra'),
    ],
  },
  {
    nome_secao: 'INSTALAÇÕES DE COMBATE A INCÊNDIO, DETECÇÃO E ALARME',
    perguntas: [
      q('Validação do caminhamento da tubulação de sprinkler e suas dimensões e posicionamento (incluindo altura em áreas sem forro) dos bicos conforme projeto aprovado'),
      q('Validação do caminhamento dos hidrantes remanejados e/ou novos conforme projeto, quando aplicável, aprovado pelo consultor de bombeiro'),
      q('Validação de compartimentações de incêndio e detalhes conforme normas (1m para cada lado em fachadas) quando aplicável, aprovado pelo consultor de bombeiro'),
      q('Validação dos posicionamentos dos extintores conforme projeto aprovado'),
      q('Validação do posicionamento dos pontos de detectores fumaça conforme projeto aprovado'),
      q('Validação dos posicionamentos dos acionadores manuais conforme projeto aprovado'),
      q('Validação dos posicionamentos dos dispositivos áudio-visual (sonofletores) conforme projeto aprovado'),
      q('Validação dos posicionamentos das luminárias de emergência conforme projeto aprovado'),
      q('Validação dos posicionamentos das sinalizações de emergência conforme projeto aprovado'),
      q('Validação da instalação de hotline conforme projeto aprovado'),
      q('Validação do aumento das portas de rota de fuga, quando aplicável, aprovado pelo consultor de bombeiro'),
      q('Validação dos módulos de acionamentos para dispositivos de liberação em caso de incêndio: Extração de Fumaça, Portas de Acesso'),
    ],
  },
  {
    nome_secao: 'INSTALAÇÕES DE AR CONDICIONADO',
    perguntas: [
      q('Validação do caminhamento de dutos de ar condicionado e suas dimensões conforme projeto aprovado'),
      q('Verificação das instalações dos equipamentos de ar condicionado novos e/ou remanejados, conforme projeto aprovado'),
      q('Validação do caminhamento de dutos de exaustão e suas dimensões conforme projeto aprovado'),
      q('Validação do sistema de exaustão para copa ou cozinha, quando aplicável, conforme projeto aprovado'),
      q('Validação do caminhamento dos dutos do sistema de extração de fumaça, e suas dimensões conforme projeto aprovado'),
      q('Validação do material utilizado para isolamento dos dutos de extração de fumaça ou exaustão de gordura conforme projeto aprovado'),
      q('Validação do posicionamento das grelhas de extração de fumaça conforme projeto aprovado'),
      q('Validação do posicionamento das grelhas de insuflamento de ar limpo para o sistema de extração de fumaça conforme projeto aprovado'),
      q('Validação de alçapões para manutenções dos equipamentos, conforme orientação do condomínio'),
    ],
  },
  {
    nome_secao: 'LAUDOS',
    perguntas: [
      ql('Apresentação do laudo de impermeabilização'),
      ql('Apresentação da ART do laudo de impermeabilização'),
      ql('Apresentação do laudo de comissionamento dos detectores e equipamentos do SDAI'),
      ql('Apresentação da ART do laudo de comissionamento dos detectores e equipamentos do SDAI'),
      ql('Apresentação do laudo de pressurização dos sprinklers'),
      ql('Apresentação da ART do laudo de pressurização dos sprinklers'),
      ql('Apresentação do certificado de calibração do manômetro utilizado do teste de pressurização dos sprinklers'),
      ql('Apresentação do laudo de funcionamento e comissionamento dos sistemas de ar condicionado'),
      ql('Apresentação da ART do laudo de funcionamento e comissionamento dos sistemas de ar condicionado'),
      ql('Apresentação de relatório fotográfico das instalações em geral no entreforro'),
    ],
  },
  {
    nome_secao: 'PROJETOS AS BUILT',
    perguntas: [
      { pergunta: 'Apresentação dos projetos as builts', tipo: 'select', opcoes: [], resposta: '', observacao: '', foto: null },
    ],
  },
  {
    nome_secao: 'STATUS/VISTORIA DA OBRA',
    perguntas: [
      { pergunta: 'Status da Vistoria', tipo: 'select', opcoes: [{ texto: 'Liberado Para Ocupação', cor: 'green' }, { texto: 'Não Liberado para Ocupação', cor: 'red' }], resposta: '', observacao: '', foto: null },
    ],
  },
  {
    nome_secao: 'ASSINATURAS',
    perguntas: [
      { pergunta: 'Assinatura do consultor', tipo: 'signature', opcoes: [], resposta: '', observacao: '', foto: null },
      { pergunta: 'Assinatura do Locatário', tipo: 'signature', opcoes: [], resposta: '', observacao: '', foto: null },
      { pergunta: 'Assinatura do Condomínio', tipo: 'signature', opcoes: [], resposta: '', observacao: '', foto: null },
    ],
  },
];

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
