import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { InspecaoHidrantes } from '@/api/entities';
import { Empreendimento } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Trash2, Upload, ArrowLeft, Edit2 } from 'lucide-react';
import { UploadFile } from '@/api/integrations';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SimpleSignaturePad } from '@/components/signature/SignaturePadComponent';

const t = {
    title: "Nova Inspeção de Hidrantes",
    save: "Salvar Inspeção",
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
    documentation: "Documentação Cadastral",
    physicalInspection: "Inspeção Física - Hidrantes",
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
};

// Itens padrão de documentação
const defaultDocumentacaoItems = [
    "Projeto executivo, especificações e lista de equipamentos",
    "Relatório dos testes hidrostáticos nas redes molhadas",
    "Relatório dos testes pneumáticos nas redes secas",
    "Relatório dos testes de fluxo e alarme nas VGAs e VPAs",
    "Relatório dos testes de desempenho das bombas",
    "Manuais O&M Manual das VPAs e bombas"
];

// Itens padrão de inspeção física por local
const defaultInspecaoItems = [
    "Hidrante desobstruído e sinalizado.",
    "Válvula seccional aberta.",
    "Válvula do hidrante fechada.",
    "Mangueiras acondicionadas e prontas para uso.",
    "Acessórios guardados no abrigo (esguicho, chave storz).",
    "Abrigo seco, desobstruído, fixado, alinhado e pintado.",
    "Suportação da tubulação adequada e independente do abrigo."
];

export default function NovaInspecaoHidrantes() {
    const navigate = useNavigate();
    const location = useLocation();
    const [empreendimentoId] = useState(() => new URLSearchParams(location.search).get('empreendimentoId'));
    const [empreendimento, setEmpreendimento] = useState(null);
    
    const [formData, setFormData] = useState({
        id_empreendimento: empreendimentoId,
        data_inspecao: new Date().toISOString().split('T')[0],
        titulo_relatorio: 'Checklist de Inspeção Física de Hidrantes',
        subtitulo_relatorio: '',
        cliente: '',
        revisao: '01',
        eng_responsavel: '',
        itens_documentacao: defaultDocumentacaoItems.map(desc => ({
            descricao: desc,
            resultado: 'OK',
            observacoes: ''
        })),
        comentarios_documentacao: '',
        locais: [
            {
                nome_local: 'Térreo',
                comentarios: '',
                itens_inspecao: defaultInspecaoItems.map(desc => ({
                    descricao: desc,
                    resultado: 'OK',
                    observacoes: '',
                    fotos: [],
                    tipo: 'item'
                }))
            }
        ],
        observacoes_gerais: '',
        assinaturas: []
    });
    
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    
    const [showSignatureDialog, setShowSignatureDialog] = useState(false);
    const [activeSignatureIndex, setActiveSignatureIndex] = useState(null);
    const [signatureMode, setSignatureMode] = useState('draw');
    const [typedSignature, setTypedSignature] = useState('');
    const signaturePadRef = React.useRef(null);

    useEffect(() => {
        if (!empreendimentoId) {
            toast.error("ID do empreendimento não encontrado.");
            navigate(-1);
            return;
        }
        const loadEmpreendimento = async () => {
            try {
                const data = await Empreendimento.get(empreendimentoId);
                setEmpreendimento(data);
                setFormData(prev => ({
                    ...prev,
                    subtitulo_relatorio: data.nome_empreendimento || '',
                    cliente: data.cli_empreendimento || ''
                }));
            } catch (error) {
                toast.error("Falha ao carregar dados do empreendimento.");
            }
        };
        loadEmpreendimento();
    }, [empreendimentoId, navigate]);

    const handleInputChange = (field, value) => setFormData(p => ({ ...p, [field]: value }));

    const addLocal = () => {
        handleInputChange('locais', [...formData.locais, {
            nome_local: '',
            comentarios: '',
            itens_inspecao: defaultInspecaoItems.map(desc => ({
                descricao: desc,
                resultado: 'OK',
                observacoes: '',
                fotos: [],
                tipo: 'item'
            }))
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

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.fillStyle = '#000000';
                ctx.font = '110px Calibri';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2);

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
                const dataToSave = { ...formData };
                if (dataToSave.data_inspecao && !dataToSave.data_inspecao.includes('T')) {
                    dataToSave.data_inspecao = dataToSave.data_inspecao + 'T12:00:00';
                }

                await InspecaoHidrantes.create(dataToSave);
                toast.success("Inspeção criada com sucesso!");
                navigate(createPageUrl(`EmpreendimentoInspecaoHidrantes?empreendimentoId=${empreendimentoId}`));
            } catch (error) {
                console.error("Erro ao criar inspeção:", error);
                toast.error("Falha ao criar a inspeção.");
            } finally {
                setSaving(false);
            }
        };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">{t.title}</h1>
                <Button variant="outline" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-4 h-4 mr-2"/>{t.back}
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
                        <div className="space-y-2">
                            <Label>Nome do Arquivo (opcional)</Label>
                            <Input 
                                placeholder="Ex: IHID-2025-01" 
                                value={formData.nome_arquivo || ''} 
                                onChange={e => handleInputChange('nome_arquivo', e.target.value)} 
                            />
                            <p className="text-xs text-gray-500">Se não preenchido, o arquivo não será exibido no rodapé</p>
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
                                    <Input 
                                        placeholder={t.locationName} 
                                        value={local.nome_local} 
                                        onChange={e => handleLocalChange(localIndex, 'nome_local', e.target.value)} 
                                        className="font-semibold max-w-md"
                                    />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLocal(localIndex)}>
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>

                                {/* Inspeção Física */}
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
                                        <Button type="button" variant="outline" size="sm" onClick={() => addInspItem(localIndex)}>
                                            <Plus className="w-4 h-4 mr-2" /> {t.addItem}
                                        </Button>
                                        <Button type="button" variant="outline" size="sm" onClick={() => addComentarioItem(localIndex)} className="bg-purple-50 hover:bg-purple-100">
                                            <Plus className="w-4 h-4 mr-2" /> Adicionar Comentários
                                        </Button>
                                    </div>
                            </div>
                        ))}
                        <Button type="button" variant="secondary" onClick={addLocal}>
                            <Plus className="w-4 h-4 mr-2" /> {t.addLocation}
                        </Button>
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