import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { RelatorioPrimeirosServicos } from '@/api/entities';
import { Empreendimento } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { UploadFile } from '@/api/integrations';
import { toast } from 'sonner';

const t = {
    title: "Novo Relatório de 1º Serviços",
    save: "Salvar",
    saving: "Salvando...",
    back: "Voltar",
    info: "Informações Gerais",
    cliente: "Cliente (Título Principal)",
    local: "Local",
    solicitante: "Solicitante",
    obra: "Obra (Subtítulo)",
    disciplina: "Disciplina",
    data: "Data do Relatório",
    assunto: "Assunto do Relatório",
    descricao: "Descrição dos Serviços",
    fotos: "Fotos",
    upload: "Carregar Imagem",
    legenda: "Legenda",
    statusTitle: "Status da Aprovação",
    status: "Status",
    comentarios: "Comentários do Status",
    aprovacoesTitle: "Aprovações",
    addAprovacao: "Adicionar Aprovação",
    parte: "Parte (Ex: Cliente, Gerenciadora)",
    nomeAssinatura: "Nome / Assinatura",
};

const statusOptions = ["Aprovado", "Aprovado com Comentários", "Reprovado", "Pendente"];

export default function NovoRelatorioPrimeirosServicos() {
    const navigate = useNavigate();
    const location = useLocation();
    const urlParams = new URLSearchParams(location.search);
    const empreendimentoId = urlParams.get('empreendimentoId');

    const [formData, setFormData] = useState({
        id_empreendimento: empreendimentoId,
        cliente: '',
        local: '',
        solicitante: '',
        obra: '',
        disciplina: '',
        data_relatorio: new Date().toISOString().split('T')[0],
        assunto_relatorio: '',
        descricao_relatorio: '',
        fotos: [],
        status: 'Pendente',
        comentarios_status: '',
        aprovacoes: [],
    });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

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
                const { file_url } = await UploadFile({ file });
                return { url: file_url, legenda: '' };
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

    const addAprovacao = () => handleInputChange('aprovacoes', [...formData.aprovacoes, { parte: '', nome_assinatura: '' }]);
    const removeAprovacao = (index) => handleInputChange('aprovacoes', formData.aprovacoes.filter((_, i) => i !== index));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await RelatorioPrimeirosServicos.create(formData);
            toast.success("Relatório criado com sucesso!");
            navigate(createPageUrl(`EmpreendimentoPrimeirosServicos?empreendimentoId=${empreendimentoId}`));
        } catch (error) {
            console.error("Erro ao criar relatório:", error);
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
                        <div className="space-y-2 md:col-span-3"><Label>{t.assunto}</Label><Input value={formData.assunto_relatorio} onChange={e => handleInputChange('assunto_relatorio', e.target.value)} /></div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>{t.descricao}</CardTitle></CardHeader>
                    <CardContent><Textarea value={formData.descricao_relatorio} onChange={e => handleInputChange('descricao_relatorio', e.target.value)} rows={5} /></CardContent>
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
                    <CardHeader><CardTitle>{t.statusTitle}</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><Label>{t.status}</Label><Select value={formData.status} onValueChange={v => handleInputChange('status', v)}><SelectTrigger><SelectValue placeholder="Selecione um status" /></SelectTrigger><SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label>{t.comentarios}</Label><Input value={formData.comentarios_status} onChange={e => handleInputChange('comentarios_status', e.target.value)} /></div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>{t.aprovacoesTitle}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {formData.aprovacoes.map((aprov, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-3 items-end gap-2 p-2 border rounded-lg">
                                <div className="space-y-1"><Label>{t.parte}</Label><Input value={aprov.parte} onChange={e => handleAprovacaoChange(index, 'parte', e.target.value)} /></div>
                                <div className="space-y-1"><Label>{t.nomeAssinatura}</Label><Input value={aprov.nome_assinatura} onChange={e => handleAprovacaoChange(index, 'nome_assinatura', e.target.value)} /></div>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeAprovacao(index)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" onClick={addAprovacao}><Plus className="w-4 h-4 mr-2" /> {t.addAprovacao}</Button>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                    <Button type="submit" disabled={saving || uploading}>
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t.saving}</> : t.save}
                    </Button>
                </div>
            </form>
        </div>
    );
}