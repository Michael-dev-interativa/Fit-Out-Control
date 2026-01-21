import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { AprovacaoAmostra } from '@/api/entities';
import { Empreendimento } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, ArrowLeft, Edit2 } from 'lucide-react';
import { UploadFile } from '@/api/integrations';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SimpleSignaturePad } from '@/components/signature/SignaturePadComponent';

const t = {
    title: "Nova Aprovação de Amostra",
    save: "Salvar",
    saving: "Salvando...",
    back: "Voltar",
    info: "Informações Gerais", // Updated
    cliente: "Cliente (Título Principal)", // Updated
    local: "Local",
    solicitante: "Solicitante",
    obra: "Obra (Subtítulo)", // Updated
    disciplina: "Disciplina",
    data: "Data do Relatório", // Updated
    assunto: "Assunto da Amostra",
    descricao: "Descrição da Amostra",
    fotos: "Fotos",
    upload: "Carregar Imagem", // New
    legenda: "Legenda", // New
    statusTitle: "Status da Aprovação", // New
    status: "Status",
    comentarios: "Comentários do Status", // Updated for clarity
    aprovacoesTitle: "Aprovações", // New
    addAprovacao: "Adicionar Aprovação",
    parte: "Parte (Ex: Cliente, Gerenciadora)", // Updated
    nomeAssinatura: "Nome / Assinatura",
};

const statusOptions = ["Aprovado", "Aprovado com Comentários", "Reprovado", "Pendente"];

export default function NovaAprovacaoAmostra() {
    const navigate = useNavigate();
    const location = useLocation();
    const urlParams = new URLSearchParams(location.search);
    const empreendimentoId = urlParams.get('empreendimentoId');

    // const [empreendimento, setEmpreendimento] = useState(null); // Not needed anymore as data is directly used in formData
    const [formData, setFormData] = useState({
        id_empreendimento: empreendimentoId,
        cliente: '',
        local: '',
        solicitante: '',
        obra: '',
        disciplina: '',
        data_relatorio: new Date().toISOString().split('T')[0],
        assunto_amostra: '',
        descricao_amostra: '',
        fotos: [], // Each photo will be { url: string, legenda: string }
        status: 'Pendente',
        comentarios_status: '',
        aprovacoes: [],
    });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false); // Using boolean for general upload state, as per original

    const [showSignatureDialog, setShowSignatureDialog] = useState(false);
    const [activeSignatureIndex, setActiveSignatureIndex] = useState(null);
    const [signatureMode, setSignatureMode] = useState('draw');
    const [typedSignature, setTypedSignature] = useState('');
    const signaturePadRef = React.useRef(null);

    useEffect(() => {
        const fetchEmpreendimentoData = async () => {
            if (empreendimentoId) {
                try {
                    const empreendimento = await Empreendimento.get(empreendimentoId);
                    setFormData(prev => ({
                        ...prev,
                        cliente: empreendimento.cli_empreendimento || '',
                        obra: empreendimento.nome_empreendimento || '',
                        local: empreendimento.endereco_empreendimento || ''
                    }));
                } catch (error) {
                    console.error("Erro ao buscar dados do empreendimento:", error);
                    toast.error("Falha ao carregar dados do empreendimento.");
                }
            }
        };
        fetchEmpreendimentoData();
    }, [empreendimentoId]);

    const handleInputChange = (field, value) => setFormData(p => ({ ...p, [field]: value }));

    const handlePhotoUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setUploading(true);
        try {
            const uploadedPhotos = await Promise.all(files.map(async file => {
                // Changed UploadFile to base44.uploadFile as per outline
                const { file_url } = await UploadFile({ file });
                return { url: file_url, legenda: '' }; // Initialize with empty legenda
            }));
            handleInputChange('fotos', [...formData.fotos, ...uploadedPhotos]);
        } catch (err) {
            toast.error("Falha no upload da foto.");
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    const removePhoto = (photoIndex) => {
        handleInputChange('fotos', formData.fotos.filter((_, i) => i !== photoIndex));
    };

    const handleFotoChange = (index, field, value) => {
        const newFotos = [...formData.fotos];
        if (newFotos[index]) {
            newFotos[index] = { ...newFotos[index], [field]: value };
            handleInputChange('fotos', newFotos);
        }
    };

    const handleAprovacaoChange = (index, field, value) => {
        const newAprovacoes = [...formData.aprovacoes];
        newAprovacoes[index][field] = value;
        handleInputChange('aprovacoes', newAprovacoes);
    };

    const addAprovacao = () => handleInputChange('aprovacoes', [...formData.aprovacoes, { parte: '', nome_assinatura: '', assinatura_imagem: '' }]);
    const removeAprovacao = (index) => handleInputChange('aprovacoes', formData.aprovacoes.filter((_, i) => i !== index));

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
                handleAprovacaoChange(activeSignatureIndex, 'assinatura_imagem', file_url);
                setShowSignatureDialog(false);
                setActiveSignatureIndex(null);
                setTypedSignature('');
                toast.success("Assinatura salva!");
            } else {
                if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
                    const signatureDataUrl = signaturePadRef.current.toDataURL();
                    const blob = await fetch(signatureDataUrl).then(res => res.blob());
                    const file = new File([blob], `assinatura-${Date.now()}.png`, { type: 'image/png' });

                    const { file_url } = await base44.uploadFile({ file });
                    handleAprovacaoChange(activeSignatureIndex, 'assinatura_imagem', file_url);
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
            await AprovacaoAmostra.create(formData);
            toast.success("Aprovação de amostra criada com sucesso!");
            navigate(createPageUrl(`EmpreendimentoAmostras?empreendimentoId=${empreendimentoId}`));
        } catch (error) {
            console.error("Erro ao criar aprovação:", error);
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
                        <div className="space-y-2"><Label>{t.cliente}</Label><Input value={formData.cliente} onChange={e => handleInputChange('cliente', e.target.value)} /></div>
                        <div className="space-y-2"><Label>{t.local}</Label><Input value={formData.local} onChange={e => handleInputChange('local', e.target.value)} /></div>
                        <div className="space-y-2"><Label>{t.solicitante}</Label><Input value={formData.solicitante} onChange={e => handleInputChange('solicitante', e.target.value)} /></div>
                        <div className="space-y-2"><Label>{t.obra}</Label><Input value={formData.obra} onChange={e => handleInputChange('obra', e.target.value)} /></div>
                        <div className="space-y-2"><Label>{t.disciplina}</Label><Input value={formData.disciplina} onChange={e => handleInputChange('disciplina', e.target.value)} /></div>
                        <div className="space-y-2"><Label>{t.data}</Label><Input type="date" value={formData.data_relatorio} onChange={e => handleInputChange('data_relatorio', e.target.value)} /></div>
                        <div className="space-y-2 md:col-span-3"><Label>{t.assunto}</Label><Input value={formData.assunto_amostra} onChange={e => handleInputChange('assunto_amostra', e.target.value)} /></div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>{t.descricao}</CardTitle></CardHeader>
                    <CardContent><Textarea value={formData.descricao_amostra} onChange={e => handleInputChange('descricao_amostra', e.target.value)} rows={5} /></CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>{t.fotos}</CardTitle></CardHeader>
                    <CardContent>
                        <Input type="file" multiple accept="image/*" onChange={handlePhotoUpload} disabled={uploading} className="mb-2" />
                        {uploading && <div className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</div>}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                            {formData.fotos.map((foto, idx) => (
                                <div key={idx} className="relative border rounded-lg p-2">
                                    <img src={foto.url} className="w-full h-32 object-cover rounded mb-2" alt={`Foto ${idx + 1}`} />
                                    <div className="space-y-1">
                                        <Label htmlFor={`legenda-${idx}`}>{t.legenda}</Label>
                                        <Input
                                            id={`legenda-${idx}`}
                                            value={foto.legenda}
                                            onChange={e => handleFotoChange(idx, 'legenda', e.target.value)}
                                            placeholder="Adicionar legenda"
                                        />
                                    </div>
                                    <Button type="button" variant="destructive" size="icon" className="absolute top-4 right-4 h-6 w-6" onClick={() => removePhoto(idx)}><Trash2 className="w-3 h-3" /></Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>{t.statusTitle}</CardTitle></CardHeader> {/* Updated title */}
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><Label>{t.status}</Label><Select value={formData.status} onValueChange={v => handleInputChange('status', v)}><SelectTrigger><SelectValue placeholder="Selecione um status" /></SelectTrigger><SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label>{t.comentarios}</Label><Input value={formData.comentarios_status} onChange={e => handleInputChange('comentarios_status', e.target.value)} /></div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>{t.aprovacoesTitle}</CardTitle></CardHeader> {/* Updated title */}
                    <CardContent className="space-y-4">
                        {formData.aprovacoes.map((aprov, index) => (
                            <div key={index} className="p-4 border rounded-lg bg-gray-50 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label>{t.parte}</Label>
                                        <Input value={aprov.parte} onChange={e => handleAprovacaoChange(index, 'parte', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>{t.nomeAssinatura}</Label>
                                        <Input value={aprov.nome_assinatura} onChange={e => handleAprovacaoChange(index, 'nome_assinatura', e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Assinatura</Label>
                                    <div className="border-2 border-dashed rounded-lg p-4 bg-white flex items-center justify-center min-h-[120px]">
                                        {aprov.assinatura_imagem ? (
                                            <img src={aprov.assinatura_imagem} alt="Assinatura" className="max-h-24 object-contain" />
                                        ) : (
                                            <p className="text-gray-400 text-sm">Sem assinatura</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="button" variant="outline" size="sm" onClick={() => openSignatureDialog(index)}>
                                            <Edit2 className="w-4 h-4 mr-2" />
                                            {aprov.assinatura_imagem ? 'Editar Assinatura' : 'Adicionar Assinatura'}
                                        </Button>
                                        {aprov.assinatura_imagem && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAprovacaoChange(index, 'assinatura_imagem', '')}
                                            >
                                                Limpar
                                            </Button>
                                        )}
                                        <Button type="button" variant="ghost" size="sm" onClick={() => removeAprovacao(index)}>
                                            <Trash2 className="w-4 h-4 text-red-500 mr-2" />
                                            Remover
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <Button type="button" variant="outline" onClick={addAprovacao}><Plus className="w-4 h-4 mr-2" /> {t.addAprovacao}</Button>
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
                    <Button type="submit" disabled={saving || uploading}> {/* Disable save during upload */}
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t.saving}</> : t.save}
                    </Button>
                </div>
            </form>
        </div>
    );
}