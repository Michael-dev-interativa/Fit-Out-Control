import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { VistoriaTerminalidade } from '@/api/entities';
import { Empreendimento } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, ArrowLeft, Upload, Edit2 } from 'lucide-react';
import { UploadFile } from '@/api/integrations';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SimpleSignaturePad } from '@/components/signature/SignaturePadComponent';

const t = {
    title: "Nova Vistoria de Terminalidade",
    save: "Salvar Vistoria",
    saving: "Salvando...",
    back: "Voltar",
    info: "Informações Gerais",
    titleReport: "Título do Relatório",
    subtitleReport: "Subtítulo do Relatório",
    date: "Data da Vistoria",
    client: "Cliente / Loja",
    engObra: "Eng. Obra",
    revisao: "Revisão",
    sections: "Seções do Checklist",
    addSection: "Adicionar Seção",
    sectionName: "Nome da Seção (Ex: Instalações)",
    items: "Itens",
    addItem: "Adicionar Item",
    local: "Local",
    complemento: "Complemento",
    disciplina: "Disciplina",
    anomalia: "Não Conformidade",
    planoMelhoria: "Plano de Melhoria",
    cronograma: "Status",
    photos: "Fotos",
    uploadPhoto: "Carregar Foto",
    legend: "Legenda",
    signatures: "Assinaturas",
    addSignature: "Adicionar Assinatura",
    part: "Parte (Ex: Contratante)",
    name: "Nome",
};

const cronogramaOptions = ["Concluído", "Parcial", "Pendente"];

export default function NovaVistoriaTerminalidade() {
    const navigate = useNavigate();
    const location = useLocation();
    const empreendimentoId = new URLSearchParams(location.search).get('empreendimentoId');

    const [formData, setFormData] = useState({
        id_empreendimento: empreendimentoId,
        data_vistoria: new Date().toISOString().split('T')[0],
        titulo_relatorio: '',
        subtitulo_relatorio: '',
        cliente: '',
        eng_obra: '',
        revisao: '00',
        secoes: [{ nome_secao: '', itens: [{ local: '', complemento: '', disciplina: '', anomalia: '', plano_melhoria: '', cronograma_atividade: 'Pendente', data_status: '', responsavel: '', fotos: [] }] }],
        assinaturas: [{ parte: '', nome: '', assinatura_imagem: '' }]
    });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showSignatureDialog, setShowSignatureDialog] = useState(false);
    const [activeSignatureIndex, setActiveSignatureIndex] = useState(null);
    const [signatureMode, setSignatureMode] = useState('draw');
    const [typedSignature, setTypedSignature] = useState('');
    const signaturePadRef = React.useRef(null);

    useEffect(() => {
        const fetchEmpreendimentoData = async () => {
            if (empreendimentoId) {
                try {
                    const emp = await Empreendimento.get(empreendimentoId);
                    setFormData(prev => ({
                        ...prev,
                        subtitulo_relatorio: emp.nome_empreendimento || '',
                    }));
                } catch (error) {
                    console.error("Erro ao buscar dados do empreendimento:", error);
                }
            }
        };
        fetchEmpreendimentoData();
    }, [empreendimentoId]);

    const handleInputChange = (field, value) => setFormData(p => ({ ...p, [field]: value }));

    const handleSectionChange = (index, value) => {
        const newSecoes = [...formData.secoes];
        newSecoes[index].nome_secao = value;
        setFormData(p => ({ ...p, secoes: newSecoes }));
    };

    const addSection = () => {
        setFormData(p => ({ ...p, secoes: [...p.secoes, { nome_secao: '', itens: [{ local: '', complemento: '', disciplina: '', anomalia: '', plano_melhoria: '', cronograma_atividade: 'Pendente', data_status: '', responsavel: '', fotos: [] }] }] }));
    };

    const removeSection = (index) => {
        setFormData(p => ({ ...p, secoes: p.secoes.filter((_, i) => i !== index) }));
    };

    const handleItemChange = (secIndex, itemIndex, field, value) => {
        const newSecoes = [...formData.secoes];
        newSecoes[secIndex].itens[itemIndex][field] = value;
        setFormData(p => ({ ...p, secoes: newSecoes }));
    };

    const addItem = (secIndex) => {
        const newSecoes = [...formData.secoes];
        newSecoes[secIndex].itens.push({ local: '', complemento: '', disciplina: '', anomalia: '', plano_melhoria: '', cronograma_atividade: 'Pendente', data_status: '', responsavel: '', fotos: [] });
        setFormData(p => ({ ...p, secoes: newSecoes }));
    };

    const removeItem = (secIndex, itemIndex) => {
        const newSecoes = [...formData.secoes];
        newSecoes[secIndex].itens = newSecoes[secIndex].itens.filter((_, i) => i !== itemIndex);
        setFormData(p => ({ ...p, secoes: newSecoes }));
    };

    const handlePhotoUpload = async (e, secIndex, itemIndex) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setUploading(true);
        try {
            const uploadedPhotos = await Promise.all(files.map(async file => {
                const { file_url } = await UploadFile({ file });
                return { url: file_url, legenda: '' };
            }));
            const newSecoes = [...formData.secoes];
            newSecoes[secIndex].itens[itemIndex].fotos.push(...uploadedPhotos);
            setFormData(p => ({ ...p, secoes: newSecoes }));
        } catch (err) {
            toast.error("Falha no upload da foto.");
        } finally {
            setUploading(false);
        }
    };

    const removePhoto = (secIndex, itemIndex, photoIndex) => {
        const newSecoes = [...formData.secoes];
        newSecoes[secIndex].itens[itemIndex].fotos = newSecoes[secIndex].itens[itemIndex].fotos.filter((_, i) => i !== photoIndex);
        setFormData(p => ({ ...p, secoes: newSecoes }));
    };

    const handlePhotoLegendChange = (secIndex, itemIndex, photoIndex, value) => {
        const newSecoes = [...formData.secoes];
        newSecoes[secIndex].itens[itemIndex].fotos[photoIndex].legenda = value;
        setFormData(p => ({ ...p, secoes: newSecoes }));
    };

    const handleSignatureChange = (index, field, value) => {
        const newSignatures = [...formData.assinaturas];
        newSignatures[index][field] = value;
        setFormData(p => ({ ...p, assinaturas: newSignatures }));
    };

    const addSignature = () => setFormData(p => ({ ...p, assinaturas: [...p.assinaturas, { parte: '', nome: '', assinatura_imagem: '' }] }));
    const removeSignature = (index) => setFormData(p => ({ ...p, assinaturas: p.assinaturas.filter((_, i) => i !== index) }));

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

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.fillStyle = '#000000';
                ctx.font = '48px Calibri';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(typedSignature, canvas.width / 2, canvas.height - 20);

                const signatureDataUrl = canvas.toDataURL('image/png', 0.92);
                const blob = await fetch(signatureDataUrl).then(res => res.blob());
                const file = new File([blob], `assinatura-${Date.now()}.png`, { type: 'image/png' });

                const { file_url } = await UploadFile({ file });
                handleSignatureChange(activeSignatureIndex, 'assinatura_imagem', file_url);
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
                    handleSignatureChange(activeSignatureIndex, 'assinatura_imagem', file_url);
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
            // Garantir que a data seja enviada no formato correto sem conversão de timezone
            const dataToSubmit = { ...formData };
            if (dataToSubmit.data_vistoria && !dataToSubmit.data_vistoria.includes('T')) {
                dataToSubmit.data_vistoria = dataToSubmit.data_vistoria + 'T12:00:00';
            }
            await VistoriaTerminalidade.create(dataToSubmit);
            toast.success("Vistoria de terminalidade criada com sucesso!");
            navigate(createPageUrl(`EmpreendimentoVistoriasTerminalidade?empreendimentoId=${empreendimentoId}`));
        } catch (error) {
            console.error("Erro ao criar vistoria:", error);
            toast.error("Falha ao criar o registro.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">{t.title}</h1>
                <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-2" />{t.back}</Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>{t.info}</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2"><Label>{t.titleReport}</Label><Input value={formData.titulo_relatorio} onChange={e => handleInputChange('titulo_relatorio', e.target.value)} required /></div>
                        <div className="space-y-2"><Label>{t.subtitleReport}</Label><Input value={formData.subtitulo_relatorio} onChange={e => handleInputChange('subtitulo_relatorio', e.target.value)} /></div>
                        <div className="space-y-2"><Label>{t.client}</Label><Input value={formData.cliente} onChange={e => handleInputChange('cliente', e.target.value)} /></div>
                        <div className="space-y-2"><Label>{t.date}</Label><Input type="date" value={formData.data_vistoria} onChange={e => handleInputChange('data_vistoria', e.target.value)} required /></div>
                        <div className="space-y-2"><Label>{t.engObra}</Label><Input value={formData.eng_obra} onChange={e => handleInputChange('eng_obra', e.target.value)} /></div>
                        <div className="space-y-2"><Label>{t.revisao}</Label><Input value={formData.revisao} onChange={e => handleInputChange('revisao', e.target.value)} /></div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>{t.sections}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {formData.secoes.map((secao, secIndex) => (
                            <Card key={secIndex} className="p-4 bg-gray-50">
                                <div className="flex justify-between items-center mb-2">
                                    <Input placeholder={t.sectionName} value={secao.nome_secao} onChange={e => handleSectionChange(secIndex, e.target.value)} className="font-bold" />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeSection(secIndex)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                </div>

                                {secao.itens.map((item, itemIndex) => (
                                    <div key={itemIndex} className="border-t pt-4 mt-4 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <Label>{`${t.items} ${itemIndex + 1}`}</Label>
                                            <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(secIndex, itemIndex)}><Trash2 className="w-3 h-3 mr-1" />Remover Item</Button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <Input placeholder={t.local} value={item.local} onChange={e => handleItemChange(secIndex, itemIndex, 'local', e.target.value)} />
                                            <Input placeholder={t.complemento} value={item.complemento} onChange={e => handleItemChange(secIndex, itemIndex, 'complemento', e.target.value)} />
                                            <Input placeholder={t.disciplina} value={item.disciplina} onChange={e => handleItemChange(secIndex, itemIndex, 'disciplina', e.target.value)} />
                                        </div>

                                        <Textarea placeholder={t.anomalia} value={item.anomalia} onChange={e => handleItemChange(secIndex, itemIndex, 'anomalia', e.target.value)} />

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <Input placeholder={t.planoMelhoria} value={item.plano_melhoria} onChange={e => handleItemChange(secIndex, itemIndex, 'plano_melhoria', e.target.value)} />
                                            <Select value={item.cronograma_atividade} onValueChange={v => handleItemChange(secIndex, itemIndex, 'cronograma_atividade', v)}>
                                                <SelectTrigger><SelectValue placeholder={t.cronograma} /></SelectTrigger>
                                                <SelectContent>{cronogramaOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <Input type="date" placeholder="Data do Status" value={item.data_status} onChange={e => handleItemChange(secIndex, itemIndex, 'data_status', e.target.value)} />
                                        </div>

                                        <div className="space-y-2">
                                            <Input placeholder="Responsável" value={item.responsavel || ''} onChange={e => handleItemChange(secIndex, itemIndex, 'responsavel', e.target.value)} />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>{t.photos}</Label>
                                            <Input type="file" multiple accept="image/*" onChange={e => handlePhotoUpload(e, secIndex, itemIndex)} disabled={uploading} className="text-xs" />
                                            {uploading && <div className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> {t.saving}...</div>}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                                                {item.fotos.map((foto, photoIndex) => (
                                                    <div key={photoIndex} className="relative">
                                                        <img src={foto.url} className="w-full h-24 object-cover rounded" />
                                                        <Input placeholder={t.legend} value={foto.legenda} onChange={e => handlePhotoLegendChange(secIndex, itemIndex, photoIndex, e.target.value)} className="mt-1 text-xs" />
                                                        <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-5 w-5" onClick={() => removePhoto(secIndex, itemIndex, photoIndex)}><Trash2 className="w-3 h-3" /></Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={() => addItem(secIndex)} className="mt-4"><Plus className="w-4 h-4 mr-2" />{t.addItem}</Button>
                            </Card>
                        ))}
                        <Button type="button" variant="secondary" onClick={addSection} className="w-full"><Plus className="w-4 h-4 mr-2" />{t.addSection}</Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>{t.signatures}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {formData.assinaturas.map((assinatura, index) => (
                            <div key={index} className="p-4 border rounded-lg bg-gray-50 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label>{t.part}</Label>
                                        <Input value={assinatura.parte} onChange={e => handleSignatureChange(index, 'parte', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>{t.name}</Label>
                                        <Input value={assinatura.nome} onChange={e => handleSignatureChange(index, 'nome', e.target.value)} />
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
                                                onClick={() => handleSignatureChange(index, 'assinatura_imagem', '')}
                                            >
                                                Limpar
                                            </Button>
                                        )}
                                        <Button type="button" variant="ghost" size="sm" onClick={() => removeSignature(index)}>
                                            <Trash2 className="w-4 h-4 text-red-500 mr-2" />
                                            Remover
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <Button type="button" variant="outline" onClick={addSignature}><Plus className="w-4 h-4 mr-2" /> {t.addSignature}</Button>
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
                    <Button type="submit" disabled={saving || uploading}>
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t.saving}</> : t.save}
                    </Button>
                </div>
            </form>
        </div>
    );
}