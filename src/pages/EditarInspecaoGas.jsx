import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Trash2, ArrowLeft, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { compressImage } from '@/utils/imageCompression';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SimpleSignaturePad } from '@/components/signature/SignaturePadComponent';

const t = {
    title: "Editar Inspeção de Gás",
    save: "Salvar Alterações",
    saving: "Salvando...",
    back: "Voltar",
    generalInfo: "Informações Gerais",
    reportTitle: "Título do Relatório",
    reportSubtitle: "Subtítulo do Relatório",
    client: "Cliente",
    revision: "Revisão",
    engineer: "Engenheiro Responsável",
    inspectionDate: "Data da Inspeção",
    locations: "Locais de Inspeção",
    addLocation: "Adicionar Local",
    locationName: "Nome do Local",
    documentation: "Documentação Técnica",
    physicalInspection: "Inspeção Física - Gás",
    addItem: "Adicionar Item",
    description: "Descrição",
    observations: "Observações",
    photos: "Fotos",
    generalObservations: "Observações Gerais",
    signatures: "Assinaturas",
    addSignature: "Adicionar Assinatura",
    party: "Parte",
    name: "Nome",
    uploading: "Enviando...",
};

export default function EditarInspecaoGas() {
    const navigate = useNavigate();
    const location = useLocation();
    const [inspecaoId] = useState(() => new URLSearchParams(location.search).get('inspecaoId'));
    
    const [formData, setFormData] = useState(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    
    const [showSignatureDialog, setShowSignatureDialog] = useState(false);
    const [activeSignatureIndex, setActiveSignatureIndex] = useState(null);
    const [signatureMode, setSignatureMode] = useState('draw');
    const [typedSignature, setTypedSignature] = useState('');
    const signaturePadRef = React.useRef(null);

    const [editCoverOpen, setEditCoverOpen] = useState(false);
    const [editedCoverData, setEditedCoverData] = useState({});

    useEffect(() => {
        if (!inspecaoId) {
            toast.error("ID da inspeção não encontrado.");
            navigate(-1);
            return;
        }
        const loadData = async () => {
            try {
                const data = await base44.entities.InspecaoGas.get(inspecaoId);
                let dataInspecao = '';
                if (data.data_inspecao) {
                    dataInspecao = data.data_inspecao.includes('T') 
                        ? data.data_inspecao.split('T')[0] 
                        : data.data_inspecao;
                }
                const locaisComTipo = (data.locais || []).map(local => ({
                    ...local,
                    itens_inspecao: (local.itens_inspecao || []).map(item => ({
                        ...item,
                        tipo: item.tipo || (item.descricao ? 'item' : 'comentario')
                    }))
                }));

                setFormData({
                    ...data,
                    data_inspecao: dataInspecao,
                    itens_documentacao: data.itens_documentacao || [],
                    locais: locaisComTipo,
                    assinaturas: (data.assinaturas || []).map(ass => ({
                        ...ass,
                        assinatura_imagem: ass.assinatura_imagem || ''
                    })),
                    conclusao_r01: data.conclusao_r01 || '',
                    conclusao_r02: data.conclusao_r02 || '',
                });
            } catch (error) {
                toast.error("Falha ao carregar dados da inspeção.");
                navigate(-1);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [inspecaoId, navigate]);

    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    if (!formData) return null;

    const handleInputChange = (field, value) => setFormData(p => ({ ...p, [field]: value }));

    const addLocal = () => {
        handleInputChange('locais', [...formData.locais, {
            nome_local: '',
            comentarios: '',
            itens_inspecao: []
        }]);
    };

    const removeLocal = (localIndex) => {
        handleInputChange('locais', formData.locais.filter((_, i) => i !== localIndex));
    };

    const handleLocalChange = (localIndex, field, value) => {
        const newLocais = [...formData.locais];
        newLocais[localIndex][field] = value;
        handleInputChange('locais', newLocais);
    };

    const handleDocItemChange = (itemIndex, field, value) => {
        const newDocs = [...formData.itens_documentacao];
        newDocs[itemIndex][field] = value;
        handleInputChange('itens_documentacao', newDocs);
    };

    const handleInspItemChange = (localIndex, itemIndex, field, value) => {
        const newLocais = [...formData.locais];
        newLocais[localIndex].itens_inspecao[itemIndex][field] = value;
        handleInputChange('locais', newLocais);
    };

    const addDocItem = () => {
        handleInputChange('itens_documentacao', [...formData.itens_documentacao, { descricao: '', resultado: 'OK', observacoes: '' }]);
    };

    const removeDocItem = (itemIndex) => {
        handleInputChange('itens_documentacao', formData.itens_documentacao.filter((_, i) => i !== itemIndex));
    };

    const addInspItem = (localIndex) => {
        const newLocais = [...formData.locais];
        if (!newLocais[localIndex].itens_inspecao) newLocais[localIndex].itens_inspecao = [];
        newLocais[localIndex].itens_inspecao.push({ descricao: '', resultado: 'OK', observacoes: '', fotos: [], tipo: 'item' });
        handleInputChange('locais', newLocais);
    };

    const addComentarioItem = (localIndex) => {
        const newLocais = [...formData.locais];
        if (!newLocais[localIndex].itens_inspecao) newLocais[localIndex].itens_inspecao = [];
        newLocais[localIndex].itens_inspecao.push({ tipo: 'comentario', texto: '' });
        handleInputChange('locais', newLocais);
    };

    const removeInspItem = (localIndex, itemIndex) => {
        const newLocais = [...formData.locais];
        newLocais[localIndex].itens_inspecao = newLocais[localIndex].itens_inspecao.filter((_, i) => i !== itemIndex);
        handleInputChange('locais', newLocais);
    };

    const handlePhotoUpload = async (e, localIndex, itemIndex) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setUploadingPhoto(true);
        try {
            const uploadedPhotos = await Promise.all(files.map(async file => {
                const compressed = await compressImage(file, 1200, 0.7);
                const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
                return { url: file_url, legenda: '' };
            }));
            const newLocais = [...formData.locais];
            if (!newLocais[localIndex].itens_inspecao[itemIndex].fotos) {
                newLocais[localIndex].itens_inspecao[itemIndex].fotos = [];
            }
            newLocais[localIndex].itens_inspecao[itemIndex].fotos.push(...uploadedPhotos);
            handleInputChange('locais', newLocais);
        } catch (err) {
            toast.error("Falha no upload da foto.");
        } finally {
            setUploadingPhoto(false);
        }
    };

    const removePhoto = (localIndex, itemIndex, photoIndex) => {
        const newLocais = [...formData.locais];
        newLocais[localIndex].itens_inspecao[itemIndex].fotos = 
            newLocais[localIndex].itens_inspecao[itemIndex].fotos.filter((_, i) => i !== photoIndex);
        handleInputChange('locais', newLocais);
    };

    const handleAssinaturaChange = (index, field, value) => {
        const newAssinaturas = [...formData.assinaturas];
        newAssinaturas[index][field] = value;
        handleInputChange('assinaturas', newAssinaturas);
    };

    const addAssinatura = () => handleInputChange('assinaturas', [...formData.assinaturas, { parte: '', nome: '', assinatura_imagem: '' }]);
    const removeAssinatura = (index) => handleInputChange('assinaturas', formData.assinaturas.filter((_, i) => i !== index));

    const openSignatureDialog = (index) => {
        setActiveSignatureIndex(index);
        setSignatureMode('draw');
        setTypedSignature('');
        setShowSignatureDialog(true);
    };

    const handleSaveSignature = async () => {
        if (activeSignatureIndex === null) return;

        try {
            if (signatureMode === 'type') {
                if (!typedSignature.trim()) {
                    toast.error("Por favor, digite sua assinatura.");
                    return;
                }

                const canvas = document.createElement('canvas');
                canvas.width = 850;
                canvas.height = 215;
                const ctx = canvas.getContext('2d');

                ctx.fillStyle = '#000000';
                ctx.font = '48px Calibri';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(typedSignature, canvas.width / 2, canvas.height - 20);

                const signatureDataUrl = canvas.toDataURL('image/png', 0.92);
                const blob = await fetch(signatureDataUrl).then(res => res.blob());
                const file = new File([blob], `assinatura-${Date.now()}.png`, { type: 'image/png' });

                const { file_url } = await base44.integrations.Core.UploadFile({ file });
                handleAssinaturaChange(activeSignatureIndex, 'assinatura_imagem', file_url);
                setShowSignatureDialog(false);
                setActiveSignatureIndex(null);
                setTypedSignature('');
                toast.success("Assinatura salva!");
            } else {
                if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
                    const signatureDataUrl = signaturePadRef.current.toDataURL();
                    const blob = await fetch(signatureDataUrl).then(res => res.blob());
                    const file = new File([blob], `assinatura-${Date.now()}.png`, { type: 'image/png' });

                    const { file_url } = await base44.integrations.Core.UploadFile({ file });
                    handleAssinaturaChange(activeSignatureIndex, 'assinatura_imagem', file_url);
                    setShowSignatureDialog(false);
                    setActiveSignatureIndex(null);
                    toast.success("Assinatura salva!");
                } else {
                    toast.error("Por favor, desenhe uma assinatura antes de salvar.");
                }
            }
        } catch (error) {
            toast.error("Erro ao salvar assinatura");
        }
    };

    const handleClearSignature = () => {
        if (signaturePadRef.current) {
            signaturePadRef.current.clear();
        }
    };

    const handleOpenEditCover = () => {
        setEditedCoverData({
            titulo_capa: formData?.titulo_capa || 'RELATÓRIO',
            subtitulo_capa: formData?.subtitulo_capa || 'Gerenciamento de Obra',
            cliente: formData?.cliente || '',
            subtitulo_relatorio: formData?.subtitulo_relatorio || '',
            texto_rodape_capa: formData?.texto_rodape_capa || '',
        });
        setEditCoverOpen(true);
    };

    const handleSaveCover = () => {
        setFormData(p => ({ ...p, ...editedCoverData }));
        setEditCoverOpen(false);
        toast.success("Campos da capa atualizados!");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { id, created_date, updated_date, created_by, ...updateData } = formData;
            if (updateData.data_inspecao && !updateData.data_inspecao.includes('T')) {
                updateData.data_inspecao = updateData.data_inspecao + 'T12:00:00';
            }

            await base44.entities.InspecaoGas.update(id, updateData);
            toast.success("Inspeção atualizada com sucesso!");
            navigate(createPageUrl(`EmpreendimentoInspecaoGas?empreendimentoId=${formData.id_empreendimento}`));
        } catch (error) {
            console.error("Erro ao atualizar inspeção:", error);
            toast.error("Falha ao atualizar a inspeção.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">{t.title}</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleOpenEditCover}>
                        <Edit2 className="w-4 h-4 mr-2"/>Editar Capa
                    </Button>
                    <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-2"/>{t.back}</Button>
                </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>{t.generalInfo}</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2"><Label>{t.reportTitle}</Label><Input value={formData.titulo_relatorio} onChange={e => handleInputChange('titulo_relatorio', e.target.value)} /></div>
                        <div className="space-y-2"><Label>{t.engineer}</Label><Input value={formData.eng_responsavel} onChange={e => handleInputChange('eng_responsavel', e.target.value)} /></div>
                        <div className="space-y-2"><Label>{t.revision}</Label><Input value={formData.revisao} onChange={e => handleInputChange('revisao', e.target.value)} /></div>
                        <div className="space-y-2"><Label>{t.inspectionDate}</Label><Input type="date" value={formData.data_inspecao} onChange={e => handleInputChange('data_inspecao', e.target.value)} /></div>
                        <div className="space-y-2">
                            <Label>Nome do Arquivo (opcional)</Label>
                            <Input 
                                placeholder="Ex: IGAS-2025-01" 
                                value={formData.nome_arquivo || ''} 
                                onChange={e => handleInputChange('nome_arquivo', e.target.value)} 
                            />
                            <p className="text-xs text-gray-500">Se não preenchido, o arquivo não será exibido no rodapé</p>
                        </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>{t.documentation}</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        {(formData.itens_documentacao || []).map((item, itemIndex) => (
                            <div key={itemIndex} className="p-3 border rounded-md bg-gray-50 space-y-2">
                                <div className="flex items-center gap-3">
                                    <Input placeholder={t.description} value={item.descricao} onChange={e => handleDocItemChange(itemIndex, 'descricao', e.target.value)} className="flex-1" />
                                    <div className="flex items-center gap-2">
                                        <Checkbox checked={item.resultado === 'OK'} onCheckedChange={checked => handleDocItemChange(itemIndex, 'resultado', checked ? 'OK' : '')} />
                                        <Label className="text-sm">Recebido</Label>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeDocItem(itemIndex)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                </div>
                                <Input placeholder={t.observations} value={item.observacoes} onChange={e => handleDocItemChange(itemIndex, 'observacoes', e.target.value)} />
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={addDocItem}><Plus className="w-4 h-4 mr-2" /> {t.addItem}</Button>
                        
                        <div className="mt-4 space-y-2">
                            <Label className="font-medium">Observações Gerais</Label>
                            <Textarea 
                                placeholder="Observações gerais sobre a documentação técnica..." 
                                value={formData.comentarios_documentacao || ''} 
                                onChange={e => handleInputChange('comentarios_documentacao', e.target.value)}
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>{t.locations}</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        {formData.locais.map((local, localIndex) => (
                            <div key={localIndex} className="p-4 border rounded-lg space-y-4 bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <Input placeholder={t.locationName} value={local.nome_local} onChange={e => handleLocalChange(localIndex, 'nome_local', e.target.value)} className="font-semibold max-w-md" />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLocal(localIndex)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                </div>

                                <div className="pl-4 border-l-2 space-y-3">
                                    <h4 className="font-medium text-green-700">{t.physicalInspection}</h4>
                                    {(local.itens_inspecao || []).map((item, itemIndex) => {
                                        if (item.tipo === 'comentario') {
                                            return (
                                                <div key={itemIndex} className="p-3 border-2 border-purple-300 rounded-md bg-purple-50 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="font-bold text-purple-700">Comentários</Label>
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeInspItem(localIndex, itemIndex)}>
                                                            <Trash2 className="w-4 h-4 text-red-500" />
                                                        </Button>
                                                    </div>
                                                    <Textarea 
                                                        placeholder="Digite os comentários..." 
                                                        value={item.texto || ''} 
                                                        onChange={e => handleInspItemChange(localIndex, itemIndex, 'texto', e.target.value)} 
                                                        rows={3}
                                                    />
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={itemIndex} className="p-3 border rounded-md bg-white space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <Input placeholder={t.description} value={item.descricao} onChange={e => handleInspItemChange(localIndex, itemIndex, 'descricao', e.target.value)} className="flex-1" />
                                                    <div className="flex items-center gap-2">
                                                        <Checkbox checked={item.resultado === 'OK'} onCheckedChange={checked => handleInspItemChange(localIndex, itemIndex, 'resultado', checked ? 'OK' : '')} />
                                                        <Label className="text-sm">OK</Label>
                                                        <Checkbox checked={item.resultado === 'N/OK'} onCheckedChange={checked => handleInspItemChange(localIndex, itemIndex, 'resultado', checked ? 'N/OK' : '')} />
                                                        <Label className="text-sm">N/OK</Label>
                                                        <Checkbox checked={item.resultado === 'NA'} onCheckedChange={checked => handleInspItemChange(localIndex, itemIndex, 'resultado', checked ? 'NA' : '')} />
                                                        <Label className="text-sm">NA</Label>
                                                    </div>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeInspItem(localIndex, itemIndex)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                                </div>
                                                <Input placeholder={t.observations} value={item.observacoes} onChange={e => handleInspItemChange(localIndex, itemIndex, 'observacoes', e.target.value)} />
                                                <div>
                                                    <Label className="text-sm">{t.photos}</Label>
                                                    <Input type="file" multiple accept="image/*" onChange={(e) => handlePhotoUpload(e, localIndex, itemIndex)} disabled={uploadingPhoto} className="mb-2" />
                                                    {uploadingPhoto && <div className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> {t.uploading}</div>}
                                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                                        {(item.fotos || []).map((foto, photoIndex) => (
                                                            <div key={photoIndex} className="relative">
                                                                <img src={foto.url} className="w-full h-20 object-cover rounded" />
                                                                <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-5 w-5" onClick={() => removePhoto(localIndex, itemIndex, photoIndex)}><Trash2 className="w-3 h-3" /></Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    </div>

                                    {/* Comentários do Local */}
                                    <div className="pl-4 border-l-2 space-y-2">
                                        <h4 className="font-medium text-purple-700">Comentários</h4>
                                        <Textarea 
                                            placeholder="Comentários sobre este local..." 
                                            value={local.comentarios || ''} 
                                            onChange={e => handleLocalChange(localIndex, 'comentarios', e.target.value)}
                                            rows={3}
                                            className="bg-white"
                                        />
                                    </div>

                                    <div className="pl-4 flex gap-2">
                                        <Button type="button" variant="outline" size="sm" onClick={() => addInspItem(localIndex)}><Plus className="w-4 h-4 mr-2" /> {t.addItem}</Button>
                                        <Button type="button" variant="outline" size="sm" onClick={() => addComentarioItem(localIndex)} className="bg-purple-50 hover:bg-purple-100">
                                            <Plus className="w-4 h-4 mr-2" /> Adicionar Comentários
                                        </Button>
                                    </div>
                            </div>
                        ))}
                        <Button type="button" variant="secondary" onClick={addLocal}><Plus className="w-4 h-4 mr-2" /> {t.addLocation}</Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>{t.generalObservations}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea value={formData.observacoes_gerais || ''} onChange={e => handleInputChange('observacoes_gerais', e.target.value)} rows={4} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Conclusão - 1ª Vistoria (R01)</Label>
                                <select value={formData.conclusao_r01 || ''} onChange={e => handleInputChange('conclusao_r01', e.target.value)} className="w-full border rounded px-2 py-2 text-sm">
                                    <option value="">-- Selecionar --</option>
                                    <option value="totalidade">Aprovado com totalidade</option>
                                    <option value="ressalvas">Aprovado com ressalvas</option>
                                    <option value="reprovado">Reprovado</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label>Conclusão - 2ª Vistoria (R02)</Label>
                                <select value={formData.conclusao_r02 || ''} onChange={e => handleInputChange('conclusao_r02', e.target.value)} className="w-full border rounded px-2 py-2 text-sm">
                                    <option value="">-- Selecionar --</option>
                                    <option value="totalidade">Aprovado com totalidade</option>
                                    <option value="ressalvas">Aprovado com ressalvas</option>
                                    <option value="reprovado">Reprovado</option>
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>{t.signatures}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {formData.assinaturas.map((assinatura, index) => (
                            <div key={index} className="p-4 border rounded-lg bg-gray-50 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label>{t.party}</Label>
                                        <Input value={assinatura.parte} onChange={e => handleAssinaturaChange(index, 'parte', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>{t.name}</Label>
                                        <Input value={assinatura.nome} onChange={e => handleAssinaturaChange(index, 'nome', e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Assinatura</Label>
                                    <div className="border-2 border-dashed rounded-lg p-4 bg-white flex items-center justify-center min-h-[120px]">
                                        {assinatura.assinatura_imagem ? (
                                            <img src={assinatura.assinatura_imagem} alt="Assinatura" className="max-h-24 object-contain" />
                                        ) : (
                                            <p className="text-gray-400 text-sm">Sem assinatura</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="button" variant="outline" size="sm" onClick={() => openSignatureDialog(index)}>
                                            <Edit2 className="w-4 h-4 mr-2" />
                                            {assinatura.assinatura_imagem ? 'Editar Assinatura' : 'Adicionar Assinatura'}
                                        </Button>
                                        {assinatura.assinatura_imagem && (
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => handleAssinaturaChange(index, 'assinatura_imagem', '')}
                                            >
                                                Limpar
                                            </Button>
                                        )}
                                        <Button type="button" variant="ghost" size="sm" onClick={() => removeAssinatura(index)}>
                                            <Trash2 className="w-4 h-4 text-red-500 mr-2" />
                                            Remover
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <Button type="button" variant="outline" onClick={addAssinatura}><Plus className="w-4 h-4 mr-2" /> {t.addSignature}</Button>
                    </CardContent>
                </Card>

                <Dialog open={editCoverOpen} onOpenChange={setEditCoverOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Editar Capa</DialogTitle>
                            <DialogDescription>Configure os campos da capa do relatório</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="border rounded-lg p-4 bg-blue-50">
                                <h3 className="font-semibold text-sm mb-4 text-blue-900">Títulos da Capa</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs font-semibold">Título Principal</Label>
                                        <Input value={editedCoverData?.titulo_capa || ''} onChange={e => setEditedCoverData({...editedCoverData, titulo_capa: e.target.value})} className="mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold">Subtítulo (vermelho)</Label>
                                        <Input value={editedCoverData?.subtitulo_capa || ''} onChange={e => setEditedCoverData({...editedCoverData, subtitulo_capa: e.target.value})} className="mt-1" />
                                    </div>
                                </div>
                            </div>
                            <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                                <h3 className="font-semibold text-sm mb-4 text-green-900">Informações Centrais da Capa</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs font-semibold">Nome do Empreendimento (grande)</Label>
                                        <Input value={editedCoverData?.cliente || ''} onChange={e => setEditedCoverData({...editedCoverData, cliente: e.target.value})} placeholder="Ex: MOST MOEMA" className="mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold">Informações Adicionais (pequeno)</Label>
                                        <Input value={editedCoverData?.subtitulo_relatorio || ''} onChange={e => setEditedCoverData({...editedCoverData, subtitulo_relatorio: e.target.value})} placeholder="Ex: Ed. Most Moema | MPD" className="mt-1" />
                                    </div>
                                </div>
                            </div>
                            <div className="border rounded-lg p-4 bg-red-50 border-red-200">
                                <h3 className="font-semibold text-sm mb-4 text-red-900">Rodapé da Capa</h3>
                                <div>
                                    <Label className="text-xs font-semibold">Texto do Rodapé</Label>
                                    <Input value={editedCoverData?.texto_rodape_capa || ''} onChange={e => setEditedCoverData({...editedCoverData, texto_rodape_capa: e.target.value})} placeholder="Ex: Most Moema | Ed. Most Moema | MPD" className="mt-1" />
                                    <p className="text-xs text-gray-500 mt-1">Este texto será exibido no rodapé da capa</p>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditCoverOpen(false)}>Cancelar</Button>
                            <Button type="button" onClick={handleSaveCover}>Salvar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {activeSignatureIndex !== null && formData.assinaturas[activeSignatureIndex]?.assinatura_imagem 
                                    ? 'Editar Assinatura' 
                                    : 'Adicionar Assinatura'}
                            </DialogTitle>
                            <DialogDescription>Escolha entre desenhar ou digitar sua assinatura</DialogDescription>
                        </DialogHeader>

                        {activeSignatureIndex !== null && formData.assinaturas[activeSignatureIndex]?.assinatura_imagem && (
                            <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                                <Label className="text-xs text-gray-600 mb-2 block">Assinatura atual:</Label>
                                <div className="flex justify-center border-b-2 border-gray-300 pb-2">
                                    <img 
                                        src={formData.assinaturas[activeSignatureIndex].assinatura_imagem} 
                                        alt="Assinatura atual" 
                                        className="max-h-16 object-contain"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 mb-4">
                            <Button
                                type="button"
                                variant={signatureMode === 'draw' ? 'default' : 'outline'}
                                onClick={() => setSignatureMode('draw')}
                                className="flex-1"
                            >
                                Desenhar
                            </Button>
                            <Button
                                type="button"
                                variant={signatureMode === 'type' ? 'default' : 'outline'}
                                onClick={() => setSignatureMode('type')}
                                className="flex-1"
                            >
                                Digitar
                            </Button>
                        </div>

                        {signatureMode === 'draw' ? (
                            <div className="border rounded-md overflow-hidden h-52 bg-white">
                                <SimpleSignaturePad ref={signaturePadRef} />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label>Digite sua assinatura</Label>
                                <Input
                                    type="text"
                                    value={typedSignature}
                                    onChange={(e) => setTypedSignature(e.target.value)}
                                    placeholder="Digite seu nome..."
                                    className="text-sm"
                                    style={{ fontFamily: 'Calibri, sans-serif' }}
                                />
                                <p className="text-xs text-gray-500">Será exibida em fonte Calibri</p>
                            </div>
                        )}

                        <DialogFooter className="flex justify-between">
                            {signatureMode === 'draw' && (
                                <Button type="button" variant="outline" onClick={handleClearSignature}>
                                    Limpar
                                </Button>
                            )}
                            <div className="flex gap-2 ml-auto">
                                <Button type="button" variant="ghost" onClick={() => setShowSignatureDialog(false)}>
                                    Cancelar
                                </Button>
                                <Button type="button" onClick={handleSaveSignature}>
                                    Salvar
                                </Button>
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <div className="flex justify-end gap-4">
                    <Button type="submit" disabled={saving}>
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> {t.saving}</> : t.save}
                    </Button>
                </div>
            </form>
        </div>
    );
}