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
import { Loader2, Plus, Trash2, ArrowLeft, Pencil, Image } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useFormDraft } from '@/lib/useFormDraft';
import DraftBanner from '@/components/DraftBanner';

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
    
    const initialFormData = {
        id_empreendimento: empreendimentoId,
        data_inspecao: new Date().toISOString().split('T')[0],
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
        itens_instalacao: defaultItensInstalacao.map(item => ({
            item_verificacao: item,
            resultado: 'OK',
            comentario: ''
        })),
        comentarios_instalacao: '',
        observacoes_gerais: '',
        conclusao_1_vistoria: '',
        conclusao_2_vistoria: '',
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
    };

    const { formData, setFormData, clearDraft, hasDraft, draftSavedAt } = useFormDraft(
        `inspecao-sdai-${empreendimentoId}`,
        initialFormData
    );
    
    const [saving, setSaving] = useState(false);
    const [showCapaDialog, setShowCapaDialog] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    useEffect(() => {
        if (!empreendimentoId) {
            toast.error("ID do empreendimento não encontrado.");
            navigate(-1);
            return;
        }
        const loadEmpreendimento = async () => {
            try {
                const data = await base44.entities.Empreendimento.get(empreendimentoId);
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

    const handleInstalacaoItemChange = (itemIndex, field, value) => {
        const newItems = [...formData.itens_instalacao];
        newItems[itemIndex][field] = value;
        handleInputChange('itens_instalacao', newItems);
    };

    const addInstalacaoItem = () => {
        handleInputChange('itens_instalacao', [...formData.itens_instalacao, { item_verificacao: '', resultado: 'OK', comentario: '' }]);
    };

    const removeInstalacaoItem = (itemIndex) => {
        handleInputChange('itens_instalacao', formData.itens_instalacao.filter((_, i) => i !== itemIndex));
    };

    const handlePhotoUpload = async (e, itemIndex) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setUploadingPhoto(true);
        try {
            const uploaded = await Promise.all(files.map(async file => {
                const { file_url } = await base44.integrations.Core.UploadFile({ file });
                return { url: file_url, legenda: '' };
            }));
            const newItems = [...formData.itens_instalacao];
            if (!newItems[itemIndex].fotos) newItems[itemIndex].fotos = [];
            newItems[itemIndex].fotos.push(...uploaded);
            handleInputChange('itens_instalacao', newItems);
        } catch (err) {
            toast.error("Falha no upload da foto.");
        } finally {
            setUploadingPhoto(false);
        }
    };

    const removePhoto = (itemIndex, photoIndex) => {
        const newItems = [...formData.itens_instalacao];
        newItems[itemIndex].fotos = newItems[itemIndex].fotos.filter((_, i) => i !== photoIndex);
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

    const addAssinatura = () => handleInputChange('assinaturas', [...formData.assinaturas, { parte: '', nome: '' }]);
    const removeAssinatura = (index) => handleInputChange('assinaturas', formData.assinaturas.filter((_, i) => i !== index));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const dataToSave = { ...formData };
            if (dataToSave.data_inspecao && !dataToSave.data_inspecao.includes('T')) {
                dataToSave.data_inspecao = dataToSave.data_inspecao + 'T12:00:00';
            }
            // Salvar também na estrutura nova (instalacoes) para compatibilidade com Editar/Visualizar
            dataToSave.instalacoes = [{
                itens: dataToSave.itens_instalacao || [],
                comentarios: dataToSave.comentarios_instalacao || '',
                nome_local: dataToSave.instalacoes?.[0]?.nome_local || ''
            }];
            dataToSave.ordem_secoes = [
                { tipo: 'instalacao', indice: 0 },
                ...((dataToSave.centrais || []).map((_, i) => ({ tipo: 'central', indice: i })))
            ];

            await base44.entities.InspecaoSDAI.create(dataToSave);
            clearDraft();
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
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowCapaDialog(true)}>
                        <Pencil className="w-4 h-4 mr-2" /> Editar Capa
                    </Button>
                    <Button variant="outline" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-4 h-4 mr-2"/>{t.back}
                    </Button>
                </div>
            </div>
            
            <DraftBanner draftSavedAt={draftSavedAt} hasDraft={hasDraft} onClearDraft={() => { clearDraft(); setFormData(initialFormData); }} />

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
                        <div className="space-y-2">
                            <Label>Título da Seção de Inspeção</Label>
                            <Input 
                                placeholder="Ex: Inspeção Física – Instalação" 
                                value={formData.titulo_secao_inspecao || ''} 
                                onChange={e => handleInputChange('titulo_secao_inspecao', e.target.value)} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Label do Campo Local</Label>
                            <Input 
                                placeholder="Ex: Pavimento/Região:" 
                                value={formData.label_local || ''} 
                                onChange={e => handleInputChange('label_local', e.target.value)} 
                            />
                        </div>
                    </CardContent>
                </Card>

                <Dialog open={showCapaDialog} onOpenChange={setShowCapaDialog}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Editar Capa</DialogTitle>
                            <DialogDescription>Configure os campos da capa do relatório</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6">
                            <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                                <h3 className="font-semibold text-blue-900">Títulos da Capa</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Título Principal</Label>
                                        <Input 
                                            value={formData.titulo_capa || ''} 
                                            onChange={e => handleInputChange('titulo_capa', e.target.value)}
                                            placeholder="Ex: RELATÓRIO"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Subtítulo (vermelho)</Label>
                                        <Input 
                                            value={formData.subtitulo_capa || ''} 
                                            onChange={e => handleInputChange('subtitulo_capa', e.target.value)}
                                            placeholder="Ex: Gerenciamento de Obra"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-green-50 p-4 rounded-lg space-y-4">
                                <h3 className="font-semibold text-green-900">Informações da Inspeção</h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Título da Inspeção</Label>
                                        <Input 
                                            value={formData.titulo_relatorio || ''} 
                                            onChange={e => handleInputChange('titulo_relatorio', e.target.value)}
                                            placeholder="Ex: INSPEÇÃO DAS INSTALAÇÕES ELÉTRICAS"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Descrição da Inspeção</Label>
                                        <Textarea 
                                            value={formData.subtitulo_relatorio || ''} 
                                            onChange={e => handleInputChange('subtitulo_relatorio', e.target.value)}
                                            placeholder="Ex: Salas de exaustão e pressurização"
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-red-50 p-4 rounded-lg space-y-4">
                                <h3 className="font-semibold text-red-900">Rodapé da Capa</h3>
                                <div className="space-y-2">
                                    <Label>Texto do Rodapé</Label>
                                    <Textarea 
                                        value={formData.texto_rodape_capa || ''} 
                                        onChange={e => handleInputChange('texto_rodape_capa', e.target.value)}
                                        placeholder="Ex: Most Moema | Ed. Most Moema | MPD"
                                        rows={2}
                                    />
                                    <p className="text-xs text-gray-500">Este texto será exibido no rodapé da capa</p>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowCapaDialog(false)}>
                                Cancelar
                            </Button>
                            <Button type="button" onClick={() => setShowCapaDialog(false)}>
                                Salvar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

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
                        {formData.label_local && (
                            <div className="space-y-2">
                                <Label className="font-semibold">{formData.label_local}</Label>
                                <Input
                                    placeholder={`Ex: Térreo, 1º andar`}
                                    value={formData.instalacoes?.[0]?.nome_local || ''}
                                    onChange={e => {
                                        const newInstalacoes = [...(formData.instalacoes || [{ itens: formData.itens_instalacao || [], comentarios: formData.comentarios_instalacao || '' }])];
                                        if (!newInstalacoes[0]) newInstalacoes[0] = { itens: [], comentarios: '' };
                                        newInstalacoes[0] = { ...newInstalacoes[0], nome_local: e.target.value };
                                        handleInputChange('instalacoes', newInstalacoes);
                                    }}
                                    className="max-w-md"
                                />
                            </div>
                        )}
                        {formData.titulo_secao_inspecao && (
                            <h4 className="font-medium text-green-700">{formData.titulo_secao_inspecao}</h4>
                        )}
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 p-2 text-left font-semibold">Item de verificação</th>
                                        <th className="border border-gray-300 p-2 text-center font-semibold w-16">Ok</th>
                                        <th className="border border-gray-300 p-2 text-center font-semibold w-16">N/OK</th>
                                        <th className="border border-gray-300 p-2 text-center font-semibold w-16">NA</th>
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
                                                       checked={item.resultado === 'N/OK'} 
                                                       onCheckedChange={checked => handleInstalacaoItemChange(itemIndex, 'resultado', checked ? 'N/OK' : '')}
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
                                               <td className="border border-gray-300 p-2 text-center">
                                                   <Button type="button" variant="ghost" size="icon" onClick={() => removeInstalacaoItem(itemIndex)} className="h-8 w-8">
                                                       <Trash2 className="w-4 h-4 text-red-500" />
                                                   </Button>
                                               </td>
                                           </tr>
                                           <tr>
                                               <td colSpan={6} className="border border-gray-300 p-2 bg-gray-50">
                                                   <div className="space-y-2">
                                                       <Label className="text-xs text-gray-500 flex items-center gap-1"><Image className="w-3 h-3" /> Fotos</Label>
                                                       <Input type="file" multiple accept="image/*" onChange={e => handlePhotoUpload(e, itemIndex)} disabled={uploadingPhoto} className="text-xs h-7" />
                                                       {uploadingPhoto && <div className="flex items-center gap-1 text-xs text-gray-500"><Loader2 className="w-3 h-3 animate-spin" /> Enviando...</div>}
                                                       {(item.fotos || []).length > 0 && (
                                                           <div className="grid grid-cols-4 gap-2">
                                                               {(item.fotos || []).map((foto, photoIndex) => (
                                                                   <div key={photoIndex} className="relative">
                                                                       <img src={foto.url} className="w-full h-20 object-cover rounded" />
                                                                       <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-5 w-5" onClick={() => removePhoto(itemIndex, photoIndex)}><Trash2 className="w-3 h-3" /></Button>
                                                                   </div>
                                                               ))}
                                                           </div>
                                                       )}
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
                    <CardContent className="space-y-4">
                        <Textarea 
                            value={formData.observacoes_gerais} 
                            onChange={e => handleInputChange('observacoes_gerais', e.target.value)} 
                            rows={4}
                            placeholder="Digite observações gerais sobre a inspeção..."
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Conclusão - 1ª Vistoria (RO1)</Label>
                                <Select value={formData.conclusao_1_vistoria || ''} onValueChange={v => handleInputChange('conclusao_1_vistoria', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="-- Selecionar --" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={null}>-- Selecionar --</SelectItem>
                                        <SelectItem value="Aprovado com totalidade">Aprovado com totalidade</SelectItem>
                                        <SelectItem value="Aprovado com ressalvas">Aprovado com ressalvas</SelectItem>
                                        <SelectItem value="Reprovado">Reprovado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Conclusão - 2ª Vistoria (RO2)</Label>
                                <Select value={formData.conclusao_2_vistoria || ''} onValueChange={v => handleInputChange('conclusao_2_vistoria', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="-- Selecionar --" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={null}>-- Selecionar --</SelectItem>
                                        <SelectItem value="Aprovado com totalidade">Aprovado com totalidade</SelectItem>
                                        <SelectItem value="Aprovado com ressalvas">Aprovado com ressalvas</SelectItem>
                                        <SelectItem value="Reprovado">Reprovado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>{t.signatures}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {formData.assinaturas.map((assinatura, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-3 items-end gap-2 p-2 border rounded-lg">
                                <div className="space-y-1">
                                    <Label>{t.party}</Label>
                                    <Input value={assinatura.parte} onChange={e => handleAssinaturaChange(index, 'parte', e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label>{t.name}</Label>
                                    <Input value={assinatura.nome} onChange={e => handleAssinaturaChange(index, 'nome', e.target.value)} />
                                </div>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeAssinatura(index)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" onClick={addAssinatura}>
                            <Plus className="w-4 h-4 mr-2" /> {t.addSignature}
                        </Button>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                    <Button type="submit" disabled={saving}>
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> {t.saving}</> : t.save}
                    </Button>
                </div>
            </form>
        </div>
    );
}