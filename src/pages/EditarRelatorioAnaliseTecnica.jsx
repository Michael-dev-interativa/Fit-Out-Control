import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Trash2, Save, Eye, Send, Image as ImageIcon, X } from 'lucide-react';
import { format } from 'date-fns';

const emptyArquivo = () => ({
  disciplina: '',
  descricao: '',
  arquivo: '',
  ref: '0',
  data_cadastro: format(new Date(), 'yyyy-MM-dd'),
  status: 'PD',
  comentario_tecnico: '',
  resposta_cliente: '',
  status_resposta: 'Pendente',
});

const emptyProjeto = () => ({
  item: '',
  acao: '',
  descricao: '',
  situacao: 'PD',
  comentarios: [],
});

const emptyComentario = () => ({
  texto: '',
  imagens: [],
});

const toDateInputValue = (value) => {
  if (!value) return '';
  const s = String(value);
  return s.includes('T') ? s.slice(0, 10) : s;
};

const normalizeRelatorioDates = (data) => {
  if (!data) return data;
  return {
    ...data,
    data_emissao: toDateInputValue(data.data_emissao),
    revisoes: (data.revisoes || []).map((rev) => ({
      ...rev,
      data: toDateInputValue(rev?.data),
    })),
    lista_arquivos: (data.lista_arquivos || []).map((arq) => ({
      ...arq,
      data_cadastro: toDateInputValue(arq?.data_cadastro),
    })),
  };
};

export default function EditarRelatorioAnaliseTecnica({ theme }) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const isDark = theme === 'dark';

  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [uploadingImage, setUploadingImage] = useState({});

  useEffect(() => {
    if (!id) return;
    base44.entities.RelatorioAnaliseTecnica.get(id).then(data => {
      setForm(normalizeRelatorioDates(data));
      setLoading(false);
    });
  }, [id]);

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const addArquivo = () => setField('lista_arquivos', [...(form.lista_arquivos || []), emptyArquivo()]);
  const removeArquivo = (i) => setField('lista_arquivos', form.lista_arquivos.filter((_, idx) => idx !== i));
  const updateArquivo = (i, key, value) => {
    const updated = [...form.lista_arquivos];
    updated[i] = { ...updated[i], [key]: value };
    setField('lista_arquivos', updated);
  };

  const addRevisao = () => setField('revisoes', [...(form.revisoes || []), { rev: String((form.revisoes || []).length), descricao: '', data: format(new Date(), 'yyyy-MM-dd') }]);
  const removeRevisao = (i) => setField('revisoes', form.revisoes.filter((_, idx) => idx !== i));
  const updateRevisao = (i, key, value) => {
    const updated = [...form.revisoes];
    updated[i] = { ...updated[i], [key]: value };
    setField('revisoes', updated);
  };

  // Funções genéricas para arrays de seções (projetos, eletricas, etc)
  const addItem = (fieldName) => setField(fieldName, [...(form[fieldName] || []), emptyProjeto()]);
  const removeItem = (fieldName, i) => setField(fieldName, form[fieldName].filter((_, idx) => idx !== i));
  const updateItem = (fieldName, i, key, value) => {
    const updated = [...form[fieldName]];
    updated[i] = { ...updated[i], [key]: value };
    setField(fieldName, updated);
  };

  const addComentario = (fieldName, projIdx) => {
    const updated = [...form[fieldName]];
    updated[projIdx] = { ...updated[projIdx], comentarios: [...(updated[projIdx].comentarios || []), emptyComentario()] };
    setField(fieldName, updated);
  };

  const removeComentario = (fieldName, projIdx, comIdx) => {
    const updated = [...form[fieldName]];
    updated[projIdx].comentarios = updated[projIdx].comentarios.filter((_, idx) => idx !== comIdx);
    setField(fieldName, updated);
  };

  const updateComentario = (fieldName, projIdx, comIdx, key, value) => {
    const updated = [...form[fieldName]];
    updated[projIdx].comentarios[comIdx] = { ...updated[projIdx].comentarios[comIdx], [key]: value };
    setField(fieldName, updated);
  };

  const addComentarioImagem = (fieldName, projIdx, comIdx, imageUrl) => {
    const updated = [...form[fieldName]];
    updated[projIdx].comentarios[comIdx].imagens = [...(updated[projIdx].comentarios[comIdx].imagens || []), imageUrl];
    setField(fieldName, updated);
  };

  const removeComentarioImagem = (fieldName, projIdx, comIdx, imgIdx) => {
    const updated = [...form[fieldName]];
    updated[projIdx].comentarios[comIdx].imagens = updated[projIdx].comentarios[comIdx].imagens.filter((_, idx) => idx !== imgIdx);
    setField(fieldName, updated);
  };

  const handleSave = async (status) => {
    if (!id || !form) {
      alert('ID do relatório ou dados não encontrados');
      return;
    }
    try {
      setSaving(true);
      const dataToSave = status ? { ...form, status_relatorio: status } : form;
      console.log('Salvando relatório:', id, dataToSave);
      await base44.entities.RelatorioAnaliseTecnica.update(id, dataToSave);
      setForm(dataToSave);
      setSaving(false);
      alert('Relatório salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setSaving(false);
      alert('Erro ao salvar: ' + error.message);
    }
  };

  const handleEmitir = () => handleSave('Aguardando Resposta');

  if (loading) return <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div className={`min-h-screen p-6 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <h1 className="text-2xl font-bold flex-1">Editar Relatório de Análise Técnica</h1>
          <Button variant="outline" onClick={() => navigate(`/VisualizarRelatorioAnaliseTecnica?id=${id}`)}>
            <Eye className="w-4 h-4 mr-2" />Visualizar
          </Button>
          <Button onClick={handleEmitir} disabled={saving} className="bg-yellow-500 hover:bg-yellow-600 text-white">
            <Send className="w-4 h-4 mr-2" />Emitir para Cliente
          </Button>
          <Button onClick={() => handleSave()} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Save className="w-4 h-4 mr-2" />{saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>

        {/* Status atual */}
        <div className={`rounded-lg border px-4 py-3 flex items-center gap-3 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <span className="text-sm font-medium">Status:</span>
          <select value={form.status_relatorio || 'Rascunho'} onChange={e => setField('status_relatorio', e.target.value)}
            className={`border rounded px-3 py-1 text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
            {['Rascunho','Emitido','Aguardando Resposta','Respondido','Encerrado'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Dados Gerais */}
        <div className={`rounded-xl border p-5 space-y-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className="font-semibold text-lg border-b pb-2">Dados Gerais</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>OS</Label><Input value={form.numero_os || ''} onChange={e => setField('numero_os', e.target.value)} /></div>
            <div><Label>Metragem (m²)</Label><Input value={form.metragem || ''} onChange={e => setField('metragem', e.target.value)} /></div>
            <div className="col-span-2"><Label>Edifício / Pavimento</Label><Input value={form.edificio_pavimento || ''} onChange={e => setField('edificio_pavimento', e.target.value)} /></div>
            <div className="col-span-2"><Label>Nome do Arquivo</Label><Input value={form.nome_arquivo || ''} onChange={e => setField('nome_arquivo', e.target.value)} /></div>
            <div><Label>Data de Emissão</Label><Input type="date" value={toDateInputValue(form.data_emissao)} onChange={e => setField('data_emissao', e.target.value)} /></div>
            <div><Label>Fase de Emissão</Label><Input value={form.fase_emissao || ''} onChange={e => setField('fase_emissao', e.target.value)} placeholder="Ex: 1ª Emissão" /></div>
          </div>
        </div>

        {/* Revisões */}
        <div className={`rounded-xl border p-5 space-y-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="font-semibold text-lg">Revisões</h2>
            <Button size="sm" variant="outline" onClick={addRevisao}><Plus className="w-4 h-4 mr-1" />Adicionar</Button>
          </div>
          {(form.revisoes || []).map((rev, i) => (
            <div key={i} className="grid grid-cols-3 gap-3 items-end">
              <div><Label>Rev.</Label><Input value={rev.rev} onChange={e => updateRevisao(i, 'rev', e.target.value)} /></div>
              <div><Label>Descrição</Label><Input value={rev.descricao} onChange={e => updateRevisao(i, 'descricao', e.target.value)} /></div>
              <div className="flex gap-2 items-end">
                <div className="flex-1"><Label>Data</Label><Input type="date" value={toDateInputValue(rev.data)} onChange={e => updateRevisao(i, 'data', e.target.value)} /></div>
                <Button size="icon" variant="ghost" className="text-red-500 h-9 w-9 mb-0" onClick={() => removeRevisao(i)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>

        {/* Lista de Arquivos */}
        <div className={`rounded-xl border p-5 space-y-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="font-semibold text-lg">Lista Mestra de Arquivos Analisados</h2>
            <Button size="sm" variant="outline" onClick={addArquivo}><Plus className="w-4 h-4 mr-1" />Adicionar</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className={isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}>
                  <th className="border px-2 py-2 text-left w-32">DES</th>
                  <th className="border px-2 py-2 text-left">DESCRIÇÃO</th>
                  <th className="border px-2 py-2 text-left">ARQUIVO</th>
                  <th className="border px-2 py-2 text-left w-20">REV</th>
                  <th className="border px-2 py-2 text-left w-36">DATA DE CADASTRO</th>
                  <th className="border px-2 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {(form.lista_arquivos || []).flatMap((arq, i) => [
                  (
                    <tr key={`arq-${i}`} className={isDark ? 'border-gray-600' : 'border-gray-200'}>
                      <td className="border px-1 py-1"><Input className="border-0 bg-transparent h-7 text-xs p-1" value={arq.disciplina} onChange={e => updateArquivo(i, 'disciplina', e.target.value)} /></td>
                      <td className="border px-1 py-1"><Input className="border-0 bg-transparent h-7 text-xs p-1" value={arq.descricao} onChange={e => updateArquivo(i, 'descricao', e.target.value)} /></td>
                      <td className="border px-1 py-1"><Input className="border-0 bg-transparent h-7 text-xs p-1" value={arq.arquivo} onChange={e => updateArquivo(i, 'arquivo', e.target.value)} /></td>
                      <td className="border px-1 py-1"><Input className="border-0 bg-transparent h-7 text-xs p-1" value={arq.ref} onChange={e => updateArquivo(i, 'ref', e.target.value)} /></td>
                      <td className="border px-1 py-1"><Input type="date" className="border-0 bg-transparent h-7 text-xs p-1" value={toDateInputValue(arq.data_cadastro)} onChange={e => updateArquivo(i, 'data_cadastro', e.target.value)} /></td>
                      <td className="border px-1 py-1 text-center">
                        <Button size="icon" variant="ghost" className="text-red-500 h-6 w-6" onClick={() => removeArquivo(i)}><Trash2 className="w-3 h-3" /></Button>
                      </td>
                    </tr>
                  ),
                  arq.resposta_cliente ? (
                    <tr key={`resp-${i}`}>
                      <td colSpan={6} className="border px-3 py-2 bg-green-50">
                        <span className="text-xs font-medium text-green-700">Resposta do Cliente: </span>
                        <span className="text-xs text-green-800">{arq.resposta_cliente}</span>
                        <span className="text-xs text-green-600 font-medium ml-2">({arq.status_resposta})</span>
                      </td>
                    </tr>
                  ) : null
                ])}
              </tbody>
            </table>
          </div>
        </div>

        {/* Projetos de Engenharia */}
        <div className={`rounded-xl border p-5 space-y-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="font-semibold text-lg">Projeto de Arquitetura</h2>
            <Button size="sm" variant="outline" onClick={() => addItem('projetos')}><Plus className="w-4 h-4 mr-1" />Adicionar</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className={isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}>
                  <th className="border px-2 py-2 text-left w-24">ITEM</th>
                  <th className="border px-2 py-2 text-left">AÇÃO</th>
                  <th className="border px-2 py-2 text-left flex-1">DESCRIÇÃO</th>
                  <th className="border px-2 py-2 text-center w-20">SIT</th>
                  <th className="border px-2 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {(form['projetos'] || []).flatMap((proj, i) => [
                  (
                    <tr key={`proj-${i}`} className={isDark ? 'border-gray-600' : 'border-gray-200'} onClick={() => setExpandedRows(prev => ({ ...prev, [`projetos-${i}`]: !prev[`projetos-${i}`] }))} style={{ cursor: 'pointer' }}>
                      <td className="border px-2 py-2"><Input className="border-0 bg-transparent h-7 text-xs p-1" value={proj.item || ''} onChange={e => { e.stopPropagation(); updateItem('projetos', i, 'item', e.target.value); }} placeholder="Item 1" /></td>
                      <td className="border px-2 py-2"><Input className="border-0 bg-transparent h-7 text-xs p-1" value={proj.acao || ''} onChange={e => { e.stopPropagation(); updateItem('projetos', i, 'acao', e.target.value); }} placeholder="Ação" /></td>
                      <td className="border px-2 py-2"><Textarea className="border-0 bg-transparent text-xs p-1" value={proj.descricao || ''} onChange={e => { e.stopPropagation(); updateItem('projetos', i, 'descricao', e.target.value); }} rows={1} placeholder="Descrição" /></td>
                      <td className="border px-2 py-2 text-center"><select className="border-0 bg-transparent text-xs p-1" value={proj.situacao || 'PD'} onChange={e => { e.stopPropagation(); updateItem('projetos', i, 'situacao', e.target.value); }}><option value="OK">OK</option><option value="PD">PD</option><option value="IN">IN</option></select></td>
                      <td className="border px-2 py-2 text-center" onClick={e => e.stopPropagation()}><Button size="icon" variant="ghost" className="text-red-500 h-6 w-6" onClick={() => removeItem('projetos', i)}><Trash2 className="w-3 h-3" /></Button></td>
                    </tr>
                  ),
                  expandedRows[`projetos-${i}`] ? (
                    <tr key={`exp-${i}`} className={isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}>
                      <td colSpan={5} className="border px-4 py-3">
                        <div className="space-y-4">
                          {/* Lista de comentários existentes */}
                          {(proj.comentarios || []).map((com, comIdx) => (
                            <div key={comIdx} className={`p-3 rounded border space-y-2 ${isDark ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-200'}`}>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-semibold">Comentário {comIdx + 1}</span>
                                <button onClick={() => removeComentario('projetos', i, comIdx)} className={`p-1 rounded ${isDark ? 'hover:bg-gray-500' : 'hover:bg-gray-100'}`}>
                                  <X className="w-3 h-3 text-red-500" />
                                </button>
                              </div>
                              <Textarea
                                value={com.texto || ''}
                                onChange={e => updateComentario('projetos', i, comIdx, 'texto', e.target.value)}
                                placeholder="Digite um comentário..."
                                rows={2}
                                className="text-xs"
                              />
                              <div className="space-y-2">
                                <label htmlFor={`img-${i}-${comIdx}`} className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer text-xs transition-colors w-fit ${
                                  isDark ? 'bg-gray-500 border-gray-400 hover:bg-gray-400 text-white' : 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-600'
                                }`}>
                                  <ImageIcon className="w-3 h-3" />
                                  Anexar imagem
                                </label>
                                <input
                                  id={`img-${i}-${comIdx}`}
                                  type="file"
                                  accept="image/*"
                                  style={{ display: 'none' }}
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setUploadingImage(prev => ({ ...prev, [`${i}-${comIdx}`]: true }));
                                    try {
                                      const { file_url } = await base44.integrations.Core.UploadFile({ file });
                                      addComentarioImagem('projetos', i, comIdx, file_url);
                                    } catch (error) {
                                      console.error('Erro ao fazer upload:', error);
                                    }
                                    setUploadingImage(prev => ({ ...prev, [`${i}-${comIdx}`]: false }));
                                  }}
                                />
                                {/* Galeria de imagens */}
                                {(com.imagens && com.imagens.length > 0) && (
                                  <div className="grid grid-cols-2 gap-2 mt-2">
                                    {com.imagens.map((img, imgIdx) => (
                                      <div key={imgIdx} className="relative inline-block">
                                        <img src={img} alt={`Imagem ${imgIdx + 1}`} className="max-w-full max-h-40 rounded border border-gray-300" />
                                        <button
                                          onClick={() => removeComentarioImagem('projetos', i, comIdx, imgIdx)}
                                          className={`absolute top-1 right-1 p-1 rounded ${isDark ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white`}
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {uploadingImage[`${i}-${comIdx}`] && <p className="text-xs text-gray-500">Enviando...</p>}
                              </div>
                            </div>
                          ))}
                          {/* Botão para adicionar novo comentário */}
                          <Button size="sm" variant="outline" onClick={() => addComentario('projetos', i)} className="w-full">
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar comentário
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : null,
                ])}
              </tbody>
            </table>
          </div>
        </div>

        {/* Seções adicionais - Componente genérico */}
        {[
          { key: 'instalacoes_eletricas', title: 'Instalações Elétricas' },
          { key: 'instalacoes_hidraulicas', title: 'Instalações Hidráulicas' },
          { key: 'projeto_legal_bombeiro', title: 'Projeto Legal Bombeiro' },
          { key: 'instalacoes_hvac', title: 'Instalações HVAC' },
          { key: 'conclusao', title: 'Conclusão' }
        ].map(section => (
          <div key={section.key} className={`rounded-xl border p-5 space-y-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="font-semibold text-lg">{section.title}</h2>
              <Button size="sm" variant="outline" onClick={() => addItem(section.key)}><Plus className="w-4 h-4 mr-1" />Adicionar</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className={isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}>
                    <th className="border px-2 py-2 text-left w-24">ITEM</th>
                    <th className="border px-2 py-2 text-left">AÇÃO</th>
                    <th className="border px-2 py-2 text-left flex-1">DESCRIÇÃO</th>
                    <th className="border px-2 py-2 text-center w-20">SIT</th>
                    <th className="border px-2 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {(form[section.key] || []).flatMap((proj, i) => [
                    (
                      <tr key={`${section.key}-${i}`} className={isDark ? 'border-gray-600' : 'border-gray-200'} onClick={() => setExpandedRows(prev => ({ ...prev, [`${section.key}-${i}`]: !prev[`${section.key}-${i}`] }))} style={{ cursor: 'pointer' }}>
                        <td className="border px-2 py-2"><Input className="border-0 bg-transparent h-7 text-xs p-1" value={proj.item || ''} onChange={e => { e.stopPropagation(); updateItem(section.key, i, 'item', e.target.value); }} placeholder="Item 1" /></td>
                        <td className="border px-2 py-2"><Input className="border-0 bg-transparent h-7 text-xs p-1" value={proj.acao || ''} onChange={e => { e.stopPropagation(); updateItem(section.key, i, 'acao', e.target.value); }} placeholder="Ação" /></td>
                        <td className="border px-2 py-2"><Textarea className="border-0 bg-transparent text-xs p-1" value={proj.descricao || ''} onChange={e => { e.stopPropagation(); updateItem(section.key, i, 'descricao', e.target.value); }} rows={1} placeholder="Descrição" /></td>
                        <td className="border px-2 py-2 text-center"><select className="border-0 bg-transparent text-xs p-1" value={proj.situacao || 'PD'} onChange={e => { e.stopPropagation(); updateItem(section.key, i, 'situacao', e.target.value); }}><option value="OK">OK</option><option value="PD">PD</option><option value="IN">IN</option></select></td>
                        <td className="border px-2 py-2 text-center" onClick={e => e.stopPropagation()}><Button size="icon" variant="ghost" className="text-red-500 h-6 w-6" onClick={() => removeItem(section.key, i)}><Trash2 className="w-3 h-3" /></Button></td>
                      </tr>
                    ),
                    expandedRows[`${section.key}-${i}`] ? (
                      <tr key={`exp-${section.key}-${i}`} className={isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}>
                        <td colSpan={5} className="border px-4 py-3">
                          <div className="space-y-4">
                            {(proj.comentarios || []).map((com, comIdx) => (
                              <div key={comIdx} className={`p-3 rounded border space-y-2 ${isDark ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-200'}`}>
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs font-semibold">Comentário {comIdx + 1}</span>
                                  <button onClick={() => removeComentario(section.key, i, comIdx)} className={`p-1 rounded ${isDark ? 'hover:bg-gray-500' : 'hover:bg-gray-100'}`}>
                                    <X className="w-3 h-3 text-red-500" />
                                  </button>
                                </div>
                                <Textarea
                                  value={com.texto || ''}
                                  onChange={e => updateComentario(section.key, i, comIdx, 'texto', e.target.value)}
                                  placeholder="Digite um comentário..."
                                  rows={2}
                                  className="text-xs"
                                />
                                <div className="space-y-2">
                                  <label htmlFor={`img-${section.key}-${i}-${comIdx}`} className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer text-xs transition-colors w-fit ${
                                    isDark ? 'bg-gray-500 border-gray-400 hover:bg-gray-400 text-white' : 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-600'
                                  }`}>
                                    <ImageIcon className="w-3 h-3" />
                                    Anexar imagem
                                  </label>
                                  <input
                                    id={`img-${section.key}-${i}-${comIdx}`}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      setUploadingImage(prev => ({ ...prev, [`${section.key}-${i}-${comIdx}`]: true }));
                                      try {
                                        const { file_url } = await base44.integrations.Core.UploadFile({ file });
                                        addComentarioImagem(section.key, i, comIdx, file_url);
                                      } catch (error) {
                                        console.error('Erro ao fazer upload:', error);
                                      }
                                      setUploadingImage(prev => ({ ...prev, [`${section.key}-${i}-${comIdx}`]: false }));
                                    }}
                                  />
                                  {(com.imagens && com.imagens.length > 0) && (
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                      {com.imagens.map((img, imgIdx) => (
                                        <div key={imgIdx} className="relative inline-block">
                                          <img src={img} alt={`Imagem ${imgIdx + 1}`} className="max-w-full max-h-40 rounded border border-gray-300" />
                                          <button
                                            onClick={() => removeComentarioImagem(section.key, i, comIdx, imgIdx)}
                                            className={`absolute top-1 right-1 p-1 rounded ${isDark ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white`}
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {uploadingImage[`${section.key}-${i}-${comIdx}`] && <p className="text-xs text-gray-500">Enviando...</p>}
                                </div>
                              </div>
                            ))}
                            <Button size="sm" variant="outline" onClick={() => addComentario(section.key, i)} className="w-full">
                              <Plus className="w-4 h-4 mr-2" />
                              Adicionar comentário
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : null,
                  ])}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Nota Geral */}
        <div className={`rounded-xl border p-5 space-y-3 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className="font-semibold text-lg border-b pb-2">Nota Geral</h2>
          <Textarea value={form.nota_geral || ''} onChange={e => setField('nota_geral', e.target.value)} rows={3} />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
          <Button onClick={() => handleSave()} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Save className="w-4 h-4 mr-2" />{saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </div>
  );
}