import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { UploadFile } from '@/api/integrations';
import { Empreendimento, InspecaoCFTV } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const t = {
    title: "Nova Inspeção de CFTV",
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
    pavimentos: "Teste Funcional - Câmeras",
    addPavimento: "Adicionar Pavimento",
    pavimentoName: "Pavimento / Região:",
    addCamera: "Adicionar Câmera",
    documentation: "Documentação Cadastral",
    physicalInspection: "Testes Funcionais - Sistema de CFTV",
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
    "Projeto executivo, especificações e lista de equipamentos."
];

const defaultCameraDescription = "Imagem nítida, focada, campo de visão conforme previsto em projeto";

export default function NovaInspecaoCFTV() {
    const navigate = useNavigate();
    const location = useLocation();
    const [empreendimentoId] = useState(() => new URLSearchParams(location.search).get('empreendimentoId'));
    const [empreendimento, setEmpreendimento] = useState(null);

    const [formData, setFormData] = useState({
        id_empreendimento: empreendimentoId,
        data_inspecao: new Date().toISOString().split('T')[0],
        titulo_relatorio: 'Checklist de Testes Funcionais do Sistema de CFTV',
        subtitulo_relatorio: '',
        cliente: '',
        revisao: '01',
        eng_responsavel: '',
        itens_documentacao: defaultDocumentacaoItems.map(desc => ({
            descricao: desc,
            resultado: 'OK',
            observacoes: ''
        })),
        pavimentos: [
            {
                nome_pavimento: 'Térreo',
                cameras: Array(20).fill(null).map(() => ({
                    foto: '',
                    descricao: defaultCameraDescription,
                    resultado: 'OK',
                    comentario: ''
                }))
            }
        ],
        observacoes_gerais: '',
        assinaturas: [],
        info_sistema: {
            nvr1_fabricante_modelo: '',
            nvr1_numero_serie: '',
            nvr1_processador: '',
            nvr1_storage: '',
            nvr1_network: '',
            nvr1_versao_software: '',
            nvr2_fabricante_modelo: '',
            nvr2_numero_serie: '',
            nvr2_processador: '',
            nvr2_storage: '',
            nvr2_network: '',
            nvr2_versao_software: '',
            comentarios_sistema: ''
        },
        info_cameras: {
            dome_fabricante: '',
            dome_modelo: '',
            ptz_fabricante: '',
            ptz_modelo: '',
            bullet_fabricante: '',
            bullet_modelo: ''
        }
    });

    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

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

    const addPavimento = () => {
        handleInputChange('pavimentos', [...formData.pavimentos, {
            nome_pavimento: '',
            cameras: Array(20).fill(null).map(() => ({
                foto: '',
                descricao: defaultCameraDescription,
                resultado: 'OK',
                comentario: ''
            }))
        }]);
    };

    const removePavimento = (pavIndex) => {
        handleInputChange('pavimentos', formData.pavimentos.filter((_, i) => i !== pavIndex));
    };

    const handlePavimentoChange = (pavIndex, field, value) => {
        const newPavimentos = [...formData.pavimentos];
        newPavimentos[pavIndex][field] = value;
        handleInputChange('pavimentos', newPavimentos);
    };

    const handleCameraChange = (pavIndex, camIndex, field, value) => {
        const newPavimentos = [...formData.pavimentos];
        newPavimentos[pavIndex].cameras[camIndex][field] = value;
        handleInputChange('pavimentos', newPavimentos);
    };

    const addCamera = (pavIndex) => {
        const newPavimentos = [...formData.pavimentos];
        newPavimentos[pavIndex].cameras.push({
            foto: '',
            descricao: defaultCameraDescription,
            resultado: 'OK',
            comentario: ''
        });
        handleInputChange('pavimentos', newPavimentos);
    };

    const handlePhotoUpload = async (pavIndex, camIndex, file) => {
        if (!file) return;
        setUploadingPhoto(true);
        try {
            const { file_url } = await UploadFile({ file });
            handleCameraChange(pavIndex, camIndex, 'foto', file_url);
            toast.success("Foto enviada com sucesso!");
        } catch (error) {
            console.error("Erro ao fazer upload da foto:", error);
            toast.error("Falha ao enviar a foto.");
        } finally {
            setUploadingPhoto(false);
        }
    };

    const removeCamera = (pavIndex, camIndex) => {
        const newPavimentos = [...formData.pavimentos];
        newPavimentos[pavIndex].cameras = newPavimentos[pavIndex].cameras.filter((_, i) => i !== camIndex);
        handleInputChange('pavimentos', newPavimentos);
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

            await InspecaoCFTV.create(dataToSave);
            toast.success("Inspeção criada com sucesso!");
            navigate(createPageUrl(`EmpreendimentoInspecaoCFTV?empreendimentoId=${empreendimentoId}`));
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
                                placeholder="Ex: ICFTV-2025-01"
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
                    <CardHeader><CardTitle>Informações do Sistema de CFTV</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <h4 className="font-semibold text-blue-900">NVR 1</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Fabricante / Modelo</Label>
                                    <Input value={formData.info_sistema?.nvr1_fabricante_modelo || ''} onChange={e => handleInputChange('info_sistema', { ...formData.info_sistema, nvr1_fabricante_modelo: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>No. De Série</Label>
                                    <Input value={formData.info_sistema?.nvr1_numero_serie || ''} onChange={e => handleInputChange('info_sistema', { ...formData.info_sistema, nvr1_numero_serie: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Processador</Label>
                                    <Input value={formData.info_sistema?.nvr1_processador || ''} onChange={e => handleInputChange('info_sistema', { ...formData.info_sistema, nvr1_processador: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Storage</Label>
                                    <Input value={formData.info_sistema?.nvr1_storage || ''} onChange={e => handleInputChange('info_sistema', { ...formData.info_sistema, nvr1_storage: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Network</Label>
                                    <Input value={formData.info_sistema?.nvr1_network || ''} onChange={e => handleInputChange('info_sistema', { ...formData.info_sistema, nvr1_network: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Versão Software</Label>
                                    <Input value={formData.info_sistema?.nvr1_versao_software || ''} onChange={e => handleInputChange('info_sistema', { ...formData.info_sistema, nvr1_versao_software: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-semibold text-blue-900">NVR 2</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Fabricante / Modelo</Label>
                                    <Input value={formData.info_sistema?.nvr2_fabricante_modelo || ''} onChange={e => handleInputChange('info_sistema', { ...formData.info_sistema, nvr2_fabricante_modelo: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>No. De Série</Label>
                                    <Input value={formData.info_sistema?.nvr2_numero_serie || ''} onChange={e => handleInputChange('info_sistema', { ...formData.info_sistema, nvr2_numero_serie: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Processador</Label>
                                    <Input value={formData.info_sistema?.nvr2_processador || ''} onChange={e => handleInputChange('info_sistema', { ...formData.info_sistema, nvr2_processador: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Storage</Label>
                                    <Input value={formData.info_sistema?.nvr2_storage || ''} onChange={e => handleInputChange('info_sistema', { ...formData.info_sistema, nvr2_storage: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Network</Label>
                                    <Input value={formData.info_sistema?.nvr2_network || ''} onChange={e => handleInputChange('info_sistema', { ...formData.info_sistema, nvr2_network: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Versão Software</Label>
                                    <Input value={formData.info_sistema?.nvr2_versao_software || ''} onChange={e => handleInputChange('info_sistema', { ...formData.info_sistema, nvr2_versao_software: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Comentários</Label>
                            <Textarea
                                value={formData.info_sistema?.comentarios_sistema || ''}
                                onChange={e => handleInputChange('info_sistema', { ...formData.info_sistema, comentarios_sistema: e.target.value })}
                                rows={4}
                                placeholder="Comentários sobre o sistema..."
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Quantidades e Descrição das Câmeras</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Dome - Fabricante</Label>
                                <Input value={formData.info_cameras?.dome_fabricante || ''} onChange={e => handleInputChange('info_cameras', { ...formData.info_cameras, dome_fabricante: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Dome - Modelo</Label>
                                <Input value={formData.info_cameras?.dome_modelo || ''} onChange={e => handleInputChange('info_cameras', { ...formData.info_cameras, dome_modelo: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>PTZ - Fabricante</Label>
                                <Input value={formData.info_cameras?.ptz_fabricante || ''} onChange={e => handleInputChange('info_cameras', { ...formData.info_cameras, ptz_fabricante: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>PTZ - Modelo</Label>
                                <Input value={formData.info_cameras?.ptz_modelo || ''} onChange={e => handleInputChange('info_cameras', { ...formData.info_cameras, ptz_modelo: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Bullet - Fabricante</Label>
                                <Input value={formData.info_cameras?.bullet_fabricante || ''} onChange={e => handleInputChange('info_cameras', { ...formData.info_cameras, bullet_fabricante: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Bullet - Modelo</Label>
                                <Input value={formData.info_cameras?.bullet_modelo || ''} onChange={e => handleInputChange('info_cameras', { ...formData.info_cameras, bullet_modelo: e.target.value })} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>{t.pavimentos}</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        {formData.pavimentos.map((pavimento, pavIndex) => (
                            <div key={pavIndex} className="p-4 border rounded-lg space-y-4 bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-1">
                                        <Label className="font-semibold">{t.pavimentoName}</Label>
                                        <Input
                                            placeholder="Ex: Térreo, 1º andar"
                                            value={pavimento.nome_pavimento}
                                            onChange={e => handlePavimentoChange(pavIndex, 'nome_pavimento', e.target.value)}
                                            className="max-w-md"
                                        />
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removePavimento(pavIndex)}>
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>

                                <div className="pl-4 border-l-2 space-y-3">
                                    <p className="text-sm text-gray-600 italic">Tique se for OK ✓, NA - Não se aplica. Caso contrário, faça um comentário.</p>

                                    <div className="space-y-3">
                                        {(pavimento.cameras || []).map((camera, camIndex) => (
                                            <div key={camIndex} className="p-3 border rounded-md bg-gray-50 space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <Label className="font-semibold text-sm">Câmera {camIndex + 1}</Label>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeCamera(pavIndex, camIndex)} className="h-6 w-6">
                                                        <Trash2 className="w-3 h-3 text-red-500" />
                                                    </Button>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-xs">Foto da Câmera</Label>
                                                    <div className="flex items-center gap-2">
                                                        {camera.foto && (
                                                            <div className="relative">
                                                                <img src={camera.foto} alt="Foto da câmera" className="w-20 h-20 object-cover rounded border" />
                                                                <Button
                                                                    type="button"
                                                                    variant="destructive"
                                                                    size="icon"
                                                                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                                                    onClick={() => handleCameraChange(pavIndex, camIndex, 'foto', '')}
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                        <Input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(e) => handlePhotoUpload(pavIndex, camIndex, e.target.files[0])}
                                                            disabled={uploadingPhoto}
                                                            className="text-xs"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="text-xs">Descrição</Label>
                                                    <Textarea
                                                        value={camera.descricao}
                                                        onChange={e => handleCameraChange(pavIndex, camIndex, 'descricao', e.target.value)}
                                                        className="text-sm"
                                                        rows={2}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <Checkbox
                                                            id={`ok-${pavIndex}-${camIndex}`}
                                                            checked={camera.resultado === 'OK'}
                                                            onCheckedChange={checked => handleCameraChange(pavIndex, camIndex, 'resultado', checked ? 'OK' : '')}
                                                        />
                                                        <Label htmlFor={`ok-${pavIndex}-${camIndex}`} className="text-sm">OK</Label>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Checkbox
                                                            id={`na-${pavIndex}-${camIndex}`}
                                                            checked={camera.resultado === 'NA'}
                                                            onCheckedChange={checked => handleCameraChange(pavIndex, camIndex, 'resultado', checked ? 'NA' : '')}
                                                        />
                                                        <Label htmlFor={`na-${pavIndex}-${camIndex}`} className="text-sm">N.A.</Label>
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="text-xs">Comentário</Label>
                                                    <Input
                                                        value={camera.comentario}
                                                        onChange={e => handleCameraChange(pavIndex, camIndex, 'comentario', e.target.value)}
                                                        className="text-sm"
                                                        placeholder="Comentário..."
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <Button type="button" variant="outline" size="sm" onClick={() => addCamera(pavIndex)}>
                                        <Plus className="w-4 h-4 mr-2" /> {t.addCamera}
                                    </Button>
                                </div>
                            </div>
                        ))}
                        <Button type="button" variant="secondary" onClick={addPavimento}>
                            <Plus className="w-4 h-4 mr-2" /> {t.addPavimento}
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