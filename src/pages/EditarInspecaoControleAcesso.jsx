import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { InspecaoControleAcesso } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Trash2, ArrowLeft, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SimpleSignaturePad } from '@/components/signature/SignaturePadComponent';
import { UploadFile } from '@/api/integrations';

const t = {
    title: "Editar Inspeção de Controle de Acesso",
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
    locationName: "Nome do Local (Ex: Térreo, 1º andar)",
    documentation: "Documentação Técnica",
    functionalTests: "Testes Funcionais - Sistema de Controle de Acesso",
    addItem: "Adicionar Item",
    description: "Descrição",
    result: "Resultado",
    observations: "Observações",
    photos: "Fotos",
    addPhotos: "Adicionar Fotos",
    generalObservations: "Observações Gerais",
    signatures: "Assinaturas",
    addSignature: "Adicionar Assinatura",
    party: "Parte (Ex: Cliente)",
    name: "Nome",
    uploading: "Enviando...",
    removeLocation: "Remover Local",
    removeItem: "Remover Item",
    loading: "Carregando..."
};

export default function EditarInspecaoControleAcesso() {
    const navigate = useNavigate();
    const location = useLocation();
    const urlParams = new URLSearchParams(location.search);
    const inspecaoIdFromUrl = urlParams.get('inspecaoId');

    const [inspecaoId, setInspecaoId] = useState(inspecaoIdFromUrl);
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    const [showSignatureDialog, setShowSignatureDialog] = useState(false);
    const [activeSignatureIndex, setActiveSignatureIndex] = useState(null);
    const [signatureMode, setSignatureMode] = useState('draw');
    const [typedSignature, setTypedSignature] = useState('');
    const signaturePadRef = React.useRef(null);

    useEffect(() => {
        if (saving) return;

        if (!inspecaoIdFromUrl || inspecaoIdFromUrl === 'null' || inspecaoIdFromUrl === 'undefined') {
            toast.error("ID da inspeção não encontrado.");
            navigate(-1);
            return;
        }

        setInspecaoId(inspecaoIdFromUrl);

        const loadInspecao = async () => {
            try {
                const data = await InspecaoControleAcesso.get(inspecaoIdFromUrl);
                if (!data) {
                    toast.error("Inspeção não encontrada.");
                    navigate(-1);
                    return;
                }

                // Processa datas
                if (data.data_inspecao && data.data_inspecao.includes('T')) {
                    data.data_inspecao = data.data_inspecao.split('T')[0];
                }
                if (data.data_projeto && data.data_projeto.includes('T')) {
                    data.data_projeto = data.data_projeto.split('T')[0];
                }

                // Garante que arrays existam
                if (!data.equipamentos) data.equipamentos = [];
                if (!data.itens_documentacao) data.itens_documentacao = [];
                if (!data.locais) data.locais = [];
                if (!data.assinaturas) data.assinaturas = [];
                if (!data.info_sistema) data.info_sistema = {};
                if (!data.info_sistema_labels) {
                    data.info_sistema_labels = {
                        ctrl_a: 'Ctrl A - Fabricante / Modelo Controladora',
                        ctrl_b: 'Ctrl B - Fabricante / Modelo Controladora',
                        servidores: 'Servidor(es) - Hardware / S.O. / Softwares',
                        leitoras_cartao: 'Leitoras Cartão - Fabricante / Modelo',
                        leitoras_biometricas: 'Leitoras Biométricas - Fabricante / Modelo',
                        comentarios: 'Comentários'
                    };
                }

                setFormData(data);
            } catch (error) {
                console.error("Erro ao carregar inspeção:", error);
                toast.error("Falha ao carregar dados da inspeção.");
                navigate(-1);
            } finally {
                setLoading(false);
            }
        };

        loadInspecao();
    }, [inspecaoIdFromUrl, navigate, saving]);

    const handleInputChange = (field, value) => setFormData(p => ({ ...p, [field]: value }));

    const addLocal = () => {
        handleInputChange('locais', [...formData.locais, {
            nome_local: '',
            titulo_secao: formData.titulo_secao_inspecao || 'Testes Funcionais - Sistema de Controle de Acesso',
            comentarios: '',
            itens_inspecao: []
        }]);
    };

    const addLocalSomenteNome = () => {
        handleInputChange('locais', [...formData.locais, {
            nome_local: '',
            titulo_secao: '',
            comentarios: '',
            itens_inspecao: [],
            somente_nome: true
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
                const { file_url } = await UploadFile({ file });
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

    const addEquipamento = () => {
        handleInputChange('equipamentos', [...formData.equipamentos, {
            nome_equipamento: '',
            fabricante: '',
            modelo: '',
            numero_serie: '',
            localizacao: '',
            quantidade: ''
        }]);
    };

    const removeEquipamento = (index) => {
        handleInputChange('equipamentos', formData.equipamentos.filter((_, i) => i !== index));
    };

    const handleEquipamentoChange = (index, field, value) => {
        const newEquipamentos = [...formData.equipamentos];
        newEquipamentos[index][field] = value;
        handleInputChange('equipamentos', newEquipamentos);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const dataToSave = { ...formData };
            if (dataToSave.data_inspecao && !dataToSave.data_inspecao.includes('T')) {
                dataToSave.data_inspecao = dataToSave.data_inspecao + 'T12:00:00';
            }

            await InspecaoControleAcesso.update(inspecaoId, dataToSave);
            toast.success("Inspeção atualizada com sucesso!");
            setTimeout(() => {
                navigate(createPageUrl(`EmpreendimentoInspecaoControleAcesso?empreendimentoId=${formData.id_empreendimento}`), { replace: true });
            }, 500);
        } catch (error) {
            console.error("Erro ao atualizar inspeção:", error);
            toast.error("Falha ao atualizar a inspeção.");
            setSaving(false);
        }
    };

    if (loading || !formData) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">{t.loading}</span>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">{t.title}</h1>
                <Button variant="outline" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />{t.back}
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>{t.generalInfo}</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>{t.reportTitle}</Label>
                            <Input value={formData.titulo_relatorio} onChange={e => handleInputChange('titulo_relatorio', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t.reportSubtitle}</Label>
                            <Input value={formData.subtitulo_relatorio} onChange={e => handleInputChange('subtitulo_relatorio', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t.client}</Label>
                            <Input value={formData.cliente} onChange={e => handleInputChange('cliente', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t.engineer}</Label>
                            <Input value={formData.eng_responsavel} onChange={e => handleInputChange('eng_responsavel', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t.revision}</Label>
                            <Input value={formData.revisao} onChange={e => handleInputChange('revisao', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t.inspectionDate}</Label>
                            <Input type="date" value={formData.data_inspecao} onChange={e => handleInputChange('data_inspecao', e.target.value)} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Informações do Projeto</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Projeto</Label>
                                <Input value={formData.projeto} onChange={e => handleInputChange('projeto', e.target.value)} placeholder="Nome do projeto" />
                            </div>
                            <div className="space-y-2">
                                <Label>Data</Label>
                                <Input type="date" value={formData.data_projeto} onChange={e => handleInputChange('data_projeto', e.target.value)} />
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
                                    <Input
                                        placeholder={t.description}
                                        value={item.descricao}
                                        onChange={e => handleDocItemChange(itemIndex, 'descricao', e.target.value)}
                                        className="flex-1"
                                    />
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            checked={item.resultado === 'OK'}
                                            onCheckedChange={checked => handleDocItemChange(itemIndex, 'resultado', checked ? 'OK' : '')}
                                        />
                                        <Label className="text-sm">Recebido</Label>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeDocItem(itemIndex)}>
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>
                                <Input
                                    placeholder={t.observations}
                                    value={item.observacoes}
                                    onChange={e => handleDocItemChange(itemIndex, 'observacoes', e.target.value)}
                                />
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={addDocItem}>
                            <Plus className="w-4 h-4 mr-2" /> {t.addItem}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Informações do Sistema</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 border rounded-lg bg-blue-50 space-y-3">
                            <h4 className="font-semibold text-sm text-blue-900">Personalizar Títulos dos Campos</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs text-gray-600">Título do Campo 1</Label>
                                    <Input
                                        value={formData.info_sistema_labels?.ctrl_a || ''}
                                        onChange={e => handleInputChange('info_sistema_labels', { ...formData.info_sistema_labels, ctrl_a: e.target.value })}
                                        className="text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-gray-600">Título do Campo 2</Label>
                                    <Input
                                        value={formData.info_sistema_labels?.ctrl_b || ''}
                                        onChange={e => handleInputChange('info_sistema_labels', { ...formData.info_sistema_labels, ctrl_b: e.target.value })}
                                        className="text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-gray-600">Título do Campo 3</Label>
                                    <Input
                                        value={formData.info_sistema_labels?.servidores || ''}
                                        onChange={e => handleInputChange('info_sistema_labels', { ...formData.info_sistema_labels, servidores: e.target.value })}
                                        className="text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-gray-600">Título do Campo 4</Label>
                                    <Input
                                        value={formData.info_sistema_labels?.leitoras_cartao || ''}
                                        onChange={e => handleInputChange('info_sistema_labels', { ...formData.info_sistema_labels, leitoras_cartao: e.target.value })}
                                        className="text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-gray-600">Título do Campo 5</Label>
                                    <Input
                                        value={formData.info_sistema_labels?.leitoras_biometricas || ''}
                                        onChange={e => handleInputChange('info_sistema_labels', { ...formData.info_sistema_labels, leitoras_biometricas: e.target.value })}
                                        className="text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-gray-600">Título do Campo 6</Label>
                                    <Input
                                        value={formData.info_sistema_labels?.comentarios || ''}
                                        onChange={e => handleInputChange('info_sistema_labels', { ...formData.info_sistema_labels, comentarios: e.target.value })}
                                        className="text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label>{formData.info_sistema_labels?.ctrl_a || 'Ctrl A - Fabricante / Modelo Controladora'}</Label>
                                <Input
                                    value={formData.info_sistema?.ctrl_a || ''}
                                    onChange={e => handleInputChange('info_sistema', { ...formData.info_sistema, ctrl_a: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{formData.info_sistema_labels?.ctrl_b || 'Ctrl B - Fabricante / Modelo Controladora'}</Label>
                                <Input
                                    value={formData.info_sistema?.ctrl_b || ''}
                                    onChange={e => handleInputChange('info_sistema', { ...formData.info_sistema, ctrl_b: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{formData.info_sistema_labels?.servidores || 'Servidor(es) - Hardware / S.O. / Softwares'}</Label>
                                <Textarea
                                    value={formData.info_sistema?.servidores || ''}
                                    onChange={e => handleInputChange('info_sistema', { ...formData.info_sistema, servidores: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{formData.info_sistema_labels?.leitoras_cartao || 'Leitoras Cartão - Fabricante / Modelo'}</Label>
                                <Input
                                    value={formData.info_sistema?.leitoras_cartao || ''}
                                    onChange={e => handleInputChange('info_sistema', { ...formData.info_sistema, leitoras_cartao: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{formData.info_sistema_labels?.leitoras_biometricas || 'Leitoras Biométricas - Fabricante / Modelo'}</Label>
                                <Input
                                    value={formData.info_sistema?.leitoras_biometricas || ''}
                                    onChange={e => handleInputChange('info_sistema', { ...formData.info_sistema, leitoras_biometricas: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{formData.info_sistema_labels?.comentarios || 'Comentários'}</Label>
                                <Textarea
                                    value={formData.info_sistema?.comentarios || ''}
                                    onChange={e => handleInputChange('info_sistema', { ...formData.info_sistema, comentarios: e.target.value })}
                                    rows={4}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>{t.locations}</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        {formData.locais.map((local, localIndex) => (
                            local.somente_nome ? (
                                <div key={localIndex} className="p-3 border rounded-md bg-yellow-50 border-yellow-300 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <Input
                                            placeholder={t.locationName}
                                            value={local.nome_local}
                                            onChange={e => handleLocalChange(localIndex, 'nome_local', e.target.value)}
                                            className="font-semibold flex-1"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleLocalChange(localIndex, 'somente_nome', false)}
                                            className="bg-yellow-100"
                                        >
                                            Expandir
                                        </Button>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeLocal(localIndex)}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                    {(local.itens_inspecao || []).length > 0 && (
                                        <div className="pl-4 border-l-2 border-yellow-300 space-y-2">
                                            {local.itens_inspecao.map((item, itemIndex) => (
                                                <div key={itemIndex} className="flex items-center gap-2 p-2 bg-white rounded border">
                                                    <Input
                                                        placeholder={t.description}
                                                        value={item.descricao || ''}
                                                        onChange={e => handleInspItemChange(localIndex, itemIndex, 'descricao', e.target.value)}
                                                        className="flex-1"
                                                    />
                                                    <div className="flex items-center gap-1">
                                                        <Checkbox
                                                            checked={item.resultado === 'OK'}
                                                            onCheckedChange={checked => handleInspItemChange(localIndex, itemIndex, 'resultado', checked ? 'OK' : '')}
                                                        />
                                                        <Label className="text-xs">OK</Label>
                                                        <Checkbox
                                                            checked={item.resultado === 'Não'}
                                                            onCheckedChange={checked => handleInspItemChange(localIndex, itemIndex, 'resultado', checked ? 'Não' : '')}
                                                        />
                                                        <Label className="text-xs">NA</Label>
                                                    </div>
                                                    <Input
                                                        placeholder={t.observations}
                                                        value={item.observacoes || ''}
                                                        onChange={e => handleInspItemChange(localIndex, itemIndex, 'observacoes', e.target.value)}
                                                        className="flex-1"
                                                    />
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeInspItem(localIndex, itemIndex)}>
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <Button type="button" variant="outline" size="sm" onClick={() => addInspItem(localIndex)} className="ml-4">
                                        <Plus className="w-4 h-4 mr-1" /> Adicionar Item
                                    </Button>
                                </div>
                            ) : (
                                <div key={localIndex} className="p-4 border rounded-lg space-y-4 bg-gray-50">
                                    <div className="flex items-center justify-between mb-3">
                                        <Input
                                            placeholder={t.locationName}
                                            value={local.nome_local}
                                            onChange={e => handleLocalChange(localIndex, 'nome_local', e.target.value)}
                                            className="font-semibold max-w-md"
                                        />
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleLocalChange(localIndex, 'somente_nome', true)}
                                            >
                                                Só Nome
                                            </Button>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeLocal(localIndex)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Label do Campo Local</Label>
                                            <Input
                                                placeholder="Ex: Porta Controlada - Local, Catraca - Local"
                                                value={local.label_local || ''}
                                                onChange={e => handleLocalChange(localIndex, 'label_local', e.target.value)}
                                                className="bg-white"
                                            />
                                            <p className="text-xs text-gray-500">Deixe vazio para "Porta Controlada - Local"</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Título da Seção de Inspeção</Label>
                                            <Input
                                                placeholder="Ex: Testes Funcionais - Sistema de Controle de Acesso"
                                                value={local.titulo_secao || ''}
                                                onChange={e => handleLocalChange(localIndex, 'titulo_secao', e.target.value)}
                                                className="bg-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="pl-4 border-l-2 space-y-3">
                                        <h4 className="font-medium text-green-700">{local.titulo_secao || formData.titulo_secao_inspecao || t.functionalTests}</h4>
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
                                                        <Input
                                                            placeholder={t.description}
                                                            value={item.descricao}
                                                            onChange={e => handleInspItemChange(localIndex, itemIndex, 'descricao', e.target.value)}
                                                            className="flex-1"
                                                        />
                                                        <div className="flex items-center gap-2">
                                                            <Checkbox
                                                                checked={item.resultado === 'OK'}
                                                                onCheckedChange={checked => handleInspItemChange(localIndex, itemIndex, 'resultado', checked ? 'OK' : '')}
                                                            />
                                                            <Label className="text-sm">OK</Label>
                                                            <Checkbox
                                                                checked={item.resultado === 'Não'}
                                                                onCheckedChange={checked => handleInspItemChange(localIndex, itemIndex, 'resultado', checked ? 'Não' : '')}
                                                            />
                                                            <Label className="text-sm">NA</Label>
                                                        </div>
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeInspItem(localIndex, itemIndex)}>
                                                            <Trash2 className="w-4 h-4 text-red-500" />
                                                        </Button>
                                                    </div>
                                                    <Input
                                                        placeholder={t.observations}
                                                        value={item.observacoes}
                                                        onChange={e => handleInspItemChange(localIndex, itemIndex, 'observacoes', e.target.value)}
                                                    />
                                                    <div>
                                                        <Label className="text-sm">{t.photos}</Label>
                                                        <Input
                                                            type="file"
                                                            multiple
                                                            accept="image/*"
                                                            onChange={(e) => handlePhotoUpload(e, localIndex, itemIndex)}
                                                            disabled={uploadingPhoto}
                                                            className="mb-2"
                                                        />
                                                        {uploadingPhoto && <div className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> {t.uploading}</div>}
                                                        <div className="grid grid-cols-3 gap-2 mt-2">
                                                            {(item.fotos || []).map((foto, photoIndex) => (
                                                                <div key={photoIndex} className="relative">
                                                                    <img src={foto.url} className="w-full h-20 object-cover rounded" />
                                                                    <Button
                                                                        type="button"
                                                                        variant="destructive"
                                                                        size="icon"
                                                                        className="absolute top-1 right-1 h-5 w-5"
                                                                        onClick={() => removePhoto(localIndex, itemIndex, photoIndex)}
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

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

                                    <div className="pl-4 flex gap-2 flex-wrap">
                                        <Button type="button" variant="outline" size="sm" onClick={() => addInspItem(localIndex)}>
                                            <Plus className="w-4 h-4 mr-2" /> {t.addItem}
                                        </Button>
                                        <Button type="button" variant="outline" size="sm" onClick={() => addComentarioItem(localIndex)} className="bg-purple-50 hover:bg-purple-100">
                                            <Plus className="w-4 h-4 mr-2" /> Adicionar Comentários
                                        </Button>
                                    </div>
                                </div>
                            )
                        ))}
                        <div className="flex gap-2 flex-wrap">
                            <Button type="button" variant="secondary" onClick={addLocal}>
                                <Plus className="w-4 h-4 mr-2" /> {t.addLocation}
                            </Button>
                            <Button type="button" variant="outline" onClick={addLocalSomenteNome} className="bg-yellow-50 hover:bg-yellow-100 border-yellow-300">
                                <Plus className="w-4 h-4 mr-2" /> Adicionar Só Nome do Local
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>{t.generalObservations}</CardTitle></CardHeader>
                    <CardContent>
                        <Textarea
                            value={formData.observacoes_gerais}
                            onChange={e => handleInputChange('observacoes_gerais', e.target.value)}
                            rows={4}
                            placeholder="Digite observações gerais sobre a inspeção..."
                        />
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
                        <Button type="button" variant="outline" onClick={addAssinatura}>
                            <Plus className="w-4 h-4 mr-2" /> {t.addSignature}
                        </Button>
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
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t.saving}</> : t.save}
                    </Button>
                </div>
            </form>
        </div>
    );
}