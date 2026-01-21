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
import { Loader2, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

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

    const [formData, setFormData] = useState({
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
                                        <tr key={itemIndex}>
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
                                            <td className="border border-gray-300 p-2 text-center">
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeInstalacaoItem(itemIndex)} className="h-8 w-8">
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </td>
                                        </tr>
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
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t.saving}</> : t.save}
                    </Button>
                </div>
            </form>
        </div>
    );
}