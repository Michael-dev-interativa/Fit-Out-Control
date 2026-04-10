import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Empreendimento, VistoriaTecnica } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Edit2, Upload, X, Info, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useOfflinePhoto } from '@/lib/useOfflinePhoto';
import { useFormDraft } from '@/lib/useFormDraft';
import DraftBanner from '@/components/DraftBanner';
import { toast } from 'sonner';

const initialFormData = (empreendimentoId) => ({
    id_empreendimento: empreendimentoId,
    data_vistoria: new Date().toISOString().split('T')[0],
    titulo_relatorio: 'Relatório de Vistoria Técnica',
    titulo_capa: 'RELATÓRIO',
    subtitulo_capa: 'Vistoria Técnica',
    texto_rodape_capa: '',
    capa_area_top: '50%',
    capa_area_right: '-3%',
    capa_area_left: '',
    capa_area_width: '45%',
    capa_area_align: 'center',
    capa_area_bg: 'transparent',
    capa_area_padding: '0',
    capa_area_radius: '0',
    capa_area_titulo_font_size: '26px',
    capa_area_titulo_color: '#000000',
    capa_area_titulo_margin_bottom: '6px',
    capa_area_subtitulo_font_size: '16px',
    capa_area_subtitulo_color: '#4b5563',
    cliente: '',
    subtitulo_relatorio: '',
    endereco: '',
    revisao: '01',
    descricao_vistoria: '',
    eng_responsavel: '',
    // Tópico 1 - Características Gerais
    foto_localizacao: '',
    objetivo: '',
    instalacoes_geral: '',
    // Tópico 2 - Lista Mestra de Documentos
    lista_documentos: [],
    // Tópico 3 - Normas Técnicas
    normas_tecnicas: [],
    // restante
    locais: [],
    elevadores_monta_carga: [],
    conclusao_final: '',
    assinaturas: []
});

export default function NovaVistoriaTecnica() {
    const navigate = useNavigate();
    const location = useLocation();
    const empreendimentoId = new URLSearchParams(location.search).get('empreendimentoId');
    const { uploadPhoto, resolveDataForSave } = useOfflinePhoto();

    const [empreendimento, setEmpreendimento] = useState(null);
    const [saving, setSaving] = useState(false);
    const [uploadingFoto, setUploadingFoto] = useState(false);
    const [showEditCoverDialog, setShowEditCoverDialog] = useState(false);
    const [coverData, setCoverData] = useState({
        titulo_capa: 'RELATÓRIO',
        subtitulo_capa: 'Vistoria Técnica',
        texto_rodape_capa: '',
        capa_area_top: '50%',
        capa_area_right: '-3%',
        capa_area_left: '',
        capa_area_width: '45%',
        capa_area_align: 'center',
        capa_area_bg: 'transparent',
        capa_area_padding: '0',
        capa_area_radius: '0',
        capa_area_titulo_font_size: '26px',
        capa_area_titulo_color: '#000000',
        capa_area_titulo_margin_bottom: '6px',
        capa_area_subtitulo_font_size: '16px',
        capa_area_subtitulo_color: '#4b5563',
    });

    const { formData, setFormData, clearDraft, hasDraft, draftSavedAt } = useFormDraft(
        `vistoria-tecnica-${empreendimentoId}`,
        initialFormData(empreendimentoId)
    );

    useEffect(() => {
        if (!empreendimentoId) { navigate(-1); return; }
        Empreendimento.get(empreendimentoId).then(data => {
            setEmpreendimento(data);
            setFormData(prev => ({
                ...prev,
                cliente: prev.cliente || data.cli_empreendimento || '',
                subtitulo_relatorio: prev.subtitulo_relatorio || data.nome_empreendimento || '',
            }));
            setCoverData(prev => ({ ...prev, texto_rodape_capa: data.texto_capa_rodape || '' }));
        }).catch(() => toast.error("Erro ao carregar empreendimento."));
    }, [empreendimentoId]);

    const handleChange = (field, value) => setFormData(p => ({ ...p, [field]: value }));

    const handleFotoLocalizacao = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingFoto(true);
        try {
            const result = await uploadPhoto(file);
            handleChange('foto_localizacao', result.url);
        } catch { toast.error("Erro ao fazer upload da foto."); }
        finally { setUploadingFoto(false); }
    };

    const handleSaveCover = () => {
        setFormData(prev => ({ ...prev, ...coverData }));
        setShowEditCoverDialog(false);
        toast.success("Capa atualizada!");
    };

    const areasTecnicasTopico = (formData.locais && formData.locais[0]?.nome_local) || '';
    const handleAreasTecnicasTopicoChange = (value) => {
        const locais = [...(formData.locais || [])].map((local) => ({ ...local, nome_local: value }));
        handleChange('locais', locais);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            let dataToSave = await resolveDataForSave(formData);
            if (dataToSave.data_vistoria && !dataToSave.data_vistoria.includes('T')) {
                dataToSave.data_vistoria = dataToSave.data_vistoria + 'T12:00:00';
            }
            await VistoriaTecnica.create(dataToSave);
            clearDraft();
            toast.success("Vistoria técnica criada com sucesso!");
            navigate(createPageUrl(`EmpreendimentoVistoriaTecnica?empreendimentoId=${empreendimentoId}`));
        } catch (error) {
            console.error(error);
            toast.error("Falha ao criar a vistoria técnica.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Nova Vistoria Técnica</h1>
                    <p className="text-gray-500 text-sm mt-1">{empreendimento?.nome_empreendimento}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowEditCoverDialog(true)}>
                        <Edit2 className="w-4 h-4 mr-2" /> Editar Capa
                    </Button>
                    <Button variant="outline" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                    </Button>
                </div>
            </div>

            <DraftBanner draftSavedAt={draftSavedAt} hasDraft={hasDraft} onClearDraft={() => { clearDraft(); setFormData(initialFormData(empreendimentoId)); }} />

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Dados do Empreendimento */}
                <Card>
                    <CardHeader>
                        <CardTitle>Dados do Empreendimento</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Título do Relatório</Label>
                            <Input value={formData.titulo_relatorio} onChange={e => handleChange('titulo_relatorio', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Obra / Empreendimento</Label>
                            <Input value={formData.subtitulo_relatorio} onChange={e => handleChange('subtitulo_relatorio', e.target.value)} placeholder="Nome da obra..." />
                        </div>
                        <div className="space-y-2">
                            <Label>Cliente</Label>
                            <Input value={formData.cliente} onChange={e => handleChange('cliente', e.target.value)} placeholder="Nome do cliente..." />
                        </div>
                        <div className="space-y-2">
                            <Label>Endereço</Label>
                            <Input value={formData.endereco || ''} onChange={e => handleChange('endereco', e.target.value)} placeholder="Endereço do empreendimento..." />
                        </div>
                        <div className="space-y-2">
                            <Label>Revisão</Label>
                            <Input value={formData.revisao} onChange={e => handleChange('revisao', e.target.value)} placeholder="Ex: 01" />
                        </div>
                        <div className="space-y-2">
                            <Label>Data da Vistoria</Label>
                            <Input type="date" value={formData.data_vistoria} onChange={e => handleChange('data_vistoria', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Responsável / Engenheiro</Label>
                            <Input value={formData.eng_responsavel} onChange={e => handleChange('eng_responsavel', e.target.value)} placeholder="Nome do responsável..." />
                        </div>
                        <div className="space-y-2">
                            <Label>Nome do Arquivo</Label>
                            <Input value={formData.nome_arquivo || ''} onChange={e => handleChange('nome_arquivo', e.target.value)} placeholder="Ex: VT-2026-01" />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <Label>Descrição / Escopo</Label>
                            <Textarea
                                value={formData.descricao_vistoria}
                                onChange={e => handleChange('descricao_vistoria', e.target.value)}
                                placeholder="Descreva o escopo da vistoria técnica..."
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Tópico 1 - Características Gerais */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tópico 1 — Características Gerais</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Localização do Empreendimento - Imagem */}
                        <div className="space-y-2">
                            <Label className="text-base font-semibold">Localização do Empreendimento</Label>
                            <p className="text-sm text-gray-500">Imagem de localização (mapa, planta, foto aérea, etc.)</p>
                            {formData.foto_localizacao ? (
                                <div className="relative inline-block">
                                    <img
                                        src={formData.foto_localizacao}
                                        alt="Localização"
                                        className="rounded-lg border max-h-80 object-contain"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleChange('foto_localizacao', '')}
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    {uploadingFoto ? (
                                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                            <span className="text-sm text-gray-500">Clique para fazer upload da imagem de localização</span>
                                        </>
                                    )}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFotoLocalizacao} disabled={uploadingFoto} />
                                </label>
                            )}
                        </div>

                        {/* Objetivos */}
                        <div className="space-y-2">
                            <Label className="text-base font-semibold">Objetivos</Label>
                            <Textarea
                                value={formData.objetivo}
                                onChange={e => handleChange('objetivo', e.target.value)}
                                placeholder="Descreva os objetivos desta vistoria técnica..."
                                rows={5}
                            />
                        </div>

                        {/* Instalações em Geral */}
                        <div className="space-y-2">
                            <Label className="text-base font-semibold">Instalações em Geral</Label>
                            <Textarea
                                value={formData.instalacoes_geral || ''}
                                onChange={e => handleChange('instalacoes_geral', e.target.value)}
                                placeholder="Descreva as instalações em geral do empreendimento..."
                                rows={5}
                            />
                        </div>

                        {/* Aviso de Legenda */}
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Info className="w-5 h-5 text-blue-600" />
                                <span className="font-semibold text-blue-800">LEGENDA</span>
                            </div>
                            <p className="text-sm text-blue-700 mb-3">Foram aplicadas as seguintes abreviações:</p>
                            <div className="space-y-2">
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-green-700 w-8 text-center">OK</span>
                                    <span className="text-sm text-gray-700">Itens em conformidade</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-yellow-700 w-8 text-center">PD</span>
                                    <span className="text-sm text-gray-700">Itens pendentes a serem revisados</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-blue-700 w-8 text-center">SG</span>
                                    <span className="text-sm text-gray-700">Itens com sugestão de melhorias</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Arquivos de Referência */}
                <Card>
                    <CardHeader>
                        <CardTitle>Arquivos de Referência</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Tópico 2 - Lista Mestra de Documentos */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Tópico 2 — Lista Mestra de Documentos Analisados</h3>
                        <div>
                            <table className="w-full text-sm border-collapse" style={{tableLayout:'fixed'}}>
                                <thead>
                                    <tr className="bg-blue-900 text-white">
                                        <th className="border border-blue-700 p-2 text-left" style={{width:'80px'}}>DES</th>
                                        <th className="border border-blue-700 p-2 text-left" style={{width:'320px'}}>Descrição</th>
                                        <th className="border border-blue-700 p-2 text-left" style={{width:'320px'}}>Arquivo</th>
                                        <th className="border border-blue-700 p-2 text-left" style={{width:'90px'}}>Rev</th>
                                        <th className="border border-blue-700 p-2 text-left" style={{width:'130px'}}>Data</th>
                                        <th className="border border-blue-700 p-2" style={{width:'40px'}}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(formData.lista_documentos || []).map((doc, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="border border-gray-300 p-1"><Input value={doc.des || ''} onChange={e => { const l = [...(formData.lista_documentos||[])]; l[idx] = {...l[idx], des: e.target.value}; handleChange('lista_documentos', l); }} className="h-7 text-xs" /></td>
                                            <td className="border border-gray-300 p-1"><Input value={doc.descricao || ''} onChange={e => { const l = [...(formData.lista_documentos||[])]; l[idx] = {...l[idx], descricao: e.target.value}; handleChange('lista_documentos', l); }} className="h-7 text-xs" /></td>
                                            <td className="border border-gray-300 p-1"><Input value={doc.arquivo || ''} onChange={e => { const l = [...(formData.lista_documentos||[])]; l[idx] = {...l[idx], arquivo: e.target.value}; handleChange('lista_documentos', l); }} className="h-7 text-xs" /></td>
                                            <td className="border border-gray-300 p-1"><Input value={doc.rev || ''} onChange={e => { const l = [...(formData.lista_documentos||[])]; l[idx] = {...l[idx], rev: e.target.value}; handleChange('lista_documentos', l); }} className="h-7 text-xs" /></td>
                                            <td className="border border-gray-300 p-1"><Input value={doc.data || ''} onChange={e => { const l = [...(formData.lista_documentos||[])]; l[idx] = {...l[idx], data: e.target.value}; handleChange('lista_documentos', l); }} className="h-7 text-xs" placeholder="dd/mm/aaaa" /></td>
                                            <td className="border border-gray-300 p-1 text-center"><button type="button" onClick={() => { const l = [...(formData.lista_documentos||[])]; l.splice(idx,1); handleChange('lista_documentos', l); }} className="text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => handleChange('lista_documentos', [...(formData.lista_documentos||[]), {des:'',descricao:'',arquivo:'',rev:'',data:''}])}>
                            <Plus className="w-4 h-4 mr-1" /> Adicionar linha
                        </Button>
                        </div>

                        {/* Tópico 3 - Normas Técnicas */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Tópico 3 — Normas Técnicas e Códigos</h3>
                        <div>
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-blue-900 text-white">
                                        <th className="border border-blue-700 p-2 text-left" style={{width:'30%'}}>Norma</th>
                                        <th className="border border-blue-700 p-2 text-left">Descrição</th>
                                        <th className="border border-blue-700 p-2" style={{width:'40px'}}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(formData.normas_tecnicas || []).map((norma, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="border border-gray-300 p-1"><Input value={norma.norma || ''} onChange={e => { const l = [...(formData.normas_tecnicas||[])]; l[idx] = {...l[idx], norma: e.target.value}; handleChange('normas_tecnicas', l); }} className="h-7 text-xs" /></td>
                                            <td className="border border-gray-300 p-1"><Input value={norma.descricao || ''} onChange={e => { const l = [...(formData.normas_tecnicas||[])]; l[idx] = {...l[idx], descricao: e.target.value}; handleChange('normas_tecnicas', l); }} className="h-7 text-xs" /></td>
                                            <td className="border border-gray-300 p-1 text-center"><button type="button" onClick={() => { const l = [...(formData.normas_tecnicas||[])]; l.splice(idx,1); handleChange('normas_tecnicas', l); }} className="text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => handleChange('normas_tecnicas', [...(formData.normas_tecnicas||[]), {norma:'',descricao:''}])}>
                            <Plus className="w-4 h-4 mr-1" /> Adicionar linha
                        </Button>
                        </div>

                    </CardContent>
                </Card>

                {/* Áreas Técnicas */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Áreas Técnicas</CardTitle>
                            <Button type="button" size="sm" onClick={() => handleChange('locais', [...(formData.locais||[]), { nome_local: areasTecnicasTopico || 'ÁREAS TÉCNICAS', fotos: [], descricao_geral: '', comentarios: '', itens_inspecao: [] }])}>
                                <Plus className="w-4 h-4 mr-1" /> Adicionar Tópico
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <Label className="text-sm font-semibold">Tópico da Tabela</Label>
                            <Input
                                value={areasTecnicasTopico}
                                onChange={e => handleAreasTecnicasTopicoChange(e.target.value)}
                                className="mt-1"
                                placeholder="Ex: AMBIENTES"
                            />
                            <p className="text-xs text-gray-500 mt-1">Esse título será usado como tópico geral em todas as áreas técnicas.</p>
                        </div>

                        {(formData.locais || []).map((local, lIdx) => (
                            <div key={lIdx} className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="bg-gray-50 border-b px-4 py-2 flex items-center justify-between">
                                    <span className="text-sm font-semibold text-gray-700">Local {lIdx + 1}</span>
                                    <button type="button" onClick={() => { const l = [...(formData.locais||[])]; l.splice(lIdx, 1); handleChange('locais', l); }} className="text-red-300 hover:text-red-100">
                                        <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
                                    </button>
                                </div>
                                <div className="p-4 space-y-4">
                                    {/* Nome do Local */}
                                    <div>
                                        <Label className="text-sm font-semibold">Nome do Local</Label>
                                        <Input value={local.nome_local_exibicao || ''} onChange={e => { const l = [...(formData.locais||[])]; l[lIdx] = { ...l[lIdx], nome_local_exibicao: e.target.value }; handleChange('locais', l); }} className="mt-1" placeholder="Ex: Recepção Térreo, Subsolo, Casa de Máquinas..." />
                                    </div>
                                    {/* Fotos do local */}
                                    <div>
                                        <Label className="text-sm font-semibold">Imagens</Label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {(local.fotos || []).map((foto, fIdx) => (
                                                <div key={fIdx} className="relative">
                                                    <img src={foto.url} alt="" className="w-32 h-32 object-cover rounded border" />
                                                    <button type="button" onClick={() => { const l = [...(formData.locais||[])]; const fs = [...(l[lIdx].fotos||[])]; fs.splice(fIdx, 1); l[lIdx] = { ...l[lIdx], fotos: fs }; handleChange('locais', l); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
                                                </div>
                                            ))}
                                            <label className="w-32 h-32 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
                                                <Upload className="w-5 h-5 text-gray-400" />
                                                <span className="text-xs text-gray-400 mt-1">Adicionar foto</span>
                                                <input type="file" accept="image/*" multiple className="hidden" onChange={async e => {
                                                    const files = Array.from(e.target.files);
                                                    if (!files.length) return;
                                                    try {
                                                        const results = await Promise.all(files.map(f => uploadPhoto(f)));
                                                        const novasfotos = results.map(r => ({ url: r.url, legenda: '' }));
                                                        setFormData(prev => { const l = [...(prev.locais||[])]; l[lIdx] = { ...l[lIdx], fotos: [...(l[lIdx].fotos||[]), ...novasfotos] }; return { ...prev, locais: l }; });
                                                    } catch { toast.error('Erro ao fazer upload.'); }
                                                }} />
                                            </label>
                                        </div>
                                    </div>
                                    {/* Descrição Geral */}
                                    <div>
                                        <Label className="text-sm font-semibold">Descrição Geral</Label>
                                        <Textarea value={local.descricao_geral || ''} onChange={e => { const l = [...(formData.locais||[])]; l[lIdx] = { ...l[lIdx], descricao_geral: e.target.value }; handleChange('locais', l); }} rows={3} className="mt-1" placeholder="Descrição geral do local..." />
                                    </div>
                                    {/* Comentários Gerais */}
                                    <div>
                                        <Label className="text-sm font-semibold">Comentários Gerais</Label>
                                        <Textarea value={local.comentarios || ''} onChange={e => { const l = [...(formData.locais||[])]; l[lIdx] = { ...l[lIdx], comentarios: e.target.value }; handleChange('locais', l); }} rows={3} className="mt-1" placeholder="Comentários gerais sobre o local..." />
                                    </div>
                                    {/* Tabela de Itens */}
                                    <div>
                                        <Label className="text-sm font-semibold mb-2 block">Itens de Inspeção</Label>
                                        <table className="w-full text-sm border-collapse" style={{tableLayout:'fixed'}}>
                                            <thead>
                                                <tr className="bg-blue-900 text-white">
                                                    <th className="border border-blue-700 p-2 text-left">Descrição</th>
                                                    <th className="border border-blue-700 p-2 text-left" style={{width:'35%'}}>Observações</th>
                                                    <th className="border border-blue-700 p-2 text-center" style={{width:'60px'}}>Status</th>
                                                    <th className="border border-blue-700 p-2" style={{width:'36px'}}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(local.itens_inspecao || []).map((item, iIdx) => {
                                                    if (item.tipo === 'topico') {
                                                        return (
                                                            <tr key={iIdx}>
                                                                <td colSpan="4" className="border border-gray-300 p-0">
                                                                    <div className="flex items-center bg-blue-800">
                                                                        <input type="text" value={item.titulo || ''} onChange={e => { const l = [...(formData.locais||[])]; const its = [...(l[lIdx].itens_inspecao||[])]; its[iIdx] = {...its[iIdx], titulo: e.target.value}; l[lIdx] = {...l[lIdx], itens_inspecao: its}; handleChange('locais', l); }} placeholder="Nome do tópico..." className="flex-1 bg-transparent text-white font-bold text-xs px-3 py-2 outline-none placeholder:text-blue-300" />
                                                                        <button type="button" onClick={() => { const l = [...(formData.locais||[])]; const its = [...(l[lIdx].itens_inspecao||[])]; its.splice(iIdx, 1); l[lIdx] = {...l[lIdx], itens_inspecao: its}; handleChange('locais', l); }} className="px-2 text-red-300 hover:text-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    }
                                                    return (
                                                        <tr key={iIdx} className="hover:bg-gray-50">
                                                            <td className="border border-gray-300 p-1"><Input value={item.descricao || ''} onChange={e => { const l = [...(formData.locais||[])]; const its = [...(l[lIdx].itens_inspecao||[])]; its[iIdx] = { ...its[iIdx], descricao: e.target.value }; l[lIdx] = { ...l[lIdx], itens_inspecao: its }; handleChange('locais', l); }} className="h-7 text-xs" placeholder="Descrição do item..." /></td>
                                                            <td className="border border-gray-300 p-1"><Input value={item.observacoes || ''} onChange={e => { const l = [...(formData.locais||[])]; const its = [...(l[lIdx].itens_inspecao||[])]; its[iIdx] = { ...its[iIdx], observacoes: e.target.value }; l[lIdx] = { ...l[lIdx], itens_inspecao: its }; handleChange('locais', l); }} className="h-7 text-xs" placeholder="Observações..." /></td>
                                                            <td className="border border-gray-300 p-1 text-center"><select value={item.resultado || 'OK'} onChange={e => { const l = [...(formData.locais||[])]; const its = [...(l[lIdx].itens_inspecao||[])]; its[iIdx] = { ...its[iIdx], resultado: e.target.value }; l[lIdx] = { ...l[lIdx], itens_inspecao: its }; handleChange('locais', l); }} className={`w-full h-7 text-xs font-bold rounded px-1 border-0 ${ {'OK':'bg-green-100 text-green-700','PD':'bg-red-100 text-red-700','SG':'bg-blue-100 text-blue-700','N/OK':'bg-orange-100 text-orange-700'}[item.resultado||'OK'] || '' }`}><option value="OK">OK</option><option value="PD">PD</option><option value="SG">SG</option><option value="N/OK">N/OK</option></select></td>
                                                            <td className="border border-gray-300 p-1 text-center"><button type="button" onClick={() => { const l = [...(formData.locais||[])]; const its = [...(l[lIdx].itens_inspecao||[])]; its.splice(iIdx, 1); l[lIdx] = { ...l[lIdx], itens_inspecao: its }; handleChange('locais', l); }} className="text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button></td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        <div className="flex gap-2 mt-2">
                                            <Button type="button" variant="outline" size="sm" onClick={() => { const l = [...(formData.locais||[])]; const its = [...(l[lIdx].itens_inspecao||[]), { descricao: '', resultado: 'OK', observacoes: '' }]; l[lIdx] = { ...l[lIdx], itens_inspecao: its }; handleChange('locais', l); }}>
                                                <Plus className="w-4 h-4 mr-1" /> Adicionar Item
                                            </Button>
    
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(formData.locais || []).length === 0 && (
                            <p className="text-sm text-gray-400 text-center py-6">Nenhum tópico adicionado. Clique em "Adicionar Tópico" para começar.</p>
                        )}
                    </CardContent>
                </Card>

                {/* Quadros Gerais */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Quadros Gerais</CardTitle>
                            <Button type="button" size="sm" onClick={() => handleChange('quadros_gerais', [...(formData.quadros_gerais||[]), {
                                nome_topico: '', nome_local: '', nomenclatura: '', fotos: [], itens: [
                                    { descricao: 'Projeto as built', comentarios: '', resultado: 'OK' },
                                    { descricao: 'Fixação do quadro (alinhamento, acabamento da parede, ...)', comentarios: '', resultado: 'OK' },
                                    { descricao: 'Integridade do quadro (amaçados, pintura, abertura de portas, trincos, ...)', comentarios: '', resultado: 'OK' },
                                    { descricao: 'Placas de Identificação', comentarios: '', resultado: 'OK' },
                                    { descricao: 'Documentação interna', comentarios: '', resultado: 'OK' },
                                    { descricao: 'Limpeza', comentarios: '', resultado: 'OK' },
                                    { descricao: 'Ligações elétricas', comentarios: '', resultado: 'OK' },
                                    { descricao: 'Identificações gerais', comentarios: '', resultado: 'OK' },
                                    { descricao: 'Terra e Neutro', comentarios: '', resultado: 'OK' },
                                    { descricao: 'Proteção das partes vivas', comentarios: '', resultado: 'OK' },
                                    { descricao: 'Sinalização e controle', comentarios: '', resultado: 'OK' },
                                    { descricao: 'Continuidade do aterramento', comentarios: '', resultado: 'OK' },
                                    { descricao: 'Banco de capacitores', comentarios: '', resultado: 'OK' },
                                    { descricao: 'Conexão com transformador', comentarios: '', resultado: 'OK' },
                                    { descricao: 'Espaços livres', comentarios: '', resultado: 'OK' },
                                ]
                            }])}>
                                <Plus className="w-4 h-4 mr-1" /> Adicionar Quadro
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {(formData.quadros_gerais || []).length === 0 && (
                            <p className="text-sm text-gray-400 text-center py-4">Nenhum quadro adicionado.</p>
                        )}
                        {(formData.quadros_gerais || []).map((quadro, qIdx) => (
                            <div key={qIdx} className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="bg-blue-900 text-white px-4 py-2 flex items-center justify-between">
                                    <Input
                                        value={quadro.nome_topico || ''}
                                        onChange={e => { const q = [...(formData.quadros_gerais||[])]; q[qIdx] = {...q[qIdx], nome_topico: e.target.value}; handleChange('quadros_gerais', q); }}
                                        placeholder="Nome do Tópico (ex: Quadro Geral 1, QDC-01...)"
                                        className="bg-transparent border-0 border-b border-blue-400 rounded-none text-white placeholder:text-blue-300 font-semibold text-sm focus-visible:ring-0 flex-1 mr-4"
                                    />
                                    <button type="button" onClick={() => { const q = [...(formData.quadros_gerais||[])]; q.splice(qIdx,1); handleChange('quadros_gerais', q); }} className="text-red-300 hover:text-red-100">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="p-4 space-y-4">
                                    <div>
                                        <Label className="text-sm font-semibold">Nome do Local</Label>
                                        <Input value={quadro.nome_local || ''} onChange={e => { const q = [...(formData.quadros_gerais||[])]; q[qIdx] = {...q[qIdx], nome_local: e.target.value}; handleChange('quadros_gerais', q); }} className="mt-1" placeholder="Ex: Pavimento Térreo, Subsolo..." />
                                    </div>
                                    <div>
                                        <Label className="text-sm font-semibold">Nomenclatura</Label>
                                        <Input value={quadro.nomenclatura || ''} onChange={e => { const q = [...(formData.quadros_gerais||[])]; q[qIdx] = {...q[qIdx], nomenclatura: e.target.value}; handleChange('quadros_gerais', q); }} className="mt-1" placeholder="Ex: QDC-01, QGBT..." />
                                    </div>
                                    <div>
                                        <Label className="text-sm font-semibold">Imagens</Label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {(quadro.fotos || []).map((foto, fIdx) => (
                                                <div key={fIdx} className="relative">
                                                    <img src={foto.url} alt="" className="w-32 h-32 object-cover rounded border" />
                                                    <button type="button" onClick={() => { const q = [...(formData.quadros_gerais||[])]; const fs = [...(q[qIdx].fotos||[])]; fs.splice(fIdx,1); q[qIdx] = {...q[qIdx], fotos: fs}; handleChange('quadros_gerais', q); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                            <label className="w-32 h-32 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
                                                <Upload className="w-5 h-5 text-gray-400" />
                                                <span className="text-xs text-gray-400 mt-1">Adicionar foto</span>
                                                <input type="file" accept="image/*" multiple className="hidden" onChange={async e => {
                                                    const files = Array.from(e.target.files);
                                                    if (!files.length) return;
                                                    try {
                                                        const results = await Promise.all(files.map(f => uploadPhoto(f)));
                                                        const novas = results.map(r => ({ url: r.url, legenda: '' }));
                                                        setFormData(prev => { const q = [...(prev.quadros_gerais||[])]; q[qIdx] = {...q[qIdx], fotos: [...(q[qIdx].fotos||[]), ...novas]}; return {...prev, quadros_gerais: q}; });
                                                    } catch { toast.error('Erro ao fazer upload.'); }
                                                }} />
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-semibold mb-2 block">Detalhamento Técnico</Label>
                                        <table className="w-full text-sm border-collapse" style={{tableLayout:'fixed'}}>
                                            <thead>
                                                <tr className="bg-blue-900 text-white">
                                                    <th className="border border-blue-700 p-2 text-left">Descrição</th>
                                                    <th className="border border-blue-700 p-2 text-left" style={{width:'35%'}}>Comentários</th>
                                                    <th className="border border-blue-700 p-2 text-center" style={{width:'60px'}}>Status</th>
                                                    <th className="border border-blue-700 p-2" style={{width:'36px'}}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(quadro.itens || []).map((item, iIdx) => (
                                                    <tr key={iIdx} className="hover:bg-gray-50">
                                                        <td className="border border-gray-300 p-1"><Input value={item.descricao || ''} onChange={e => { const q = [...(formData.quadros_gerais||[])]; const its = [...(q[qIdx].itens||[])]; its[iIdx] = {...its[iIdx], descricao: e.target.value}; q[qIdx] = {...q[qIdx], itens: its}; handleChange('quadros_gerais', q); }} className="h-7 text-xs" placeholder="Descrição..." /></td>
                                                        <td className="border border-gray-300 p-1"><Input value={item.comentarios || ''} onChange={e => { const q = [...(formData.quadros_gerais||[])]; const its = [...(q[qIdx].itens||[])]; its[iIdx] = {...its[iIdx], comentarios: e.target.value}; q[qIdx] = {...q[qIdx], itens: its}; handleChange('quadros_gerais', q); }} className="h-7 text-xs" placeholder="Comentários..." /></td>
                                                        <td className="border border-gray-300 p-1 text-center">
                                                            <select value={item.resultado || 'OK'} onChange={e => { const q = [...(formData.quadros_gerais||[])]; const its = [...(q[qIdx].itens||[])]; its[iIdx] = {...its[iIdx], resultado: e.target.value}; q[qIdx] = {...q[qIdx], itens: its}; handleChange('quadros_gerais', q); }} className={`w-full h-7 text-xs font-bold rounded px-1 border-0 ${ {'OK':'bg-green-100 text-green-700','PD':'bg-red-100 text-red-700','SG':'bg-blue-100 text-blue-700','N/OK':'bg-orange-100 text-orange-700'}[item.resultado||'OK'] || '' }`}>
                                                                <option value="OK">OK</option>
                                                                <option value="PD">PD</option>
                                                                <option value="SG">SG</option>
                                                                <option value="N/OK">N/OK</option>
                                                            </select>
                                                        </td>
                                                        <td className="border border-gray-300 p-1 text-center"><button type="button" onClick={() => { const q = [...(formData.quadros_gerais||[])]; const its = [...(q[qIdx].itens||[])]; its.splice(iIdx,1); q[qIdx] = {...q[qIdx], itens: its}; handleChange('quadros_gerais', q); }} className="text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => { const q = [...(formData.quadros_gerais||[])]; q[qIdx] = {...q[qIdx], itens: [...(q[qIdx].itens||[]), {descricao:'', comentarios:'', resultado:'OK'}]}; handleChange('quadros_gerais', q); }}>
                                            <Plus className="w-4 h-4 mr-1" /> Adicionar Item
                                        </Button>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-semibold">Itens Analisados</Label>
                                        <Textarea value={quadro.itens_analisados || ''} onChange={e => { const q = [...(formData.quadros_gerais||[])]; q[qIdx] = {...q[qIdx], itens_analisados: e.target.value}; handleChange('quadros_gerais', q); }} rows={4} className="mt-1" placeholder="Descreva os itens analisados neste quadro..." />
                                    </div>
                                    <div>
                                        <Label className="text-sm font-semibold mb-2 block">Notas</Label>
                                        <div className="space-y-2">
                                            {(quadro.notas || []).map((nota, nIdx) => (
                                                <div key={nIdx} className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-gray-500 w-5 text-right">{nIdx + 1}</span>
                                                    <Input value={nota} onChange={e => { const q = [...(formData.quadros_gerais||[])]; const ns = [...(q[qIdx].notas||[])]; ns[nIdx] = e.target.value; q[qIdx] = {...q[qIdx], notas: ns}; handleChange('quadros_gerais', q); }} className="h-7 text-xs flex-1" placeholder={`Nota ${nIdx + 1}...`} />
                                                    <button type="button" onClick={() => { const q = [...(formData.quadros_gerais||[])]; const ns = [...(q[qIdx].notas||[])]; ns.splice(nIdx,1); q[qIdx] = {...q[qIdx], notas: ns}; handleChange('quadros_gerais', q); }} className="text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button>
                                                </div>
                                            ))}
                                        </div>
                                        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => { const q = [...(formData.quadros_gerais||[])]; q[qIdx] = {...q[qIdx], notas: [...(q[qIdx].notas||[]), '']}; handleChange('quadros_gerais', q); }}>
                                            <Plus className="w-4 h-4 mr-1" /> Adicionar Nota
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Conclusão Final */}
                <Card>
                    <CardHeader><CardTitle>Conclusão Final</CardTitle></CardHeader>
                    <CardContent>
                        <Textarea
                            value={formData.conclusao_final}
                            onChange={e => handleChange('conclusao_final', e.target.value)}
                            rows={5}
                            placeholder="Escreva a conclusão final da vistoria técnica..."
                        />
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
                    <Button type="submit" disabled={saving}>
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : 'Salvar Vistoria Técnica'}
                    </Button>
                </div>
            </form>

            {/* Dialog Editar Capa */}
            <Dialog open={showEditCoverDialog} onOpenChange={setShowEditCoverDialog}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Editar Capa</DialogTitle>
                        <DialogDescription>Configure os campos da capa do relatório</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="border rounded-lg p-4 bg-blue-50">
                            <h3 className="font-semibold text-sm mb-4 text-blue-900">Títulos da Capa</h3>
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs font-semibold">Título Principal</Label>
                                    <Input value={coverData.titulo_capa} onChange={e => setCoverData(p => ({ ...p, titulo_capa: e.target.value }))} className="mt-1" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Subtítulo (vermelho)</Label>
                                    <Input value={coverData.subtitulo_capa} onChange={e => setCoverData(p => ({ ...p, subtitulo_capa: e.target.value }))} className="mt-1" />
                                </div>
                            </div>
                        </div>
                        <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                            <h3 className="font-semibold text-sm mb-4 text-green-900">Área Central da Vistoria</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs font-semibold">Top</Label>
                                    <Input value={coverData.capa_area_top || ''} onChange={e => setCoverData(p => ({ ...p, capa_area_top: e.target.value }))} className="mt-1" placeholder="Ex: 50%" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Right</Label>
                                    <Input value={coverData.capa_area_right || ''} onChange={e => setCoverData(p => ({ ...p, capa_area_right: e.target.value }))} className="mt-1" placeholder="Ex: -3%" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Left (opcional)</Label>
                                    <Input value={coverData.capa_area_left || ''} onChange={e => setCoverData(p => ({ ...p, capa_area_left: e.target.value }))} className="mt-1" placeholder="Ex: auto ou 55%" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Largura</Label>
                                    <Input value={coverData.capa_area_width || ''} onChange={e => setCoverData(p => ({ ...p, capa_area_width: e.target.value }))} className="mt-1" placeholder="Ex: 45%" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Alinhamento</Label>
                                    <select
                                        value={coverData.capa_area_align || 'center'}
                                        onChange={e => setCoverData(p => ({ ...p, capa_area_align: e.target.value }))}
                                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    >
                                        <option value="left">left</option>
                                        <option value="center">center</option>
                                        <option value="right">right</option>
                                    </select>
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Fundo da Área</Label>
                                    <Input value={coverData.capa_area_bg || ''} onChange={e => setCoverData(p => ({ ...p, capa_area_bg: e.target.value }))} className="mt-1" placeholder="Ex: transparent ou #ffffffcc" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Padding</Label>
                                    <Input value={coverData.capa_area_padding || ''} onChange={e => setCoverData(p => ({ ...p, capa_area_padding: e.target.value }))} className="mt-1" placeholder="Ex: 8px" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Raio</Label>
                                    <Input value={coverData.capa_area_radius || ''} onChange={e => setCoverData(p => ({ ...p, capa_area_radius: e.target.value }))} className="mt-1" placeholder="Ex: 8px" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Fonte Título</Label>
                                    <Input value={coverData.capa_area_titulo_font_size || ''} onChange={e => setCoverData(p => ({ ...p, capa_area_titulo_font_size: e.target.value }))} className="mt-1" placeholder="Ex: 26px" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Cor Título</Label>
                                    <Input value={coverData.capa_area_titulo_color || ''} onChange={e => setCoverData(p => ({ ...p, capa_area_titulo_color: e.target.value }))} className="mt-1" placeholder="Ex: #000000" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Margem abaixo do Título</Label>
                                    <Input value={coverData.capa_area_titulo_margin_bottom || ''} onChange={e => setCoverData(p => ({ ...p, capa_area_titulo_margin_bottom: e.target.value }))} className="mt-1" placeholder="Ex: 6px" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Fonte Subtítulo</Label>
                                    <Input value={coverData.capa_area_subtitulo_font_size || ''} onChange={e => setCoverData(p => ({ ...p, capa_area_subtitulo_font_size: e.target.value }))} className="mt-1" placeholder="Ex: 16px" />
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-xs font-semibold">Cor Subtítulo</Label>
                                    <Input value={coverData.capa_area_subtitulo_color || ''} onChange={e => setCoverData(p => ({ ...p, capa_area_subtitulo_color: e.target.value }))} className="mt-1" placeholder="Ex: #4b5563" />
                                </div>
                            </div>
                        </div>
                        <div className="border rounded-lg p-4 bg-red-50 border-red-200">
                            <h3 className="font-semibold text-sm mb-2 text-red-900">Rodapé da Capa</h3>
                            <Label className="text-xs font-semibold">Texto do Rodapé</Label>
                            <Input value={coverData.texto_rodape_capa} onChange={e => setCoverData(p => ({ ...p, texto_rodape_capa: e.target.value }))} placeholder="Ex: Empreendimento | Cliente" className="mt-1" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowEditCoverDialog(false)}>Cancelar</Button>
                        <Button type="button" onClick={handleSaveCover}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}