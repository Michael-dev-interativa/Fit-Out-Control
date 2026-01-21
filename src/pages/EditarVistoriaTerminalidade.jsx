import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { VistoriaTerminalidade } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Upload, ArrowLeft, Edit2 } from 'lucide-react';
import { UploadFile } from '@/api/integrations';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SimpleSignaturePad } from '@/components/signature/SignaturePadComponent';

const t = {
    title: "Editar Vistoria de Terminalidade",
    save: "Salvar Alterações",
    saving: "Salvando...",
    back: "Voltar",
    generalInfo: "Informações Gerais",
    reportTitle: "Título do Relatório",
    reportSubtitle: "Subtítulo do Relatório",
    client: "Cliente",
    revision: "Revisão",
    engineer: "Engenheiro da Obra",
    surveyDate: "Data da Vistoria",
    sections: "Seções do Checklist",
    addSection: "Adicionar Seção",
    sectionName: "Nome da Seção",
    items: "Itens",
    addItem: "Adicionar Item",
    location: "Local",
    complement: "Responsável",
    discipline: "Disciplina",
    anomaly: "Não Conformidade",
    improvementPlan: "Plano de Melhoria",
    schedule: "Status",
    photos: "Fotos",
    addPhotos: "Adicionar Fotos",
    signatures: "Assinaturas",
    addSignature: "Adicionar Assinatura",
    party: "Parte (Ex: Cliente)",
    name: "Nome",
    uploading: "Enviando...",
};

export default function EditarVistoriaTerminalidade() {
    const navigate = useNavigate();
    const location = useLocation();
    const [vistoriaId] = useState(() => new URLSearchParams(location.search).get('vistoriaId'));
    
    const [formData, setFormData] = useState(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    
    const [showSignatureDialog, setShowSignatureDialog] = useState(false);
    const [activeSignatureIndex, setActiveSignatureIndex] = useState(null);
    const [signatureMode, setSignatureMode] = useState('draw');
    const [typedSignature, setTypedSignature] = useState('');
    const signaturePadRef = React.useRef(null);

    useEffect(() => {
        if (!vistoriaId) {
            toast.error("ID da vistoria não encontrado.");
            navigate(-1);
            return;
        }
        const loadData = async () => {
            try {
                const data = await VistoriaTerminalidade.get(vistoriaId);
                // Mantém a data completa se for ISO, ou converte para formato de date se for só a data
                let dataVistoria = '';
                if (data.data_vistoria) {
                    // Se a data incluir 'T', é ISO, pegamos só a parte da data
                    // Se não, já está no formato correto
                    dataVistoria = data.data_vistoria.includes('T') 
                        ? data.data_vistoria.split('T')[0] 
                        : data.data_vistoria;
                }

                // Garantir que todos os itens tenham o campo data_status
                const secoesProcessed = (data.secoes || []).map(secao => ({
                    ...secao,
                    itens: (secao.itens || []).map(item => ({
                        ...item,
                        data_status: item.data_status ? (item.data_status.includes('T') ? item.data_status.split('T')[0] : item.data_status) : ''
                    }))
                }));

                setFormData({
                    ...data,
                    data_vistoria: dataVistoria,
                    secoes: secoesProcessed,
                    assinaturas: data.assinaturas || [],
                });
            } catch (error) {
                toast.error("Falha ao carregar dados da vistoria.");
                navigate(-1);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [vistoriaId, navigate]);

    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    if (!formData) return null;

    const handleInputChange = (field, value) => setFormData(p => ({ ...p, [field]: value }));

    const handleSecaoChange = (secIndex, field, value) => {
        const newSecoes = [...formData.secoes];
        newSecoes[secIndex][field] = value;
        handleInputChange('secoes', newSecoes);
    };

    const addSecao = () => handleInputChange('secoes', [...formData.secoes, { nome_secao: '', itens: [] }]);
    const removeSecao = (secIndex) => handleInputChange('secoes', formData.secoes.filter((_, i) => i !== secIndex));

    const handleItemChange = (secIndex, itemIndex, field, value) => {
        const newSecoes = [...formData.secoes];
        newSecoes[secIndex].itens[itemIndex][field] = value;
        handleInputChange('secoes', newSecoes);
    };
    
    const addItem = (secIndex) => {
        const newSecoes = [...formData.secoes];
        if (!newSecoes[secIndex].itens) newSecoes[secIndex].itens = [];
        newSecoes[secIndex].itens.push({ local: '', complemento: '', disciplina: '', anomalia: '', plano_melhoria: '', cronograma_atividade: 'Pendente', data_status: '', responsavel: '', fotos: [] });
        handleInputChange('secoes', newSecoes);
    };

    const removeItem = (secIndex, itemIndex) => {
        const newSecoes = [...formData.secoes];
        newSecoes[secIndex].itens = newSecoes[secIndex].itens.filter((_, i) => i !== itemIndex);
        handleInputChange('secoes', newSecoes);
    };
    
    const handlePhotoUpload = async (e, secIndex, itemIndex) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setUploadingPhoto(true);
        try {
            const uploadedPhotos = await Promise.all(files.map(async file => {
                const { file_url } = await UploadFile({ file });
                return { url: file_url, legenda: '' };
            }));
            const newSecoes = [...formData.secoes];
            if (!newSecoes[secIndex].itens[itemIndex].fotos) newSecoes[secIndex].itens[itemIndex].fotos = [];
            newSecoes[secIndex].itens[itemIndex].fotos.push(...uploadedPhotos);
            handleInputChange('secoes', newSecoes);
        } catch (err) {
            toast.error("Falha no upload da foto.");
        } finally {
            setUploadingPhoto(false);
        }
    };

    const removePhoto = (secIndex, itemIndex, photoIndex) => {
        const newSecoes = [...formData.secoes];
        newSecoes[secIndex].itens[itemIndex].fotos = newSecoes[secIndex].itens[itemIndex].fotos.filter((_, i) => i !== photoIndex);
        handleInputChange('secoes', newSecoes);
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

                const { file_url } = await UploadFile({ file });
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

                    const { file_url } = await UploadFile({ file });
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { id, created_date, updated_date, created_by, ...updateData } = formData;
            // Garantir que a data seja enviada no formato correto sem conversão de timezone
            if (updateData.data_vistoria && !updateData.data_vistoria.includes('T')) {
                updateData.data_vistoria = updateData.data_vistoria + 'T12:00:00';
            }

            // Processar datas dos itens - garantir que data_status seja salva
            updateData.secoes = updateData.secoes.map(secao => ({
                ...secao,
                itens: (secao.itens || []).map(item => {
                    const processedItem = { ...item };
                    // Se data_status existir e não estiver vazia, processar
                    if (processedItem.data_status && processedItem.data_status.trim() !== '') {
                        // Se não tiver 'T', adicionar timestamp
                        if (!processedItem.data_status.includes('T')) {
                            processedItem.data_status = processedItem.data_status + 'T12:00:00';
                        }
                    } else {
                        // Se estiver vazio, garantir que seja null ou undefined, não string vazia
                        processedItem.data_status = null;
                    }
                    return processedItem;
                })
            }));

            console.log('[SAVE] Dados antes de salvar:', JSON.stringify(updateData.secoes[0].itens[0], null, 2));
            await VistoriaTerminalidade.update(id, updateData);
            toast.success("Vistoria atualizada com sucesso!");
            navigate(createPageUrl(`EmpreendimentoVistoriasTerminalidade?empreendimentoId=${formData.id_empreendimento}`));
        } catch (error) {
            console.error("Erro ao atualizar vistoria:", error);
            toast.error("Falha ao atualizar a vistoria.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">{t.title}</h1>
                <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-2"/>{t.back}</Button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                 <Card>
                    <CardHeader><CardTitle>{t.generalInfo}</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2"><Label>{t.reportTitle}</Label><Input value={formData.titulo_relatorio} onChange={e => handleInputChange('titulo_relatorio', e.target.value)} /></div>
                        <div className="space-y-2"><Label>{t.reportSubtitle}</Label><Input value={formData.subtitulo_relatorio} onChange={e => handleInputChange('subtitulo_relatorio', e.target.value)} /></div>
                        <div className="space-y-2"><Label>{t.client}</Label><Input value={formData.cliente} onChange={e => handleInputChange('cliente', e.target.value)} /></div>
                        <div className="space-y-2"><Label>{t.engineer}</Label><Input value={formData.eng_obra} onChange={e => handleInputChange('eng_obra', e.target.value)} /></div>
                        <div className="space-y-2"><Label>{t.revision}</Label><Input value={formData.revisao} onChange={e => handleInputChange('revisao', e.target.value)} /></div>
                        <div className="space-y-2"><Label>{t.surveyDate}</Label><Input type="date" value={formData.data_vistoria} onChange={e => handleInputChange('data_vistoria', e.target.value)} /></div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>{t.sections}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {formData.secoes.map((secao, secIndex) => (
                            <div key={secIndex} className="p-4 border rounded-lg space-y-4 bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <Input placeholder={t.sectionName} value={secao.nome_secao} onChange={e => handleSecaoChange(secIndex, 'nome_secao', e.target.value)} className="font-semibold" />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeSecao(secIndex)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                </div>
                                <div className="pl-4 border-l-2 space-y-3">
                                    <h4 className="font-medium">{t.items}</h4>
                                    {(secao.itens || []).map((item, itemIndex) => (
                                        <div key={itemIndex} className="p-3 border rounded-md bg-white space-y-3">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                <Input placeholder={t.location} value={item.local} onChange={e => handleItemChange(secIndex, itemIndex, 'local', e.target.value)} />
                                                <Input placeholder={t.discipline} value={item.disciplina} onChange={e => handleItemChange(secIndex, itemIndex, 'disciplina', e.target.value)} />
                                                <Textarea placeholder={t.anomaly} value={item.anomalia} onChange={e => handleItemChange(secIndex, itemIndex, 'anomalia', e.target.value)} className="md:col-span-2" />
                                                <Input placeholder={t.improvementPlan} value={item.plano_melhoria} onChange={e => handleItemChange(secIndex, itemIndex, 'plano_melhoria', e.target.value)} />
                                                <Select value={item.cronograma_atividade} onValueChange={v => handleItemChange(secIndex, itemIndex, 'cronograma_atividade', v)}>
                                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="OK">Concluído</SelectItem>
                                                        <SelectItem value="Parcial">Parcial</SelectItem>
                                                        <SelectItem value="Pendente">Pendente</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Input 
                                                    type="date" 
                                                    placeholder="Data do Status" 
                                                    value={item.data_status || ''} 
                                                    onChange={e => handleItemChange(secIndex, itemIndex, 'data_status', e.target.value)} 
                                                />
                                                <Textarea placeholder="Responsável" value={item.responsavel || ''} onChange={e => handleItemChange(secIndex, itemIndex, 'responsavel', e.target.value)} rows={2} />
                                            </div>
                                            <div>
                                                <Label className="text-sm">{t.photos}</Label>
                                                <Input type="file" multiple accept="image/*" onChange={(e) => handlePhotoUpload(e, secIndex, itemIndex)} disabled={uploadingPhoto} className="mb-2" />
                                                {uploadingPhoto && <div className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> {t.uploading}</div>}
                                                <div className="grid grid-cols-3 gap-2 mt-2">
                                                    {(item.fotos || []).map((foto, photoIndex) => (
                                                        <div key={photoIndex} className="relative">
                                                            <img src={foto.url} className="w-full h-20 object-cover rounded" />
                                                            <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-5 w-5" onClick={() => removePhoto(secIndex, itemIndex, photoIndex)}><Trash2 className="w-3 h-3" /></Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(secIndex, itemIndex)} className="text-red-500 hover:bg-red-50 w-full"><Trash2 className="w-4 h-4 mr-2"/> Remover Item</Button>
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={() => addItem(secIndex)}><Plus className="w-4 h-4 mr-2" /> {t.addItem}</Button>
                                </div>
                            </div>
                        ))}
                        <Button type="button" variant="secondary" onClick={addSecao}><Plus className="w-4 h-4 mr-2" /> {t.addSection}</Button>
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

                <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Adicionar Assinatura</DialogTitle>
                            <DialogDescription>Escolha entre desenhar ou digitar sua assinatura</DialogDescription>
                        </DialogHeader>

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
                                <Button variant="outline" onClick={handleClearSignature}>
                                    Limpar
                                </Button>
                            )}
                            <div className="flex gap-2 ml-auto">
                                <Button variant="ghost" onClick={() => setShowSignatureDialog(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleSaveSignature}>
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