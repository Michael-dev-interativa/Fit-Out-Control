
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { RelatorioSemanal } from '@/api/entities/RelatorioSematorioSemanal';
import { Empreendimento } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Trash2, ArrowLeft, Percent, TrendingUp, Users, Edit, HelpCircle } from 'lucide-react';
import { UploadFile } from '@/api/integrations';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const translations = {
  pt: {
    title: "Editar Relatório Semanal",
    back: "Voltar",
    save: "Salvar Alterações",
    saving: "Salvando...",
    generalInfo: "Informações Gerais",
    reportNumber: "Nº do Relatório",
    fileName: "Nome do Arquivo (PDF)",
    weekStartDate: "Data Início da Semana",
    weekEndDate: "Data Fim da Semana",
    activities: "Atividades",
    executedActivities: "Principais Atividades da Semana",
    nextWeekActivities: "Atividades para Próxima Semana",
    addActivity: "Adicionar Atividade",
    criticalPath: "Caminho Crítico",
    addItem: "Adicionar Item",
    impediments: "Impedimentos / Problemas",
    physicalProgress: "Avanço Físico (%)", // This translation key is now unused for an input field but remains in translations.
    photos: "Registro Fotográfico",
    addPhotos: "Adicionar Fotos",
    uploading: "Enviando...",
    approvals: "Vistos", // This will become unused but kept in translations for now
    addApproval: "Adicionar Visto", // This will become unused
    responsible: "Responsável (Ex: Ger. Obra)", // This will become unused
    approverName: "Nome do Aprovador", // This will become unused
    evolution: "Evolução da Obra",
    physicalProgressTotal: "Físico Previsto Total (%)",
    physicalActualTotal: "Físico Real Total (%)",
    workforce: "Efetivo",
    physicalProgressAccumulated: "Avanço Físico | Acumulado",
    financialProgressAccumulated: "Avanço Financeiro - Desembolso | Acumulado",
    week: "Semana",
    planned: "Planejado (%)",
    actual: "Realizado (%)",
    addWeek: "Adicionar Semana",
    month: "Mês",
    addMonth: "Adicionar Mês",
    instructions: "Instruções",
    instructionsTitle: "Como Preencher o Relatório Semanal",
    instrGeneralInfo: "Preencha as informações básicas do relatório. O 'Nome do Arquivo' será usado para o PDF gerado.",
    instrEvolution: "Informe os percentuais de avanço da semana, o progresso total e o número de trabalhadores (efetivo.",
    instrPhysicalProgress: "Adicione uma linha para cada semana, registrando o avanço físico 'Planejado' e o 'Realizado' acumulados até aquela data.",
    instrFinancialProgress: "Similar ao avanço físico, mas para o desembolso financeiro, geralmente medido mensalmente.",
    instrActivities: "Detalhe as atividades executadas na semana e as planejadas para a próxima. Seja claro e objetivo nas descrições.",
    instrCriticalPath: "Liste os itens que estão no caminho crítico do projeto e suas informações relevantes.",
    instrImpediments: "Descreva quaisquer problemas ou impedimentos que impactaram ou podem impactar o andamento da obra.",
    instrPhotos: "Adicione fotos da semana com legendas para ilustrar o progresso e os pontos mencionados no relatório."
  },
};

export default function EditarRelatorioSemanal() {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [empreendimento, setEmpreendimento] = useState(null);
    const [formData, setFormData] = useState(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    
    const t = translations.pt;

    useEffect(() => {
        // Esta função agora só executa uma vez, na montagem do componente.
        const urlParams = new URLSearchParams(location.search);
        const relatorioId = urlParams.get('relatorioId');
        const empreendimentoId = urlParams.get('empreendimentoId');

        const loadInitialData = async () => {
            if (!relatorioId || !empreendimentoId) {
                toast.error("IDs do relatório ou empreendimento não encontrados.");
                navigate(-1);
                return;
            }
            try {
                const [relatorioData, empData] = await Promise.all([
                    RelatorioSemanal.get(relatorioId),
                    Empreendimento.get(empreendimentoId),
                ]);

                // Garante que as tabelas de atividades existam e inicializa novos campos se necessário
                const dataWithTables = {
                    ...relatorioData,
                    principais_atividades_semana: (relatorioData.principais_atividades_semana || []).map(item => ({
                        descricao: item.descricao || '',
                        data_inicio_previsto: item.data_inicio_previsto || '',
                        data_inicio_real: item.data_inicio_real || '',
                        data_termino_previsto: item.data_termino_previsto || '',
                        data_termino_real: item.data_termino_real || '',
                        status: item.status || 'Não Iniciado',
                        observacao: item.observacao || '',
                    })),
                    atividades_proxima_semana_tabela: (relatorioData.atividades_proxima_semana_tabela || []).map(item => ({
                        // Migrate old data_prevista and observacoes if they exist, otherwise initialize new fields
                        descricao: item.descricao || '',
                        data_inicio_previsto: item.data_inicio_previsto || item.data_prevista || '', // Use data_prevista if new field not present
                        data_inicio_real: item.data_inicio_real || '',
                        data_termino_previsto: item.data_termino_previsto || item.data_prevista || '', // Use data_prevista if new field not present
                        data_termino_real: item.data_termino_real || '',
                        status: item.status || 'Não Iniciado',
                        observacao: item.observacao || item.observacoes || '', // Use observacoes if new field not present
                    })),
                    caminho_critico: relatorioData.caminho_critico || [], // Initialize critical path
                };

                // Explicitly remove 'vistos' after ensuring other fields are set
                delete dataWithTables.vistos;
                // Explicitly remove avanco_fisico as it's being replaced by accumulated values
                delete dataWithTables.avanco_fisico;

                setFormData(dataWithTables);
                setEmpreendimento(empData);

            } catch(err) {
                console.error("Erro ao carregar dados:", err);
                toast.error("Falha ao carregar dados para edição.");
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []); // Array de dependências vazio para garantir que rode apenas uma vez.

    useEffect(() => {
        if (formData && formData.avanco_fisico_acumulado && formData.avanco_fisico_acumulado.length > 0) {
            const sortedWeeks = [...formData.avanco_fisico_acumulado]
                .filter(item => item.semana) // Only consider entries with a valid date string
                .sort((a, b) => new Date(b.semana) - new Date(a.semana)); // Sort in descending order to get the latest week first
            
            if (sortedWeeks.length > 0) {
                const latestWeek = sortedWeeks[0];
                // Ensure values are numbers or empty strings for consistency
                handleInputChange('fisico_previsto_total', latestWeek.planejado !== undefined && latestWeek.planejado !== null ? latestWeek.planejado : '');
                handleInputChange('fisico_real_total', latestWeek.realizado !== undefined && latestWeek.realizado !== null ? latestWeek.realizado : '');
            } else {
                handleInputChange('fisico_previsto_total', '');
                handleInputChange('fisico_real_total', '');
            }
        } else if (formData) {
            handleInputChange('fisico_previsto_total', '');
            handleInputChange('fisico_real_total', '');
        }
    }, [formData?.avanco_fisico_acumulado]);

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        // Append T00:00:00 to treat the date string as local time for parsing,
        // which helps in cases where the string is just "YYYY-MM-DD" and new Date()
        // might otherwise interpret it in UTC, potentially shifting the day based on local timezone.
        return format(new Date(`${dateString}T00:00:00`), 'dd/MM/yyyy', { locale: ptBR });
    };

    if (!formData && !loading) {
         toast.error("Dados do relatório não encontrados.");
         navigate(-1);
         return null;
    }

    const handleInputChange = (field, value) => setFormData(p => ({ ...p, [field]: value }));

    const handleTableChange = (table, index, field, value) => {
        const newTableData = [...(formData[table] || [])];
        newTableData[index][field] = value;
        handleInputChange(table, newTableData);
    };

    const addTableRow = (table) => {
        let newRow;
        if (table === 'avanco_fisico_acumulado') {
            newRow = { semana: '', planejado: '', realizado: '' };
        } else if (table === 'avanco_financeiro_acumulado') {
            newRow = { mes: '', planejado: '', realizado: '' };
        } else if (table === 'principais_atividades_semana' || table === 'atividades_proxima_semana_tabela') {
            newRow = { descricao: '', data_inicio_previsto: '', data_inicio_real: '', data_termino_previsto: '', data_termino_real: '', status: 'Não Iniciado', observacao: '' };
        } else if (table === 'caminho_critico') {
            newRow = { item: '', info1: '', info2: '', info3: '' };
        }
        handleInputChange(table, [...(formData[table] || []), newRow]);
    };

    const removeTableRow = (table, index) => {
        const newTableData = formData[table].filter((_, i) => i !== index);
        handleInputChange(table, newTableData);
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
            handleInputChange('fotos', [...(formData.fotos || []), ...uploadedPhotos]);
        } catch (err) {
            toast.error("Falha no upload da foto.");
            console.error(err);
        } finally {
            setUploadingPhoto(false);
        }
    };
    
    const handlePhotoLegendChange = (index, value) => {
        const newFotos = [...(formData.fotos || [])];
        newFotos[index].legenda = value;
        handleInputChange('fotos', newFotos);
    };
    
    const removePhoto = (index) => {
        const newFotos = formData.fotos.filter((_, i) => i !== index);
        handleInputChange('fotos', newFotos);
    };

    // Functions related to 'vistos' are removed:
    // handleVistoChange, addVisto, removeVisto

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        const urlParams = new URLSearchParams(location.search);
        const relatorioId = urlParams.get('relatorioId'); // Ensure relatorioId is current for submission

        try {
            const finalData = { 
              ...formData,
              numero_relatorio: formData.numero_relatorio ? parseInt(formData.numero_relatorio, 10) : null,
              // Removed avanco_fisico as it is now determined by fisico_real_total
              fisico_previsto_total: formData.fisico_previsto_total ? parseFloat(formData.fisico_previsto_total) : null,
              fisico_real_total: formData.fisico_real_total ? parseFloat(formData.fisico_real_total) : null,
              efetivo: formData.efetivo ? parseInt(formData.efetivo, 10) : null,
              avanco_fisico_acumulado: (formData.avanco_fisico_acumulado || []).map(item => ({
                  ...item,
                  planejado: item.planejado ? parseFloat(item.planejado) : null,
                  realizado: item.realizado ? parseFloat(item.realizado) : null,
              })),
              avanco_financeiro_acumulado: (formData.avanco_financeiro_acumulado || []).map(item => ({
                  ...item,
                  planejado: item.planejado ? parseFloat(item.planejado) : null,
                  realizado: item.realizado ? parseFloat(item.realizado) : null,
              })),
            };
            
            await RelatorioSemanal.update(relatorioId, finalData);
            toast.success("Relatório Semanal atualizado com sucesso!");
            navigate(createPageUrl(`EmpreendimentoRelatoriosSemanais?empreendimentoId=${empreendimentoId}`));
        } catch (error) {
            console.error("Erro ao atualizar relatório:", error);
            toast.error("Falha ao atualizar o relatório semanal.");
        } finally {
            setSaving(false);
        }
    };
    
    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    // Since empreendimentoId is obtained in useEffect, and used in navigation for back/edit,
    // ensure it's available or gracefully handle its absence.
    // We already have a check for !formData and !loading, which implies relatorioId and empreendimentoId were found.
    const urlParams = new URLSearchParams(location.search);
    const empreendimentoId = urlParams.get('empreendimentoId');


    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold">{t.title}</h1>
                    <p className="text-gray-500">{empreendimento?.nome_empreendimento}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <HelpCircle className="w-4 h-4 mr-2" />
                                {t.instructions}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>{t.instructionsTitle}</DialogTitle>
                                <DialogDescription as="div" className="prose prose-sm max-w-none pt-4 text-gray-600">
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>Preencher todos os itens da aba "Acompanhamento Mensal".</li>
                                        <li>As informações serão reportadas diretamente para a aba resumo.</li>
                                    </ul>

                                    <h4 className="font-bold mt-4">Cabeçalho</h4>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li><b>Início da Obra:</b> Preencher a data de início da Ordem de Serviço.</li>
                                        <li><b>Término da Obra:</b> Preencher a data de previsão de entrega da obra.</li>
                                        <li><b>Término Contratual:</b> Preencher a data de término da Ordem de Serviço.</li>
                                        {/* Removed redundant instruction for 'Concluído' field */}
                                        <li><b>Efetivo:</b> Número de funcionários.</li>
                                    </ul>

                                    <h4 className="font-bold mt-4">Avanço Físico | Acumulado</h4>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li><b>Semana:</b> Incluir a data de envio do primeiro relatório.</li>
                                        <li><b>Planejado:</b> Incluir o avanço físico planejado (%).</li>
                                        <li><b>Realizado:</b> Incluir o avanço físico realizado (%).</li>
                                    </ul>

                                    <h4 className="font-bold mt-4">Principais atividades da semana</h4>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>Descrever principais tarefas da semana, data de execução, status da execução e observações se necessário.</li>
                                    </ul>
                                    
                                    <h4 className="font-bold mt-4">Principais atividades da próxima semana</h4>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>Descrever principais tarefas da semana, data de execução e observações se necessário.</li>
                                    </ul>

                                    <h4 className="font-bold mt-4">ABA "RESUMO"</h4>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>As imagens e legenda do relatório fotográfico devem ser inseridas na aba resumo.</li>
                                    </ul>

                                    <h4 className="font-bold mt-4">ENVIO DAS INFORMAÇÕES</h4>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>O relatório deve ser enviado toda segunda-feira via e-mail conforme formato abaixo.</li>
                                    </ul>
                                </DialogDescription>
                            </DialogHeader>
                        </DialogContent>
                    </Dialog>
                    <Button variant="outline" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-4 h-4 mr-2"/>
                        {t.back}
                    </Button>
                </div>
            </div>
            
            {empreendimento && (
                <Card className="mb-6">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Resumo do Empreendimento</CardTitle>
                         <Button variant="outline" size="icon" title="Editar Empreendimento" onClick={() => navigate(createPageUrl(`EditarEmpreendimento?empreendimentoId=${empreendimentoId}`))}>
                            <Edit className="w-4 h-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                         <table className="w-full border-collapse">
                            <tbody>
                                <tr className="border">
                                    <td className="font-bold border p-1 w-1/4">Empresa Contratada:</td>
                                    <td className="border p-1 w-3/4" colSpan="3">INTERATIVA ENGENHARIA</td>
                                </tr>
                                <tr className="border">
                                    <td className="font-bold border p-1">Escopo:</td>
                                    <td className="border p-1" colSpan="3">{empreendimento.nome_empreendimento} | {empreendimento.cli_empreendimento}</td>
                                </tr>
                                 <tr className="border">
                                    <td className="font-bold border p-1">Valor Contratual:</td>
                                    <td className="border p-1" colSpan="3">{empreendimento.valor_contratual || '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                        <table className="w-full border-collapse mt-2 text-center">
                             <thead>
                                <tr className="border bg-gray-200 font-bold">
                                    <td className="border p-1">Início Obra</td>
                                    <td className="border p-1">Término Obra Previsto</td>
                                    <td className="border p-1">Data Sem Entrega</td>
                                    <td className="border p-1">Término Contratual</td>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border">
                                    <td className="border p-1">{formatDate(empreendimento.data_inicio_contrato)}</td>
                                    <td className="border p-1">{formatDate(empreendimento.termino_obra_previsto)}</td>
                                    <td className="border p-1">{formatDate(empreendimento.data_sem_entrega)}</td>
                                    <td className="border p-1">{formatDate(empreendimento.data_termino_contrato)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>{t.generalInfo}</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="numero_relatorio">{t.reportNumber}</Label>
                            <Input id="numero_relatorio" type="number" value={formData.numero_relatorio || ''} onChange={(e) => handleInputChange('numero_relatorio', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="nome_arquivo">{t.fileName}</Label>
                            <Input id="nome_arquivo" value={formData.nome_arquivo || ''} onChange={(e) => handleInputChange('nome_arquivo', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="data_inicio_semana">{t.weekStartDate}</Label>
                            <Input id="data_inicio_semana" type="date" value={formData.data_inicio_semana || ''} onChange={(e) => handleInputChange('data_inicio_semana', e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="data_fim_semana">{t.weekEndDate}</Label>
                            <Input id="data_fim_semana" type="date" value={formData.data_fim_semana || ''} onChange={(e) => handleInputChange('data_fim_semana', e.target.value)} required />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp /> {t.evolution}</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* Adjusted from lg:grid-cols-4 to md:grid-cols-3 */}
                            {/* Removed the 'avanco_fisico' input field */}
                            <div className="space-y-2">
                                <Label htmlFor="fisico_previsto_total">{t.physicalProgressTotal}</Label>
                                <div className="relative"><Input id="fisico_previsto_total" type="number" step="0.01" value={formData.fisico_previsto_total || ''} readOnly className="pl-8 bg-gray-100"/><Percent className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" /></div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fisico_real_total">{t.physicalActualTotal}</Label>
                                <div className="relative"><Input id="fisico_real_total" type="number" step="0.01" value={formData.fisico_real_total || ''} readOnly className="pl-8 bg-gray-100"/><Percent className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" /></div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="efetivo">{t.workforce}</Label>
                                <div className="relative"><Input id="efetivo" type="number" value={formData.efetivo || ''} onChange={(e) => handleInputChange('efetivo', e.target.value)} className="pl-8"/><Users className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" /></div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-2">{t.physicalProgressAccumulated}</h4>
                            <div className="space-y-2">
                                {(formData.avanco_fisico_acumulado || []).map((item, index) => (
                                    <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr,1fr,1fr,auto] gap-2 items-end">
                                        <div><Label>{t.week}</Label><Input type="date" value={item.semana || ''} onChange={(e) => handleTableChange('avanco_fisico_acumulado', index, 'semana', e.target.value)} /></div>
                                        <div><Label>{t.planned}</Label><Input type="number" step="0.01" value={item.planejado || ''} onChange={(e) => handleTableChange('avanco_fisico_acumulado', index, 'planejado', e.target.value)} /></div>
                                        <div><Label>{t.actual}</Label><Input type="number" step="0.01" value={item.realizado || ''} onChange={(e) => handleTableChange('avanco_fisico_acumulado', index, 'realizado', e.target.value)} /></div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeTableRow('avanco_fisico_acumulado', index)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                    </div>
                                ))}
                            </div>
                            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => addTableRow('avanco_fisico_acumulado')}><Plus className="w-4 h-4 mr-2" />{t.addWeek}</Button>
                        </div>
                        
                        <div>
                            <h4 className="font-semibold mb-2">{t.financialProgressAccumulated}</h4>
                             <div className="space-y-2">
                                {(formData.avanco_financeiro_acumulado || []).map((item, index) => (
                                    <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr,1fr,1fr,auto] gap-2 items-end">
                                        <div><Label>{t.month}</Label><Input value={item.mes || ''} onChange={(e) => handleTableChange('avanco_financeiro_acumulado', index, 'mes', e.target.value)} /></div>
                                        <div><Label>{t.planned}</Label><Input type="number" step="0.01" value={item.planejado || ''} onChange={(e) => handleTableChange('avanco_financeiro_acumulado', index, 'planejado', e.target.value)} /></div>
                                        <div><Label>{t.actual}</Label><Input type="number" step="0.01" value={item.realizado || ''} onChange={(e) => handleTableChange('avanco_financeiro_acumulado', index, 'realizado', e.target.value)} /></div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeTableRow('avanco_financeiro_acumulado', index)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                    </div>
                                ))}
                            </div>
                            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => addTableRow('avanco_financeiro_acumulado')}><Plus className="w-4 h-4 mr-2" />{t.addMonth}</Button>
                        </div>

                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>{t.activities}</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        {/* Tabela de Principais Atividades da Semana */}
                        <div>
                            <h4 className="font-semibold mb-2">{t.executedActivities}</h4>
                            <div className="space-y-4">
                                {(formData.principais_atividades_semana || []).map((item, index) => (
                                    <div key={index} className="p-4 border rounded-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative">
                                        <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => removeTableRow('principais_atividades_semana', index)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                        <div className="col-span-full"><Label>Descrição</Label><Input value={item.descricao || ''} onChange={(e) => handleTableChange('principais_atividades_semana', index, 'descricao', e.target.value)} /></div>
                                        <div><Label>Início Previsto</Label><Input type="date" value={item.data_inicio_previsto || ''} onChange={(e) => handleTableChange('principais_atividades_semana', index, 'data_inicio_previsto', e.target.value)} /></div>
                                        <div><Label>Início Real</Label><Input type="date" value={item.data_inicio_real || ''} onChange={(e) => handleTableChange('principais_atividades_semana', index, 'data_inicio_real', e.target.value)} /></div>
                                        <div><Label>Término Previsto</Label><Input type="date" value={item.data_termino_previsto || ''} onChange={(e) => handleTableChange('principais_atividades_semana', index, 'data_termino_previsto', e.target.value)} /></div>
                                        <div><Label>Término Real</Label><Input type="date" value={item.data_termino_real || ''} onChange={(e) => handleTableChange('principais_atividades_semana', index, 'data_termino_real', e.target.value)} /></div>
                                        <div className="col-span-1"><Label>Status</Label>
                                            <Select value={item.status || 'Não Iniciado'} onValueChange={(value) => handleTableChange('principais_atividades_semana', index, 'status', value)}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Não Iniciado">Não Iniciado</SelectItem>
                                                    <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                                                    <SelectItem value="Concluído">Concluído</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-full"><Label>Observação</Label><Input value={item.observacao || ''} onChange={(e) => handleTableChange('principais_atividades_semana', index, 'observacao', e.target.value)} /></div>
                                    </div>
                                ))}
                            </div>
                            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => addTableRow('principais_atividades_semana')}><Plus className="w-4 h-4 mr-2" />{t.addActivity}</Button>
                        </div>
                        
                        {/* Tabela de Atividades para Próxima Semana */}
                        <div>
                            <h4 className="font-semibold mb-2">{t.nextWeekActivities}</h4>
                            <div className="space-y-4">
                                {(formData.atividades_proxima_semana_tabela || []).map((item, index) => (
                                    <div key={index} className="p-4 border rounded-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative">
                                        <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => removeTableRow('atividades_proxima_semana_tabela', index)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                        <div className="col-span-full"><Label>Descrição</Label><Input value={item.descricao || ''} onChange={(e) => handleTableChange('atividades_proxima_semana_tabela', index, 'descricao', e.target.value)} /></div>
                                        <div><Label>Início Previsto</Label><Input type="date" value={item.data_inicio_previsto || ''} onChange={(e) => handleTableChange('atividades_proxima_semana_tabela', index, 'data_inicio_previsto', e.target.value)} /></div>
                                        <div><Label>Início Real</Label><Input type="date" value={item.data_inicio_real || ''} onChange={(e) => handleTableChange('atividades_proxima_semana_tabela', index, 'data_inicio_real', e.target.value)} /></div>
                                        <div><Label>Término Previsto</Label><Input type="date" value={item.data_termino_previsto || ''} onChange={(e) => handleTableChange('atividades_proxima_semana_tabela', index, 'data_termino_previsto', e.target.value)} /></div>
                                        <div><Label>Término Real</Label><Input type="date" value={item.data_termino_real || ''} onChange={(e) => handleTableChange('atividades_proxima_semana_tabela', index, 'data_termino_real', e.target.value)} /></div>
                                        <div className="col-span-1"><Label>Status</Label>
                                            <Select value={item.status || 'Não Iniciado'} onValueChange={(value) => handleTableChange('atividades_proxima_semana_tabela', index, 'status', value)}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Não Iniciado">Não Iniciado</SelectItem>
                                                    <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                                                    <SelectItem value="Concluído">Concluído</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-full"><Label>Observação</Label><Input value={item.observacao || ''} onChange={(e) => handleTableChange('atividades_proxima_semana_tabela', index, 'observacao', e.target.value)} /></div>
                                    </div>
                                ))}
                            </div>
                             <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => addTableRow('atividades_proxima_semana_tabela')}><Plus className="w-4 h-4 mr-2" />{t.addActivity}</Button>
                        </div>
                        
                        {/* Tabela de Caminho Crítico */}
                        <div>
                            <h4 className="font-semibold mb-2">{t.criticalPath}</h4>
                            <div className="space-y-2">
                                {(formData.caminho_critico || []).map((item, index) => (
                                    <div key={index} className="grid grid-cols-1 md:grid-cols-[2fr,1fr,1fr,1fr,auto] gap-2 items-end">
                                        <div><Label>Item</Label><Input value={item.item || ''} onChange={(e) => handleTableChange('caminho_critico', index, 'item', e.target.value)} /></div>
                                        <div><Label>Info 1</Label><Input value={item.info1 || ''} onChange={(e) => handleTableChange('caminho_critico', index, 'info1', e.target.value)} /></div>
                                        <div><Label>Info 2</Label><Input value={item.info2 || ''} onChange={(e) => handleTableChange('caminho_critico', index, 'info2', e.target.value)} /></div>
                                        <div><Label>Info 3</Label><Input value={item.info3 || ''} onChange={(e) => handleTableChange('caminho_critico', index, 'info3', e.target.value)} /></div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeTableRow('caminho_critico', index)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                    </div>
                                ))}
                            </div>
                            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => addTableRow('caminho_critico')}><Plus className="w-4 h-4 mr-2" />{t.addItem}</Button>
                        </div>

                         <div className="space-y-2">
                            <Label htmlFor="impedimentos">{t.impediments}</Label>
                            <Textarea id="impedimentos" value={formData.impedimentos || ''} onChange={(e) => handleInputChange('impedimentos', e.target.value)} rows={3}/>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>{t.photos}</CardTitle></CardHeader>
                    <CardContent>
                        <Label htmlFor="photo-upload" className="mb-2 block">{t.addPhotos}</Label>
                        <Input id="photo-upload" type="file" multiple accept="image/*" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                        {uploadingPhoto && <div className="flex items-center gap-2 mt-2"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t.uploading}</div>}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            {(formData.fotos || []).map((foto, index) => (
                                <div key={index} className="space-y-2">
                                    <img src={foto.url} alt={`Foto ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
                                    <Input value={foto.legenda} onChange={(e) => handlePhotoLegendChange(index, e.target.value)} placeholder="Legenda" />
                                    <Button type="button" variant="destructive" size="sm" onClick={() => removePhoto(index)}>Remover</Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                
                {/* The 'Vistos' card component is removed from here */}
                
                <div className="flex justify-end gap-4">
                    <Button type="submit" disabled={saving}>
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> {t.saving}</> : t.save}
                    </Button>
                </div>
            </form>
        </div>
    );
}
