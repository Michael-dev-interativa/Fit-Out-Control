import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { InspecaoArCondicionado } from '@/api/entities';
import { Empreendimento } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Trash2, ArrowLeft, Edit2 } from 'lucide-react';
import { UploadFile } from '@/api/integrations';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SimpleSignaturePad } from '@/components/signature/SignaturePadComponent';

const t = {
    title: "Nova Inspeção de Ar Condicionado",
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
    physicalInspection: "Inspeção Física - Sistema de Ar Condicionado",
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

const defaultDocumentacaoItems = [
    "Projeto executivo de climatização",
    "Manual de operação e manutenção dos equipamentos",
    "Relatório de comissionamento do sistema",
    "Registro de manutenções preventivas",
    "Certificados de garantia dos equipamentos",
    "ART/RRT do responsável técnico"
];

const defaultInspecaoEvaporadora = [
    "Evaporadoras instaladas conforme projeto",
    "Evaporadoras em funcionamento",
    "Filtros limpos e em bom estado",
    "Drenos de condensado instalados e funcionando",
    "Grelhas de insuflamento e retorno posicionadas conforme projeto"
];

const defaultInspecaoValvulas = [
    "Tubulações frigorígenas isoladas termicamente",
    "Válvulas de serviço instaladas",
    "Ausência de vazamentos nas conexões",
    "Suportes e fixações adequados"
];

const defaultInspecaoCondensadora = [
    "Condensadoras instaladas conforme projeto",
    "Condensadoras em funcionamento",
    "Ventiladores operando corretamente",
    "Serpentina limpa e sem obstruções"
];

const defaultInspecaoEletrica = [
    "Quadros elétricos identificados e protegidos",
    "Disjuntores dimensionados corretamente",
    "Aterramento adequado",
    "Cabeamento organizado e identificado"
];

const defaultInspecaoSensores = [
    "Termostatos instalados e calibrados",
    "Sensores de temperatura operacionais",
    "Sistema de automação e controle operacional",
    "Display de controle funcionando"
];

export default function NovaInspecaoArCondicionado() {
    const navigate = useNavigate();
    const location = useLocation();
    const [empreendimentoId] = useState(() => new URLSearchParams(location.search).get('empreendimentoId'));
    const [empreendimento, setEmpreendimento] = useState(null);
    
    const [formData, setFormData] = useState({
        id_empreendimento: empreendimentoId,
        data_inspecao: new Date().toISOString().split('T')[0],
        projeto: '',
        data_projeto: new Date().toISOString().split('T')[0],
        titulo_secao_inspecao: 'Inspeção Física - Sistema de Ar Condicionado',
        evaporadoras: [],
        condensadoras: [],
        titulo_relatorio: 'Checklist de Inspeção Física SISTEMA DE AR CONDICIONADO',
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
        inspecao_evaporadora: {
            itens: defaultInspecaoEvaporadora.map(desc => ({ descricao: desc, resultado: 'OK', observacoes: '', fotos: [], tipo: 'item' })),
            comentarios: ''
        },
        inspecao_valvulas: {
            itens: defaultInspecaoValvulas.map(desc => ({ descricao: desc, resultado: 'OK', observacoes: '', fotos: [], tipo: 'item' })),
            comentarios: ''
        },
        inspecao_condensadora: {
            itens: defaultInspecaoCondensadora.map(desc => ({ descricao: desc, resultado: 'OK', observacoes: '', fotos: [], tipo: 'item' })),
            comentarios: ''
        },
        inspecao_eletrica: {
            itens: defaultInspecaoEletrica.map(desc => ({ descricao: desc, resultado: 'OK', observacoes: '', fotos: [], tipo: 'item' })),
            comentarios: ''
        },
        inspecao_sensores: {
            itens: defaultInspecaoSensores.map(desc => ({ descricao: desc, resultado: 'OK', observacoes: '', fotos: [], tipo: 'item' })),
            comentarios: ''
        },
        locais: [],
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
            titulo_secao: formData.titulo_secao_inspecao || 'Inspeção Física - Sistema de Ar Condicionado',
            comentarios: '',
            itens_inspecao: []
        }]);
    };

    const handleInspecaoSectionItemChange = (sectionKey, itemIndex, field, value) => {
        const newSection = { ...formData[sectionKey] };
        newSection.itens[itemIndex][field] = value;
        handleInputChange(sectionKey, newSection);
    };

    const addInspecaoSectionItem = (sectionKey) => {
        const newSection = { ...formData[sectionKey] };
        newSection.itens.push({ descricao: '', resultado: 'OK', observacoes: '', fotos: [], tipo: 'item' });
        handleInputChange(sectionKey, newSection);
    };

    const handleSectionPhotoUpload = async (e, sectionKey, itemIndex) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setUploadingPhoto(true);
        try {
            const uploadedPhotos = await Promise.all(files.map(async file => {
                const { file_url } = await UploadFile({ file });
                return { url: file_url, legenda: '' };
            }));
            const newSection = { ...formData[sectionKey] };
            if (!newSection.itens[itemIndex].fotos) {
                newSection.itens[itemIndex].fotos = [];
            }
            newSection.itens[itemIndex].fotos.push(...uploadedPhotos);
            handleInputChange(sectionKey, newSection);
        } catch (err) {
            toast.error("Falha no upload da foto.");
        } finally {
            setUploadingPhoto(false);
        }
    };

    const removeSectionPhoto = (sectionKey, itemIndex, photoIndex) => {
        const newSection = { ...formData[sectionKey] };
        newSection.itens[itemIndex].fotos = 
            newSection.itens[itemIndex].fotos.filter((_, i) => i !== photoIndex);
        handleInputChange(sectionKey, newSection);
    };

    const removeInspecaoSectionItem = (sectionKey, itemIndex) => {
        const newSection = { ...formData[sectionKey] };
        newSection.itens = newSection.itens.filter((_, i) => i !== itemIndex);
        handleInputChange(sectionKey, newSection);
    };

    const handleInspecaoSectionComentarios = (sectionKey, value) => {
        const newSection = { ...formData[sectionKey] };
        newSection.comentarios = value;
        handleInputChange(sectionKey, newSection);
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

    const addEvaporadora = () => {
        handleInputChange('evaporadoras', [...formData.evaporadoras, {
            nome_equipamento: '',
            fabricante: '',
            numero_serie: '',
            tensao_nominal: '',
            corrente_nominal: '',
            localizacao: '',
            modelo: '',
            vazao: '',
            capacidade: '',
            quantidade: ''
        }]);
    };

    const removeEvaporadora = (index) => {
        handleInputChange('evaporadoras', formData.evaporadoras.filter((_, i) => i !== index));
    };

    const handleEvaporadoraChange = (index, field, value) => {
        const newEvaporadoras = [...formData.evaporadoras];
        newEvaporadoras[index][field] = value;
        handleInputChange('evaporadoras', newEvaporadoras);
    };

    const addCondensadora = () => {
        handleInputChange('condensadoras', [...formData.condensadoras, {
            nome_equipamento: '',
            fabricante: '',
            numero_serie: '',
            tensao_nominal: '',
            corrente_nominal: '',
            localizacao: '',
            modelo: '',
            vazao: '',
            capacidade: '',
            quantidade: ''
        }]);
    };

    const removeCondensadora = (index) => {
        handleInputChange('condensadoras', formData.condensadoras.filter((_, i) => i !== index));
    };

    const handleCondensadoraChange = (index, field, value) => {
        const newCondensadoras = [...formData.condensadoras];
        newCondensadoras[index][field] = value;
        handleInputChange('condensadoras', newCondensadoras);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const dataToSave = { ...formData };
            if (dataToSave.data_inspecao && !dataToSave.data_inspecao.includes('T')) {
                dataToSave.data_inspecao = dataToSave.data_inspecao + 'T12:00:00';
            }

            await InspecaoArCondicionado.create(dataToSave);
            toast.success("Inspeção criada com sucesso!");
            navigate(createPageUrl(`EmpreendimentoInspecaoArCondicionado?empreendimentoId=${empreendimentoId}`));
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
                                placeholder="Ex: IAC-2025-01" 
                                value={formData.nome_arquivo || ''} 
                                onChange={e => handleInputChange('nome_arquivo', e.target.value)} 
                            />
                            <p className="text-xs text-gray-500">Se não preenchido, o arquivo não será exibido no rodapé</p>
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
                        <div className="space-y-2">
                            <Label>Título da Seção de Inspeção Física</Label>
                            <Input value={formData.titulo_secao_inspecao} onChange={e => handleInputChange('titulo_secao_inspecao', e.target.value)} placeholder="Ex: Inspeção Física - Sistema de Ar Condicionado" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Informação do Equipamento - Evaporadora</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {formData.evaporadoras.map((evap, index) => (
                            <div key={index} className="p-4 border rounded-lg bg-gray-50 space-y-3">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold">Evaporadora {index + 1}</h4>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeEvaporadora(index)}>
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Nome do Equipamento</Label>
                                        <Input value={evap.nome_equipamento} onChange={e => handleEvaporadoraChange(index, 'nome_equipamento', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Localização</Label>
                                        <Input value={evap.localizacao} onChange={e => handleEvaporadoraChange(index, 'localizacao', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Fabricante</Label>
                                        <Input value={evap.fabricante} onChange={e => handleEvaporadoraChange(index, 'fabricante', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Modelo</Label>
                                        <Input value={evap.modelo} onChange={e => handleEvaporadoraChange(index, 'modelo', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Número de Série</Label>
                                        <Input value={evap.numero_serie} onChange={e => handleEvaporadoraChange(index, 'numero_serie', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Vazão (m³/h)</Label>
                                        <Input value={evap.vazao} onChange={e => handleEvaporadoraChange(index, 'vazao', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Tensão Nominal (V)</Label>
                                        <Input value={evap.tensao_nominal} onChange={e => handleEvaporadoraChange(index, 'tensao_nominal', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Capacidade</Label>
                                        <Input value={evap.capacidade} onChange={e => handleEvaporadoraChange(index, 'capacidade', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Corrente Nominal (A)</Label>
                                        <Input value={evap.corrente_nominal} onChange={e => handleEvaporadoraChange(index, 'corrente_nominal', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Quantidade</Label>
                                        <Input value={evap.quantidade} onChange={e => handleEvaporadoraChange(index, 'quantidade', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={addEvaporadora}>
                            <Plus className="w-4 h-4 mr-2" /> Adicionar Evaporadora
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Informação do Equipamento - Condensadora</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {formData.condensadoras.map((cond, index) => (
                            <div key={index} className="p-4 border rounded-lg bg-gray-50 space-y-3">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold">Condensadora {index + 1}</h4>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeCondensadora(index)}>
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Nome do Equipamento</Label>
                                        <Input value={cond.nome_equipamento} onChange={e => handleCondensadoraChange(index, 'nome_equipamento', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Localização</Label>
                                        <Input value={cond.localizacao} onChange={e => handleCondensadoraChange(index, 'localizacao', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Fabricante</Label>
                                        <Input value={cond.fabricante} onChange={e => handleCondensadoraChange(index, 'fabricante', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Modelo</Label>
                                        <Input value={cond.modelo} onChange={e => handleCondensadoraChange(index, 'modelo', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Número de Série</Label>
                                        <Input value={cond.numero_serie} onChange={e => handleCondensadoraChange(index, 'numero_serie', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Vazão (m³/h)</Label>
                                        <Input value={cond.vazao} onChange={e => handleCondensadoraChange(index, 'vazao', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Tensão Nominal (V)</Label>
                                        <Input value={cond.tensao_nominal} onChange={e => handleCondensadoraChange(index, 'tensao_nominal', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Capacidade</Label>
                                        <Input value={cond.capacidade} onChange={e => handleCondensadoraChange(index, 'capacidade', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Corrente Nominal (A)</Label>
                                        <Input value={cond.corrente_nominal} onChange={e => handleCondensadoraChange(index, 'corrente_nominal', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Quantidade</Label>
                                        <Input value={cond.quantidade} onChange={e => handleCondensadoraChange(index, 'quantidade', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={addCondensadora}>
                            <Plus className="w-4 h-4 mr-2" /> Adicionar Condensadora
                        </Button>
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
                        <div className="space-y-2 mt-4">
                            <Label>Comentários</Label>
                            <Textarea 
                                placeholder="Comentários sobre a documentação cadastral..." 
                                value={formData.comentarios_documentacao || ''} 
                                onChange={e => handleInputChange('comentarios_documentacao', e.target.value)}
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>

                {[
                    { key: 'inspecao_evaporadora', titulo: 'INSPEÇÃO FÍSICA - UNIDADE EVAPORADORA', color: 'blue' },
                    { key: 'inspecao_valvulas', titulo: 'INSPEÇÃO FÍSICA - VÁLVULAS E TUBULAÇÃO FRIGORÍGENA', color: 'green' },
                    { key: 'inspecao_condensadora', titulo: 'INSPEÇÃO FÍSICA - UNIDADE CONDENSADORA', color: 'purple' },
                    { key: 'inspecao_eletrica', titulo: 'INSPEÇÃO FÍSICA - ELÉTRICA E CONTROLES', color: 'orange' },
                    { key: 'inspecao_sensores', titulo: 'INSPEÇÃO FÍSICA - SENSORES E CONTROLES', color: 'teal' },
                ].map(section => (
                    <Card key={section.key}>
                        <CardHeader><CardTitle className="text-base">{section.titulo}</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {(formData[section.key]?.itens || []).map((item, itemIndex) => (
                                <div key={itemIndex} className="p-3 border rounded-md bg-gray-50 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <Input 
                                            placeholder={t.description} 
                                            value={item.descricao} 
                                            onChange={e => handleInspecaoSectionItemChange(section.key, itemIndex, 'descricao', e.target.value)} 
                                            className="flex-1"
                                        />
                                        <div className="flex items-center gap-2">
                                            <Checkbox 
                                                checked={item.resultado === 'OK'} 
                                                onCheckedChange={checked => handleInspecaoSectionItemChange(section.key, itemIndex, 'resultado', checked ? 'OK' : '')}
                                            />
                                            <Label className="text-sm">OK</Label>
                                            <Checkbox 
                                                checked={item.resultado === 'Não'} 
                                                onCheckedChange={checked => handleInspecaoSectionItemChange(section.key, itemIndex, 'resultado', checked ? 'Não' : '')}
                                            />
                                            <Label className="text-sm">NA</Label>
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeInspecaoSectionItem(section.key, itemIndex)}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                    <Input 
                                        placeholder={t.observations} 
                                        value={item.observacoes} 
                                        onChange={e => handleInspecaoSectionItemChange(section.key, itemIndex, 'observacoes', e.target.value)} 
                                    />
                                    <div>
                                        <Label className="text-sm">{t.photos}</Label>
                                        <Input 
                                            type="file" 
                                            multiple 
                                            accept="image/*" 
                                            onChange={(e) => handleSectionPhotoUpload(e, section.key, itemIndex)} 
                                            disabled={uploadingPhoto} 
                                            className="mb-2" 
                                        />
                                        {uploadingPhoto && <div className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> {t.uploading}</div>}
                                        <div className="grid grid-cols-3 gap-2 mt-2">
                                            {(item.fotos || []).map((foto, photoIndex) => (
                                                <div key={photoIndex} className="relative">
                                                    <img src={foto.url} className="w-full h-20 object-cover rounded" alt="Foto" />
                                                    <Button 
                                                        type="button" 
                                                        variant="destructive" 
                                                        size="icon" 
                                                        className="absolute top-1 right-1 h-5 w-5" 
                                                        onClick={() => removeSectionPhoto(section.key, itemIndex, photoIndex)}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => addInspecaoSectionItem(section.key)}>
                                <Plus className="w-4 h-4 mr-2" /> {t.addItem}
                            </Button>
                            <div className="space-y-2 mt-4">
                                <Label>Comentários</Label>
                                <Textarea 
                                    placeholder="Comentários sobre esta seção..." 
                                    value={formData[section.key]?.comentarios || ''} 
                                    onChange={e => handleInspecaoSectionComentarios(section.key, e.target.value)}
                                    rows={2}
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}

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
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> {t.saving}</> : t.save}
                    </Button>
                </div>
            </form>
        </div>
    );
}