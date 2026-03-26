import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Empreendimento, InspecaoSDAI } from '@/api/entities';
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
    title: "Nova Inspeção de Central SDAI",
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
    instalacao: "Instalação",
    addItem: "Adicionar Item",
    itemVerificacao: "Item de verificação",
    description: "Descrição",
    observations: "Observações",
    comentario: "Comentário",
    comentariosInstalacao: "Comentários",
    generalObservations: "Observações Gerais",
    signatures: "Assinaturas",
    addSignature: "Adicionar Assinatura",
    party: "Parte (Ex: Cliente)",
    name: "Nome",
    documentation: "Documentação Cadastral",
    photos: "Fotos",
    uploading: "Enviando...",
};

const defaultDocumentacaoItems = [
    "Projetos executivo, especificações e lista de equipamentos",
    "Cálculo de autonomia das baterias",
    "Matriz causa x efeito aprovada",
    "Cálculos hidráulicos do sistema de detecção por aspiração",
    "Relatório dos testes em 100% dos dispositivos de entrada"
];

const defaultItensInstalacao = [
    "Central, Módulos e Baterias instalados e finalizados.",
    "Ausência de falhas e alarmes.",
    "Central endereçável.",
    "Livres de poeira, com fácil acesso para operar e em sala climatizada e protegida.",
    "Fonte de alimentação e central aterradas.",
    "Circuito alimentador exclusivo e estabilizado.",
    "Baterias atendem ao cálculo de projeto para autonomia stand-by 24h e alarme 15 min.",
    "Alimentação 24Vdc e tensão das baterias monitoradas.",
    "Módulo Interface RS-485 ou Ethernet TCP-IP Instalado."
];

export default function NovaInspecaoSDAI() {
    const navigate = useNavigate();
    const location = useLocation();
    const [empreendimentoId] = useState(() => new URLSearchParams(location.search).get('empreendimentoId'));
    const [empreendimento, setEmpreendimento] = useState(null);

    const [formData, setFormData] = useState({
        id_empreendimento: empreendimentoId,
        data_inspecao: new Date().toISOString().split('T')[0],
        titulo_capa: 'RELATÓRIO',
        subtitulo_capa: 'Gerenciamento de Obra',
        titulo_inspecao: 'INSPEÇÃO DE CENTRAL SDAI',
        descricao_inspecao: '',
        texto_rodape_capa: '',
        titulo_relatorio: 'Checklist de Inspeção Física de Central do Sistema de Detecção e Alarme de Incêndio (SDAI)',
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
        itens_instalacao: defaultItensInstalacao.map(item => ({
            item_verificacao: item,
            resultado: 'OK',
            comentario: '',
            fotos: []
        })),
        comentarios_instalacao: '',
        observacoes_gerais: '',
        conclusao: '',
        conclusao_r01: '',
        conclusao_r02: '',
        assinaturas: [],
        centrais: [
            {
                tag: '',
                localizacao: '',
                fabricante_modelo: '',
                modulos_instalados: '',
                baterias_central: '',
                fonte_auxiliar_baterias: ''
            }
        ]
    });

    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    const [showSignatureDialog, setShowSignatureDialog] = useState(false);
    const [activeSignatureIndex, setActiveSignatureIndex] = useState(null);
    const [signatureMode, setSignatureMode] = useState('draw');
    const [typedSignature, setTypedSignature] = useState('');
    const signaturePadRef = React.useRef(null);

    const [editCoverOpen, setEditCoverOpen] = useState(false);
    const [editedFormData, setEditedFormData] = useState({});

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
                    cliente: data.cli_empreendimento || '',
                    texto_rodape_capa: data.texto_capa_rodape || ''
                }));
            } catch (error) {
                toast.error("Falha ao carregar dados do empreendimento.");
            }
        };
        loadEmpreendimento();
    }, [empreendimentoId, navigate]);

    const handleInputChange = (field, value) => setFormData(p => ({ ...p, [field]: value }));

    const handleInstalacaoItemChange = (itemIndex, field, value) => {
        const newItems = [...formData.itens_instalacao];
        newItems[itemIndex][field] = value;
        handleInputChange('itens_instalacao', newItems);
    };

    const addInstalacaoItem = () => {
        handleInputChange('itens_instalacao', [...formData.itens_instalacao, { item_verificacao: '', resultado: 'OK', comentario: '', fotos: [] }]);
    };

    const removeInstalacaoItem = (itemIndex) => {
        handleInputChange('itens_instalacao', formData.itens_instalacao.filter((_, i) => i !== itemIndex));
    };

    const handlePhotoUpload = async (e, itemIndex) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setUploadingPhoto(true);
        try {
            const uploadedPhotos = await Promise.all(files.map(async (file) => {
                const { file_url } = await UploadFile({ file });
                return { url: file_url, legenda: '' };
            }));

            const newItems = [...formData.itens_instalacao];
            if (!newItems[itemIndex].fotos) {
                newItems[itemIndex].fotos = [];
            }
            newItems[itemIndex].fotos.push(...uploadedPhotos);
            handleInputChange('itens_instalacao', newItems);
        } catch (error) {
            toast.error("Falha no upload da foto.");
        } finally {
            setUploadingPhoto(false);
            e.target.value = '';
        }
    };

    const removePhoto = (itemIndex, photoIndex) => {
        const newItems = [...formData.itens_instalacao];
        newItems[itemIndex].fotos = (newItems[itemIndex].fotos || []).filter((_, i) => i !== photoIndex);
        handleInputChange('itens_instalacao', newItems);
    };

    const handleDocItemChange = (itemIndex, field, value) => {
        const newDocs = [...formData.itens_documentacao];
        newDocs[itemIndex][field] = value;
        handleInputChange('itens_documentacao', newDocs);
    };

    const addDocItem = () => {
        handleInputChange('itens_documentacao', [...formData.itens_documentacao, { descricao: '', resultado: 'OK', observacoes: '' }]);
    };

    const removeDocItem = (itemIndex) => {
        handleInputChange('itens_documentacao', formData.itens_documentacao.filter((_, i) => i !== itemIndex));
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
                ctx.font = '48px Calibri';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(typedSignature, canvas.width / 2, canvas.height - 20);

                const signatureDataUrl = canvas.toDataURL('image/png', 0.92);
                const blob = await fetch(signatureDataUrl).then((res) => res.blob());
                const file = new File([blob], `assinatura-${Date.now()}.png`, { type: 'image/png' });

                const { file_url } = await UploadFile({ file });
                handleAssinaturaChange(activeSignatureIndex, 'assinatura_imagem', file_url);
                setShowSignatureDialog(false);
                setActiveSignatureIndex(null);
                setTypedSignature('');
                toast.success("Assinatura salva!");
                return;
            }

            if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
                const signatureDataUrl = signaturePadRef.current.toDataURL();
                const blob = await fetch(signatureDataUrl).then((res) => res.blob());
                const file = new File([blob], `assinatura-${Date.now()}.png`, { type: 'image/png' });

                const { file_url } = await UploadFile({ file });
                handleAssinaturaChange(activeSignatureIndex, 'assinatura_imagem', file_url);
                setShowSignatureDialog(false);
                setActiveSignatureIndex(null);
                toast.success("Assinatura salva!");
            } else {
                toast.error("Por favor, desenhe uma assinatura antes de salvar.");
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
        setEditedFormData({
            titulo_capa: formData.titulo_capa || 'RELATÓRIO',
            subtitulo_capa: formData.subtitulo_capa || 'Gerenciamento de Obra',
            titulo_inspecao: formData.titulo_inspecao || 'INSPEÇÃO DE CENTRAL SDAI',
            descricao_inspecao: formData.descricao_inspecao || '',
            texto_rodape_capa: formData.texto_rodape_capa || ''
        });
        setEditCoverOpen(true);
    };

    const handleSaveCover = () => {
        setFormData((prev) => ({
            ...prev,
            titulo_capa: editedFormData.titulo_capa,
            subtitulo_capa: editedFormData.subtitulo_capa,
            titulo_inspecao: editedFormData.titulo_inspecao,
            descricao_inspecao: editedFormData.descricao_inspecao,
            texto_rodape_capa: editedFormData.texto_rodape_capa
        }));
        setEditCoverOpen(false);
        toast.success("Campos da capa atualizados!");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const dataToSave = {
                ...formData,
                instalacoes: [{
                    itens: formData.itens_instalacao,
                    comentarios: formData.comentarios_instalacao || ''
                }],
                ordem_secoes: [
                    { tipo: 'instalacao', indice: 0 },
                    ...formData.centrais.map((_, index) => ({ tipo: 'central', indice: index }))
                ]
            };
            if (dataToSave.data_inspecao && !dataToSave.data_inspecao.includes('T')) {
                dataToSave.data_inspecao = dataToSave.data_inspecao + 'T12:00:00';
            }

            await InspecaoSDAI.create(dataToSave);
            toast.success("Inspeção criada com sucesso!");
            navigate(createPageUrl(`EmpreendimentoInspecaoSDAI?empreendimentoId=${empreendimentoId}`));
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
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleOpenEditCover}>
                        <Edit2 className="w-4 h-4 mr-2" />Editar Capa
                    </Button>
                    <Button variant="outline" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-4 h-4 mr-2" />{t.back}
                    </Button>
                </div>
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
                                placeholder="Ex: ISDAI-2025-01"
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
                    <CardHeader><CardTitle>Dados de Equipamento - Central SDAI</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        {formData.centrais.map((central, centralIndex) => (
                            <div key={centralIndex} className="p-4 border rounded-lg bg-gray-50 space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-semibold text-blue-900">Central {centralIndex + 1}</h4>
                                    {formData.centrais.length > 1 && (
                                        <Button type="button" variant="ghost" size="icon" onClick={() => {
                                            handleInputChange('centrais', formData.centrais.filter((_, i) => i !== centralIndex));
                                        }}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tag</Label>
                                        <Input value={central.tag || ''} onChange={e => {
                                            const newCentrals = [...formData.centrais];
                                            newCentrals[centralIndex].tag = e.target.value;
                                            handleInputChange('centrais', newCentrals);
                                        }} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Localização</Label>
                                        <Input value={central.localizacao || ''} onChange={e => {
                                            const newCentrals = [...formData.centrais];
                                            newCentrals[centralIndex].localizacao = e.target.value;
                                            handleInputChange('centrais', newCentrals);
                                        }} />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Fabr. e Modelo</Label>
                                        <Input value={central.fabricante_modelo || ''} onChange={e => {
                                            const newCentrals = [...formData.centrais];
                                            newCentrals[centralIndex].fabricante_modelo = e.target.value;
                                            handleInputChange('centrais', newCentrals);
                                        }} />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Módulos Instalados</Label>
                                        <Input value={central.modulos_instalados || ''} onChange={e => {
                                            const newCentrals = [...formData.centrais];
                                            newCentrals[centralIndex].modulos_instalados = e.target.value;
                                            handleInputChange('centrais', newCentrals);
                                        }} />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Baterias Central</Label>
                                        <Input value={central.baterias_central || ''} onChange={e => {
                                            const newCentrals = [...formData.centrais];
                                            newCentrals[centralIndex].baterias_central = e.target.value;
                                            handleInputChange('centrais', newCentrals);
                                        }} />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Fonte Auxiliar e baterias</Label>
                                        <Input value={central.fonte_auxiliar_baterias || ''} onChange={e => {
                                            const newCentrals = [...formData.centrais];
                                            newCentrals[centralIndex].fonte_auxiliar_baterias = e.target.value;
                                            handleInputChange('centrais', newCentrals);
                                        }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                        <Button type="button" variant="secondary" onClick={() => {
                            handleInputChange('centrais', [...formData.centrais, {
                                tag: '',
                                localizacao: '',
                                fabricante_modelo: '',
                                modulos_instalados: '',
                                baterias_central: '',
                                fonte_auxiliar_baterias: ''
                            }]);
                        }}>
                            <Plus className="w-4 h-4 mr-2" /> Adicionar Central
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>{t.instalacao}</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 p-2 text-left font-semibold">Item de verificação</th>
                                        <th className="border border-gray-300 p-2 text-center font-semibold w-16">Ok</th>
                                        <th className="border border-gray-300 p-2 text-center font-semibold w-16">N.A.</th>
                                        <th className="border border-gray-300 p-2 text-left font-semibold w-64">Comentário</th>
                                        <th className="border border-gray-300 p-2 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(formData.itens_instalacao || []).map((item, itemIndex) => (
                                        <React.Fragment key={itemIndex}>
                                            <tr>
                                                <td className="border border-gray-300 p-2">
                                                    <Input
                                                        value={item.item_verificacao}
                                                        onChange={e => handleInstalacaoItemChange(itemIndex, 'item_verificacao', e.target.value)}
                                                        className="border-0 focus-visible:ring-0"
                                                    />
                                                </td>
                                                <td className="border border-gray-300 p-2 text-center">
                                                    <Checkbox
                                                        checked={item.resultado === 'OK'}
                                                        onCheckedChange={checked => handleInstalacaoItemChange(itemIndex, 'resultado', checked ? 'OK' : '')}
                                                    />
                                                </td>
                                                <td className="border border-gray-300 p-2 text-center">
                                                    <Checkbox
                                                        checked={item.resultado === 'NA'}
                                                        onCheckedChange={checked => handleInstalacaoItemChange(itemIndex, 'resultado', checked ? 'NA' : '')}
                                                    />
                                                </td>
                                                <td className="border border-gray-300 p-2">
                                                    <Input
                                                        value={item.comentario}
                                                        onChange={e => handleInstalacaoItemChange(itemIndex, 'comentario', e.target.value)}
                                                        className="border-0 focus-visible:ring-0"
                                                    />
                                                </td>
                                                <td className="border border-gray-300 p-2 text-center align-top">
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeInstalacaoItem(itemIndex)} className="h-8 w-8">
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </Button>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colSpan="5" className="border border-gray-300 p-3 bg-gray-50">
                                                    <div>
                                                        <Label className="text-sm">{t.photos}</Label>
                                                        <Input
                                                            type="file"
                                                            multiple
                                                            accept="image/*"
                                                            onChange={(e) => handlePhotoUpload(e, itemIndex)}
                                                            disabled={uploadingPhoto}
                                                            className="mb-2 mt-2"
                                                        />
                                                        {uploadingPhoto && <div className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> {t.uploading}</div>}
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                                                            {(item.fotos || []).map((foto, photoIndex) => (
                                                                <div key={photoIndex} className="relative">
                                                                    <img src={foto.url} alt="Foto da instalação" className="w-full h-24 object-cover rounded border" />
                                                                    <Button
                                                                        type="button"
                                                                        variant="destructive"
                                                                        size="icon"
                                                                        className="absolute top-1 right-1 h-5 w-5"
                                                                        onClick={() => removePhoto(itemIndex, photoIndex)}
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={addInstalacaoItem}>
                            <Plus className="w-4 h-4 mr-2" /> {t.addItem}
                        </Button>

                        <div className="space-y-2 mt-4">
                            <Label>{t.comentariosInstalacao}:</Label>
                            <Textarea
                                value={formData.comentarios_instalacao || ''}
                                onChange={e => handleInputChange('comentarios_instalacao', e.target.value)}
                                rows={4}
                                placeholder="Comentários gerais sobre a instalação..."
                            />
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
                        <div className="mt-4 space-y-2">
                            <Label>Conclusão - 1ª Vistoria (R01)</Label>
                            <select value={formData.conclusao_r01 || ''} onChange={e => handleInputChange('conclusao_r01', e.target.value)} className="w-full border rounded px-2 py-1">
                                <option value="">-- Selecionar --</option>
                                <option value="totalidade">Aprovado com totalidade</option>
                                <option value="ressalvas">Aprovado com ressalvas</option>
                                <option value="reprovado">Reprovado</option>
                            </select>
                            <Label>Conclusão - 2ª Vistoria (R02)</Label>
                            <select value={formData.conclusao_r02 || ''} onChange={e => handleInputChange('conclusao_r02', e.target.value)} className="w-full border rounded px-2 py-1">
                                <option value="">-- Selecionar --</option>
                                <option value="totalidade">Aprovado com totalidade</option>
                                <option value="ressalvas">Aprovado com ressalvas</option>
                                <option value="reprovado">Reprovado</option>
                            </select>
                            <Label>Conclusão (fallback)</Label>
                            <select value={formData.conclusao || ''} onChange={e => handleInputChange('conclusao', e.target.value)} className="w-full border rounded px-2 py-1">
                                <option value="">-- Selecionar --</option>
                                <option value="totalidade">Aprovado com totalidade</option>
                                <option value="ressalvas">Aprovado com ressalvas</option>
                                <option value="reprovado">Reprovado</option>
                            </select>
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
                        <Button type="button" variant="outline" onClick={addAssinatura}>
                            <Plus className="w-4 h-4 mr-2" /> {t.addSignature}
                        </Button>
                    </CardContent>
                </Card>

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
                                        <Input value={editedFormData?.titulo_capa || ''} onChange={(e) => setEditedFormData({ ...editedFormData, titulo_capa: e.target.value })} className="mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold">Subtítulo (vermelho)</Label>
                                        <Input value={editedFormData?.subtitulo_capa || ''} onChange={(e) => setEditedFormData({ ...editedFormData, subtitulo_capa: e.target.value })} className="mt-1" />
                                    </div>
                                </div>
                            </div>

                            <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                                <h3 className="font-semibold text-sm mb-4 text-green-900">Informações da Inspeção</h3>
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-xs font-semibold">Título da Inspeção</Label>
                                        <Input value={editedFormData?.titulo_inspecao || ''} onChange={(e) => setEditedFormData({ ...editedFormData, titulo_inspecao: e.target.value })} placeholder="Ex: INSPEÇÃO DE CENTRAL SDAI" className="mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold">Descrição da Inspeção</Label>
                                        <Input value={editedFormData?.descricao_inspecao || ''} onChange={(e) => setEditedFormData({ ...editedFormData, descricao_inspecao: e.target.value })} placeholder="Ex: Pavimentos tipo e áreas técnicas" className="mt-1" />
                                    </div>
                                </div>
                            </div>

                            <div className="border rounded-lg p-4 bg-red-50 border-red-200">
                                <h3 className="font-semibold text-sm mb-4 text-red-900">Rodapé da Capa</h3>
                                <div>
                                    <Label className="text-xs font-semibold">Texto do Rodapé</Label>
                                    <Input value={editedFormData?.texto_rodape_capa || ''} onChange={(e) => setEditedFormData({ ...editedFormData, texto_rodape_capa: e.target.value })} placeholder="Ex: Most Moema | Ed. Most Moema | MPD" className="mt-1" />
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

                <div className="flex justify-end gap-4">
                    <Button type="submit" disabled={saving}>
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t.saving}</> : t.save}
                    </Button>
                </div>
            </form>
        </div>
    );
}