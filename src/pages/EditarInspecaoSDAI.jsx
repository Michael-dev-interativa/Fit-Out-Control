import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { InspecaoSDAI } from '@/api/entities';
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
    title: "Editar Inspeção de Central SDAI",
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
    party: "Parte",
    name: "Nome",
    documentation: "Documentação Técnica",
};

export default function EditarInspecaoSDAI() {
    const navigate = useNavigate();
    const location = useLocation();
    const urlParams = new URLSearchParams(location.search);
    const inspecaoIdFromUrl = urlParams.get('inspecaoId');

    const [inspecaoId, setInspecaoId] = useState(inspecaoIdFromUrl);
    const [formData, setFormData] = useState(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

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

        const loadData = async () => {
            try {
                const data = await InspecaoSDAI.get(inspecaoIdFromUrl);
                if (!data) {
                    toast.error("Inspeção não encontrada.");
                    navigate(-1);
                    return;
                }

                let dataInspecao = '';
                if (data.data_inspecao) {
                    dataInspecao = data.data_inspecao.includes('T')
                        ? data.data_inspecao.split('T')[0]
                        : data.data_inspecao;
                }
                // Converter estrutura antiga para nova (se necessário)
                let instalacoes = data.instalacoes;
                if (!instalacoes && data.itens_instalacao) {
                    // Migrar dados antigos para nova estrutura
                    instalacoes = [{
                        itens: data.itens_instalacao,
                        comentarios: data.comentarios_instalacao || ''
                    }];
                }
                if (!instalacoes || instalacoes.length === 0) {
                    instalacoes = [{ itens: [], comentarios: '' }];
                }

                // Criar array de ordem das seções se não existir
                let ordemSecoes = data.ordem_secoes;
                if (!ordemSecoes) {
                    ordemSecoes = [];
                    // Adicionar instalações primeiro
                    for (let i = 0; i < instalacoes.length; i++) {
                        ordemSecoes.push({ tipo: 'instalacao', indice: i });
                    }
                    // Adicionar centrais depois
                    const centrais = data.centrais || [{ tag: '', localizacao: '', fabricante_modelo: '', modulos_instalados: '', baterias_central: '', fonte_auxiliar_baterias: '' }];
                    for (let i = 0; i < centrais.length; i++) {
                        ordemSecoes.push({ tipo: 'central', indice: i });
                    }
                }

                setFormData({
                    ...data,
                    data_inspecao: dataInspecao,
                    itens_documentacao: data.itens_documentacao || [],
                    instalacoes: instalacoes,
                    assinaturas: data.assinaturas || [],
                    centrais: data.centrais || [{ tag: '', localizacao: '', fabricante_modelo: '', modulos_instalados: '', baterias_central: '', fonte_auxiliar_baterias: '' }],
                    ordem_secoes: ordemSecoes
                });
            } catch (error) {
                toast.error("Falha ao carregar dados da inspeção.");
                navigate(-1);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [inspecaoIdFromUrl, navigate, saving]);

    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    if (!formData) return null;

    const handleInputChange = (field, value) => setFormData(p => ({ ...p, [field]: value }));

    const handleInstalacaoItemChange = (instalacaoIndex, itemIndex, field, value) => {
        const newInstalacoes = [...formData.instalacoes];
        newInstalacoes[instalacaoIndex].itens[itemIndex][field] = value;
        handleInputChange('instalacoes', newInstalacoes);
    };

    const addInstalacaoItem = (instalacaoIndex) => {
        const newInstalacoes = [...formData.instalacoes];
        newInstalacoes[instalacaoIndex].itens.push({ item_verificacao: '', resultado: 'OK', comentario: '' });
        handleInputChange('instalacoes', newInstalacoes);
    };

    const removeInstalacaoItem = (instalacaoIndex, itemIndex) => {
        const newInstalacoes = [...formData.instalacoes];
        newInstalacoes[instalacaoIndex].itens = newInstalacoes[instalacaoIndex].itens.filter((_, i) => i !== itemIndex);
        handleInputChange('instalacoes', newInstalacoes);
    };

    const handleInstalacaoComentarioChange = (instalacaoIndex, value) => {
        const newInstalacoes = [...formData.instalacoes];
        newInstalacoes[instalacaoIndex].comentarios = value;
        handleInputChange('instalacoes', newInstalacoes);
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
            const dataToSave = {
                ...formData,
                // Garantir que ordem_secoes seja salva
                ordem_secoes: formData.ordem_secoes,
                instalacoes: formData.instalacoes,
                centrais: formData.centrais
            };

            if (dataToSave.data_inspecao && !dataToSave.data_inspecao.includes('T')) {
                dataToSave.data_inspecao = dataToSave.data_inspecao + 'T12:00:00';
            }

            // Manter compatibilidade com estrutura antiga (primeira instalação)
            if (dataToSave.instalacoes && dataToSave.instalacoes.length > 0) {
                dataToSave.itens_instalacao = dataToSave.instalacoes[0].itens;
                dataToSave.comentarios_instalacao = dataToSave.instalacoes[0].comentarios;
            }

            await InspecaoSDAI.update(inspecaoId, dataToSave);
            toast.success("Inspeção atualizada com sucesso!");
            setTimeout(() => {
                navigate(createPageUrl(`EmpreendimentoInspecaoSDAI?empreendimentoId=${formData.id_empreendimento}`), { replace: true });
            }, 500);
        } catch (error) {
            console.error("Erro ao atualizar inspeção:", error);
            toast.error("Falha ao atualizar a inspeção.");
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
                    <CardHeader><CardTitle>{t.generalInfo}</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2"><Label>{t.reportTitle}</Label><Input value={formData.titulo_relatorio} onChange={e => handleInputChange('titulo_relatorio', e.target.value)} /></div>
                        <div className="space-y-2"><Label>{t.reportSubtitle}</Label><Input value={formData.subtitulo_relatorio} onChange={e => handleInputChange('subtitulo_relatorio', e.target.value)} /></div>
                        <div className="space-y-2"><Label>{t.client}</Label><Input value={formData.cliente} onChange={e => handleInputChange('cliente', e.target.value)} /></div>
                        <div className="space-y-2"><Label>{t.engineer}</Label><Input value={formData.eng_responsavel} onChange={e => handleInputChange('eng_responsavel', e.target.value)} /></div>
                        <div className="space-y-2"><Label>{t.revision}</Label><Input value={formData.revisao} onChange={e => handleInputChange('revisao', e.target.value)} /></div>
                        <div className="space-y-2"><Label>{t.inspectionDate}</Label><Input type="date" value={formData.data_inspecao} onChange={e => handleInputChange('data_inspecao', e.target.value)} /></div>
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
                                    <Input placeholder={t.description} value={item.descricao} onChange={e => handleDocItemChange(itemIndex, 'descricao', e.target.value)} className="flex-1" />
                                    <div className="flex items-center gap-2">
                                        <Checkbox checked={item.resultado === 'OK'} onCheckedChange={checked => handleDocItemChange(itemIndex, 'resultado', checked ? 'OK' : '')} />
                                        <Label className="text-sm">Recebido</Label>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeDocItem(itemIndex)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                </div>
                                <Input placeholder={t.observations} value={item.observacoes} onChange={e => handleDocItemChange(itemIndex, 'observacoes', e.target.value)} />
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={addDocItem}><Plus className="w-4 h-4 mr-2" /> {t.addItem}</Button>

                        <div className="space-y-2 mt-4 pt-4 border-t">
                            <Label>{t.generalObservations}:</Label>
                            <Textarea
                                value={formData.observacoes_gerais || ''}
                                onChange={e => handleInputChange('observacoes_gerais', e.target.value)}
                                rows={4}
                                placeholder="Observações gerais sobre a documentação..."
                            />
                        </div>
                    </CardContent>
                </Card>

                {formData.ordem_secoes.map((secao, secaoIndex) => {
                    if (secao.tipo === 'instalacao') {
                        const instalacaoIndex = secao.indice;
                        const instalacao = formData.instalacoes[instalacaoIndex];
                        if (!instalacao) return null;

                        return (
                            <Card key={`instalacao-${instalacaoIndex}`}>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle>{t.instalacao} {instalacaoIndex + 1}</CardTitle>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => {
                                            const newInstalacoes = formData.instalacoes.filter((_, i) => i !== instalacaoIndex);
                                            const newOrdem = formData.ordem_secoes
                                                .filter(s => !(s.tipo === 'instalacao' && s.indice === instalacaoIndex))
                                                .map(s => {
                                                    if (s.tipo === 'instalacao' && s.indice > instalacaoIndex) {
                                                        return { ...s, indice: s.indice - 1 };
                                                    }
                                                    return s;
                                                });
                                            setFormData(p => ({ ...p, instalacoes: newInstalacoes, ordem_secoes: newOrdem }));
                                        }}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                </CardHeader>
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
                                                {(instalacao.itens || []).map((item, itemIndex) => (
                                                    <tr key={itemIndex}>
                                                        <td className="border border-gray-300 p-2">
                                                            <Input
                                                                value={item.item_verificacao}
                                                                onChange={e => handleInstalacaoItemChange(instalacaoIndex, itemIndex, 'item_verificacao', e.target.value)}
                                                                className="border-0 focus-visible:ring-0"
                                                            />
                                                        </td>
                                                        <td className="border border-gray-300 p-2 text-center">
                                                            <Checkbox
                                                                checked={item.resultado === 'OK'}
                                                                onCheckedChange={checked => handleInstalacaoItemChange(instalacaoIndex, itemIndex, 'resultado', checked ? 'OK' : '')}
                                                            />
                                                        </td>
                                                        <td className="border border-gray-300 p-2 text-center">
                                                            <Checkbox
                                                                checked={item.resultado === 'NA'}
                                                                onCheckedChange={checked => handleInstalacaoItemChange(instalacaoIndex, itemIndex, 'resultado', checked ? 'NA' : '')}
                                                            />
                                                        </td>
                                                        <td className="border border-gray-300 p-2">
                                                            <Input
                                                                value={item.comentario}
                                                                onChange={e => handleInstalacaoItemChange(instalacaoIndex, itemIndex, 'comentario', e.target.value)}
                                                                className="border-0 focus-visible:ring-0"
                                                            />
                                                        </td>
                                                        <td className="border border-gray-300 p-2 text-center">
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeInstalacaoItem(instalacaoIndex, itemIndex)} className="h-8 w-8">
                                                                <Trash2 className="w-4 h-4 text-red-500" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={() => addInstalacaoItem(instalacaoIndex)}>
                                        <Plus className="w-4 h-4 mr-2" /> {t.addItem}
                                    </Button>

                                    <div className="space-y-2 mt-4">
                                        <Label>{t.comentariosInstalacao}:</Label>
                                        <Textarea
                                            value={instalacao.comentarios || ''}
                                            onChange={e => handleInstalacaoComentarioChange(instalacaoIndex, e.target.value)}
                                            rows={4}
                                            placeholder="Comentários gerais sobre a instalação..."
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    } else if (secao.tipo === 'central') {
                        const centralIndex = secao.indice;
                        const central = formData.centrais[centralIndex];
                        if (!central) return null;

                        return (
                            <Card key={`central-${centralIndex}`}>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle>Dados de Equipamento - Central SDAI {centralIndex + 1}</CardTitle>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => {
                                            const newCentrals = formData.centrais.filter((_, i) => i !== centralIndex);
                                            const newOrdem = formData.ordem_secoes
                                                .filter(s => !(s.tipo === 'central' && s.indice === centralIndex))
                                                .map(s => {
                                                    if (s.tipo === 'central' && s.indice > centralIndex) {
                                                        return { ...s, indice: s.indice - 1 };
                                                    }
                                                    return s;
                                                });
                                            setFormData(p => ({ ...p, centrais: newCentrals, ordem_secoes: newOrdem }));
                                        }}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
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
                                </CardContent>
                            </Card>
                        );
                    }
                    return null;
                })}

                <div className="flex justify-center gap-4">
                    <Button type="button" variant="secondary" onClick={() => {
                        const newInstalacoes = [...formData.instalacoes, { itens: [], comentarios: '' }];
                        const newOrdem = [...formData.ordem_secoes, { tipo: 'instalacao', indice: formData.instalacoes.length }];
                        setFormData(p => ({ ...p, instalacoes: newInstalacoes, ordem_secoes: newOrdem }));
                    }}>
                        <Plus className="w-4 h-4 mr-2" /> Adicionar Instalação
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => {
                        const newCentrals = [...formData.centrais, {
                            tag: '',
                            localizacao: '',
                            fabricante_modelo: '',
                            modulos_instalados: '',
                            baterias_central: '',
                            fonte_auxiliar_baterias: ''
                        }];
                        const newOrdem = [...formData.ordem_secoes, { tipo: 'central', indice: formData.centrais.length }];
                        setFormData(p => ({ ...p, centrais: newCentrals, ordem_secoes: newOrdem }));
                    }}>
                        <Plus className="w-4 h-4 mr-2" /> Adicionar Central
                    </Button>
                </div>

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
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t.saving}</> : t.save}
                    </Button>
                </div>
            </form>
        </div>
    );
}