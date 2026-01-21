
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { DiarioDeObra } from '@/api/entities';
import { Empreendimento } from '@/api/entities';
import { UnidadeEmpreendimento } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Upload, ArrowLeft } from 'lucide-react';
import { UploadFile } from '@/api/integrations';
import { toast } from 'sonner';
import { Checkbox } from "@/components/ui/checkbox"


const translations = {
  pt: {
    title: "Novo Diário de Obra",
    save: "Salvar Diário",
    saving: "Salvando...",
    back: "Voltar",
    generalInfo: "Informações Gerais",
    date: "Data do Diário",
    unit: "Unidade/Pavimento (Opcional)",
    noUnit: "Geral / Sem unidade específica",
    weatherConditions: "Condições Climáticas",
    workPeriod: "Período Trabalhado",
    morning: "Manhã",
    afternoon: "Tarde",
    night: "Noite",
    stoppedHours: "Horas Paralisadas",
    workforce: "Efetivo (Mão de Obra)",
    category: "Categoria",
    present: "Pres.",
    absentWithJustification: "Aus. c/ Just.",
    absentWithoutJustification: "Aus. s/ Just.",
    total: "Total",
    mainActivities: "Principais Atividades em Execução",
    addActivity: "Adicionar Atividade",
    activityPlaceholder: "Descreva a atividade",
    occurrences: "Ocorrências e Observações",
    occurrencesPlaceholder: "Descreva ocorrências, visitas, paralisações, etc.",
    photos: "Registro Fotográfico",
    addPhotos: "Adicionar Fotos",
    uploading: "Enviando...",
    approvals: "Vistos",
    addApproval: "Adicionar Visto",
    responsible: "Responsável",
    approverName: "Nome do Aprovador",
    addCategory: "Adicionar Categoria",
    categoryPlaceholder: "Nome da Categoria",
    fileName: "Nome do Arquivo",
    fileNamePlaceholder: "Ex: DO-001.pdf",
    customUnitText: "Unidade/Pavimento (Texto)",
    customUnitPlaceholder: "Ex: Térreo - Área Comum",
  },
};

const categoriasEfetivoPredefinidas = [
    "Diretor/ Gestor de Contrato", 
    "Engº Planejamento", 
    "Gerente de Obra", 
    "Engº de Produção", 
    "Engº Seg. Trab.",
    "Téc. Enfermagem", 
    "Assistente Técnico", 
    "Supervisor Administrativo", 
    "Assistente Administrativo", 
    "Arquiteto", 
    "Eletricista", 
    "Mestre de Obra", 
    "Almoxarife", 
    "Feitor", 
    "Carpinteiro", 
    "Servente", 
    "Assist. de Projetos", 
    "Aux. Serviços Gerais", 
    "Comprador(a)", 
];

export default function NovoDiarioObra() {
    const navigate = useNavigate();
    const location = useLocation();
    
    const urlParams = new URLSearchParams(location.search);
    const empreendimentoId = urlParams.get('empreendimentoId');
    
    const [empreendimento, setEmpreendimento] = useState(null);
    const [unidades, setUnidades] = useState([]);
    const [formData, setFormData] = useState({
        id_empreendimento: empreendimentoId,
        id_unidade: '',
        unidade_texto: '',
        nome_arquivo: '', // Added new field for file name
        data_diario: new Date().toISOString().split('T')[0],
        condicao_climatica: "Dias produtivos",
        efetivo: categoriasEfetivoPredefinidas.map(cat => ({ categoria: cat, presente: 0, ausente_com_justificativa: 0, ausente_sem_justificativa: 0 })),
        principais_atividades: [''],
        ocorrencias_observacoes: '',
        fotos: [],
        periodo_trabalhado: { manha: true, tarde: true, noite: false },
        horas_paralisadas: 0,
        vistos: [],
    });
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    
    const t = translations.pt;

    useEffect(() => {
        const loadInitialData = async () => {
            if (!empreendimentoId) {
                toast.error("ID do empreendimento não encontrado.");
                navigate(-1);
                return;
            }
            try {
                const [empData, unidadesData] = await Promise.all([
                    Empreendimento.get(empreendimentoId),
                    UnidadeEmpreendimento.filter({ id_empreendimento: empreendimentoId })
                ]);
                setEmpreendimento(empData);
                setUnidades(unidadesData);
            } catch(err) {
                console.error("Erro ao carregar dados:", err);
                toast.error("Falha ao carregar dados do empreendimento.");
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, [empreendimentoId, navigate]);

    const handleInputChange = (field, value) => setFormData(p => ({ ...p, [field]: value }));

    const handleEfetivoChange = (index, field, value) => {
        const newEfetivo = [...formData.efetivo];
        if (field === 'categoria') {
            newEfetivo[index][field] = value;
        } else {
            newEfetivo[index][field] = parseInt(value, 10) || 0;
        }
        handleInputChange('efetivo', newEfetivo);
    };

    const addEfetivoCategoria = () => {
        handleInputChange('efetivo', [...formData.efetivo, { categoria: '', presente: 0, ausente_com_justificativa: 0, ausente_sem_justificativa: 0 }]);
    };

    const removeEfetivoCategoria = (index) => {
        const newEfetivo = formData.efetivo.filter((_, i) => i !== index);
        handleInputChange('efetivo', newEfetivo);
    };

    const handleAtividadeChange = (index, value) => {
        const newAtividades = [...formData.principais_atividades];
        newAtividades[index] = value;
        handleInputChange('principais_atividades', newAtividades);
    };

    const addAtividade = () => {
        handleInputChange('principais_atividades', [...formData.principais_atividades, '']);
    };

    const removeAtividade = (index) => {
        const newAtividades = formData.principais_atividades.filter((_, i) => i !== index);
        handleInputChange('principais_atividades', newAtividades);
    };
    
    const handlePhotoUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setUploadingPhoto(true);
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
            setUploadingPhoto(false);
        }
    };
    
    const handlePhotoLegendChange = (index, value) => {
        const newFotos = [...formData.fotos];
        newFotos[index].legenda = value;
        handleInputChange('fotos', newFotos);
    };
    
    const removePhoto = (index) => {
        const newFotos = formData.fotos.filter((_, i) => i !== index);
        handleInputChange('fotos', newFotos);
    };

    const handleVistoChange = (index, field, value) => {
        const newVistos = [...formData.vistos];
        newVistos[index][field] = value;
        handleInputChange('vistos', newVistos);
    };

    const addVisto = () => {
        handleInputChange('vistos', [...formData.vistos, { responsavel: '', data_visto: new Date().toISOString().split('T')[0], nome_visto: '' }]);
    };

    const removeVisto = (index) => {
        const newVistos = formData.vistos.filter((_, i) => i !== index);
        handleInputChange('vistos', newVistos);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const finalData = {
                ...formData,
                principais_atividades: formData.principais_atividades.filter(a => a.trim() !== ''),
            };
            await DiarioDeObra.create(finalData);
            toast.success("Diário de Obra criado com sucesso!");
            navigate(createPageUrl(`EmpreendimentoDiariosObra?empreendimentoId=${empreendimentoId}`));
        } catch (error) {
            console.error("Erro ao criar diário:", error);
            toast.error("Falha ao criar o diário de obra.");
        } finally {
            setSaving(false);
        }
    };
    
    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">{t.title}</h1>
                <Button variant="outline" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-4 h-4 mr-2"/>
                    {t.back}
                </Button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>{t.generalInfo}</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="data_diario">{t.date}</Label>
                            <Input id="data_diario" type="date" value={formData.data_diario} onChange={(e) => handleInputChange('data_diario', e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="id_unidade">{t.unit}</Label>
                            <Select value={formData.id_unidade || ''} onValueChange={(value) => handleInputChange('id_unidade', value)}>
                                <SelectTrigger><SelectValue placeholder={t.noUnit} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={null}>{t.noUnit}</SelectItem>
                                    {unidades.map(u => (<SelectItem key={u.id} value={u.id}>{u.unidade_empreendimento}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="unidade_texto">{t.customUnitText}</Label>
                            <Input id="unidade_texto" type="text" value={formData.unidade_texto} onChange={(e) => handleInputChange('unidade_texto', e.target.value)} placeholder={t.customUnitPlaceholder} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="condicao_climatica">{t.weatherConditions}</Label>
                            <Select value={formData.condicao_climatica} onValueChange={(value) => handleInputChange('condicao_climatica', value)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Dias produtivos">Dias produtivos</SelectItem>
                                    <SelectItem value="Dias sem atividades">Dias sem atividades</SelectItem>
                                    <SelectItem value="Dias com trabalhos prejudicados por chuva">Dias com trabalhos prejudicados por chuva</SelectItem>
                                    <SelectItem value="Dias com trabalhos prejudicados por chuva do dia anterior">Dias com trabalhos prejudicados por chuva do dia anterior</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="nome_arquivo">{t.fileName}</Label>
                            <Input id="nome_arquivo" type="text" value={formData.nome_arquivo} onChange={(e) => handleInputChange('nome_arquivo', e.target.value)} placeholder={t.fileNamePlaceholder} />
                        </div>
                        <div className="space-y-2 col-span-1">
                            <Label>{t.workPeriod}</Label>
                            <div className="flex items-center space-x-4 pt-2">
                                <div className="flex items-center space-x-2"><Checkbox id="manha" checked={formData.periodo_trabalhado.manha} onCheckedChange={(checked) => handleInputChange('periodo_trabalhado', {...formData.periodo_trabalhado, manha: checked})} /><label htmlFor="manha">{t.morning}</label></div>
                                <div className="flex items-center space-x-2"><Checkbox id="tarde" checked={formData.periodo_trabalhado.tarde} onCheckedChange={(checked) => handleInputChange('periodo_trabalhado', {...formData.periodo_trabalhado, tarde: checked})} /><label htmlFor="tarde">{t.afternoon}</label></div>
                                <div className="flex items-center space-x-2"><Checkbox id="noite" checked={formData.periodo_trabalhado.noite} onCheckedChange={(checked) => handleInputChange('periodo_trabalhado', {...formData.periodo_trabalhado, noite: checked})} /><label htmlFor="noite">{t.night}</label></div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="horas_paralisadas">{t.stoppedHours}</Label>
                            <Input id="horas_paralisadas" type="number" value={formData.horas_paralisadas} onChange={(e) => handleInputChange('horas_paralisadas', e.target.value)} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>{t.workforce}</CardTitle></CardHeader>
                    <CardContent className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left">
                                    <th className="p-2 min-w-[200px]">{t.category}</th>
                                    <th className="p-2 text-center">{t.present}</th>
                                    <th className="p-2 text-center">{t.absentWithJustification}</th>
                                    <th className="p-2 text-center">{t.absentWithoutJustification}</th>
                                    <th className="p-2 text-center">{t.total}</th>
                                    <th className="p-2 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {formData.efetivo.map((item, index) => (
                                    <tr key={index} className="border-t">
                                        <td className="p-2">
                                            <Input 
                                                type="text" 
                                                value={item.categoria} 
                                                onChange={(e) => handleEfetivoChange(index, 'categoria', e.target.value)} 
                                                placeholder={t.categoryPlaceholder} 
                                            />
                                        </td>
                                        <td><Input type="number" min="0" value={item.presente} onChange={(e) => handleEfetivoChange(index, 'presente', e.target.value)} className="text-center" /></td>
                                        <td><Input type="number" min="0" value={item.ausente_com_justificativa} onChange={(e) => handleEfetivoChange(index, 'ausente_com_justificativa', e.target.value)} className="text-center" /></td>
                                        <td><Input type="number" min="0" value={item.ausente_sem_justificativa} onChange={(e) => handleEfetivoChange(index, 'ausente_sem_justificativa', e.target.value)} className="text-center" /></td>
                                        <td className="p-2 text-center font-bold">{item.presente + item.ausente_com_justificativa + item.ausente_sem_justificativa}</td>
                                        <td className="text-center">
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeEfetivoCategoria(index)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <Button type="button" variant="outline" onClick={addEfetivoCategoria} className="mt-4"><Plus className="w-4 h-4 mr-2" />{t.addCategory}</Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>{t.mainActivities}</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        {formData.principais_atividades.map((atividade, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input value={atividade} onChange={(e) => handleAtividadeChange(index, e.target.value)} placeholder={t.activityPlaceholder} />
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeAtividade(index)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" onClick={addAtividade}><Plus className="w-4 h-4 mr-2" /> {t.addActivity}</Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>{t.occurrences}</CardTitle></CardHeader>
                    <CardContent><Textarea value={formData.ocorrencias_observacoes} onChange={(e) => handleInputChange('ocorrencias_observacoes', e.target.value)} placeholder={t.occurrencesPlaceholder} rows={5} /></CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>{t.photos}</CardTitle></CardHeader>
                    <CardContent>
                        <Label htmlFor="photo-upload" className="mb-2 block">{t.addPhotos}</Label>
                        <Input id="photo-upload" type="file" multiple accept="image/*" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                        {uploadingPhoto && <div className="flex items-center gap-2 mt-2"><Loader2 className="w-4 h-4 animate-spin" /> {t.uploading}</div>}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            {formData.fotos.map((foto, index) => (
                                <div key={index} className="space-y-2">
                                    <img src={foto.url} alt={`Foto ${index}`} className="w-full h-32 object-cover rounded-lg" />
                                    <Input value={foto.legenda} onChange={(e) => handlePhotoLegendChange(index, e.target.value)} placeholder="Legenda" />
                                    <Button type="button" variant="destructive" size="sm" onClick={() => removePhoto(index)}>Remover</Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>{t.approvals}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {formData.vistos.map((visto, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-4 items-end gap-2 p-2 border rounded-lg">
                                <div className="space-y-1"><Label>{t.responsible}</Label><Input value={visto.responsavel} onChange={(e) => handleVistoChange(index, 'responsavel', e.target.value)} /></div>
                                <div className="space-y-1"><Label>{t.date}</Label><Input type="date" value={visto.data_visto} onChange={(e) => handleVistoChange(index, 'data_visto', e.target.value)} /></div>
                                <div className="space-y-1"><Label>{t.approverName}</Label><Input value={visto.nome_visto} onChange={(e) => handleVistoChange(index, 'nome_visto', e.target.value)} /></div>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeVisto(index)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" onClick={addVisto}><Plus className="w-4 h-4 mr-2" /> {t.addApproval}</Button>
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
