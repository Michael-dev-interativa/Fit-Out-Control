
import React, { useState, useEffect, useCallback } from "react";
import { Atividade } from "@/api/entities";
import { Empreendimento } from "@/api/entities";
import { UnidadeEmpreendimento } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, ListChecks, Clock, Repeat, Loader2, Building2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils"; // Import cn utility

const translations = {
  pt: {
    title: "Atividades Padrão",
    subtitle: "Cadastre e gerencie atividades recorrentes para agilizar o planejamento.",
    add: "Adicionar Atividade",
    edit: "Editar Atividade",
    delete: "Excluir Atividade",
    function: "Função",
    functionPlaceholder: "Ex: Administrador, Engenheiro",
    description: "Descrição da Atividade",
    descriptionPlaceholder: "Ex: Leitura e resposta de emails",
    recurrence: "Recorrência",
    frequency: "Frequência",
    frequencyPlaceholder: "Ex: Segundas e Quartas, Todo dia 15",
    estimatedTime: "Tempo Estimado (horas)",
    timePlaceholder: "Ex: 2.5",
    save: "Salvar",
    cancel: "Cancelar",
    saving: "Salvando...",
    deleting: "Excluindo...",
    confirmDelete: "Confirmar Exclusão",
    deleteMessage: "Tem certeza que deseja excluir esta atividade padrão? Esta ação não pode ser desfeita.",
    noRecords: "Nenhuma atividade padrão encontrada",
    loading: "Carregando atividades...",
    addFirst: "Adicione a primeira atividade padrão",
    selectedDates: "datas selecionadas",
    selectDates: "Selecione as datas",
    relatedProject: "Empreendimento Relacionado",
    selectProject: "Selecione o empreendimento (opcional)",
    relatedUnit: "Unidade Relacionada",
    selectUnit: "Selecione a unidade (opcional)",
    noProject: "Nenhum",
    noUnit: "Nenhuma"
  },
  en: {
    title: "Standard Activities",
    subtitle: "Register and manage recurring activities to streamline planning.",
    add: "Add Activity",
    edit: "Edit Activity",
    delete: "Delete Activity",
    function: "Function",
    functionPlaceholder: "Ex: Administrator, Engineer",
    description: "Activity Description",
    descriptionPlaceholder: "Ex: Read and reply to emails",
    recurrence: "Recurrence",
    frequency: "Frequency",
    frequencyPlaceholder: "Ex: Mondays and Wednesdays, Every 15th",
    estimatedTime: "Estimated Time (hours)",
    timePlaceholder: "Ex: 2.5",
    save: "Save",
    cancel: "Cancel",
    saving: "Saving...",
    deleting: "Deleting...",
    confirmDelete: "Confirm Deletion",
    deleteMessage: "Are you sure you want to delete this standard activity? This action cannot be undone.",
    noRecords: "No standard activities found",
    loading: "Loading activities...",
    addFirst: "Add the first standard activity",
    selectedDates: "dates selected",
    selectDates: "Select dates",
    relatedProject: "Related Project",
    selectProject: "Select project (optional)",
    relatedUnit: "Related Unit",
    selectUnit: "Select unit (optional)",
    noProject: "None",
    noUnit: "None"
  }
};

const diasDaSemana = [
    { pt: "Domingo", en: "Sunday" },
    { pt: "Segunda", en: "Monday" },
    { pt: "Terça", en: "Tuesday" },
    { pt: "Quarta", en: "Wednesday" },
    { pt: "Quinta", en: "Thursday" },
    { pt: "Sexta", en: "Friday" },
    { pt: "Sábado", en: "Saturday" },
];

export default function AtividadesPadrao({ language: initialLanguage, theme: initialTheme }) {
  const [atividades, setAtividades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [formData, setFormData] = useState({
    funcao: "",
    descricao_atividade: "",
    recorrencia: "Única",
    frequencia_dias_semana: [],
    tempo_estimado_horas: "",
    id_empreendimento: "",
    id_unidade: "",
  });
  
  const [language, setLanguage] = useState(initialLanguage || 'pt');
  const [theme, setTheme] = useState(initialTheme || 'light');

  const t = translations[language];
  const isDark = theme === 'dark';

  useEffect(() => {
    const handleLanguageChange = () => setLanguage(localStorage.getItem('language') || 'pt');
    const handleThemeChange = () => setTheme(localStorage.getItem('theme') || 'light');
    window.addEventListener('language-change', handleLanguageChange);
    window.addEventListener('theme-change', handleThemeChange);
    handleLanguageChange();
    handleThemeChange();
    return () => {
      window.removeEventListener('language-change', handleLanguageChange);
      window.removeEventListener('theme-change', handleThemeChange);
    };
  }, []);

  useEffect(() => {
    loadAtividades();
    loadEmpreendimentos();
  }, []);

  const loadEmpreendimentos = async () => {
    try {
      const data = await Empreendimento.list("-created_date");
      setEmpreendimentos(data);
    } catch (error) {
      console.error("Erro ao carregar empreendimentos:", error);
    }
  };

  const loadUnidades = useCallback(async (empreendimentoId) => {
    if (!empreendimentoId) {
      setUnidades([]);
      handleInputChange('id_unidade', '');
      return;
    }
    try {
      const unidadesData = await UnidadeEmpreendimento.filter({ id_empreendimento: empreendimentoId });
      setUnidades(unidadesData);
    } catch (error) {
      console.error("Erro ao carregar unidades:", error);
      setUnidades([]);
    }
  }, []);

  const loadAtividades = async () => {
    setLoading(true);
    try {
      const data = await Atividade.list();
      setAtividades(data);
    } catch (error) {
      console.error("Erro ao carregar atividades:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'recorrencia' && value !== 'Semanal') {
        setFormData(prev => ({ ...prev, frequencia_dias_semana: [] }));
    }
  };

  const handleDayToggle = (day) => {
    setFormData(prev => {
        const newDays = prev.frequencia_dias_semana.includes(day)
            ? prev.frequencia_dias_semana.filter(d => d !== day)
            : [...prev.frequencia_dias_semana, day];
        return { ...prev, frequencia_dias_semana: newDays };
    });
  };

  const handleProjectChange = (empreendimentoId) => {
    handleInputChange('id_empreendimento', empreendimentoId);
    loadUnidades(empreendimentoId);
  };

  const resetForm = () => {
    setFormData({
      funcao: "",
      descricao_atividade: "",
      recorrencia: "Única",
      frequencia_dias_semana: [],
      tempo_estimado_horas: "",
      id_empreendimento: "",
      id_unidade: "",
    });
    setUnidades([]); // Clear units when resetting form
    setEditingRecord(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (record) => {
    let frequencia_dias_semana = [];
    try {
        if (record.recorrencia === 'Semanal' && record.frequencia) {
            const parsedDays = JSON.parse(record.frequencia);
            if (Array.isArray(parsedDays)) {
                frequencia_dias_semana = parsedDays;
            }
        }
    } catch (e) {
        console.warn("Could not parse frequencia days:", record.frequencia, e);
    }

    setFormData({
      funcao: record.funcao || "",
      descricao_atividade: record.descricao_atividade || "",
      recorrencia: record.recorrencia || "Única",
      frequencia_dias_semana: frequencia_dias_semana,
      tempo_estimado_horas: record.tempo_estimado_horas || "",
      id_empreendimento: record.id_empreendimento || "",
      id_unidade: record.id_unidade || "",
    });

    if (record.id_empreendimento) {
        loadUnidades(record.id_empreendimento);
    } else {
      setUnidades([]);
    }

    setEditingRecord(record);
    setShowDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.funcao || !formData.descricao_atividade || !formData.tempo_estimado_horas) return;

    setSaving(true);
    try {
      const selectedEmpreendimento = empreendimentos.find(emp => emp.id === formData.id_empreendimento);
      const selectedUnidade = unidades.find(uni => uni.id === formData.id_unidade);
      
      const dataToSave = {
        funcao: formData.funcao,
        descricao_atividade: formData.descricao_atividade,
        recorrencia: formData.recorrencia,
        frequencia: formData.recorrencia === 'Semanal' ? JSON.stringify(formData.frequencia_dias_semana) : '',
        tempo_estimado_horas: parseFloat(formData.tempo_estimado_horas),
        id_empreendimento: formData.id_empreendimento || null,
        nome_empreendimento: selectedEmpreendimento?.nome_empreendimento || '',
        id_unidade: formData.id_unidade || null,
        nome_unidade: selectedUnidade?.unidade_empreendimento || '',
      };
      if (editingRecord) {
        await Atividade.update(editingRecord.id, dataToSave);
      } else {
        await Atividade.create(dataToSave);
      }
      await loadAtividades();
      setShowDialog(false);
      resetForm();
    } catch (error) {
      console.error("Erro ao salvar atividade:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await Atividade.delete(id);
      await loadAtividades();
    } catch (error) {
      console.error("Erro ao excluir atividade:", error);
    }
  };

  return (
    <div className={`p-6 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.title}</h1>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>{t.subtitle}</p>
            </div>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogTrigger asChild>
                  <Button onClick={openCreateDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t.add}
                  </Button>
                </DialogTrigger>
                <DialogContent className={isDark ? 'bg-gray-800' : ''}>
                  <DialogHeader>
                    <DialogTitle className={isDark ? 'text-white' : ''}>{editingRecord ? t.edit : t.add}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="funcao" className={isDark ? 'text-gray-300' : ''}>{t.function}</Label>
                      <Input id="funcao" value={formData.funcao} onChange={(e) => handleInputChange('funcao', e.target.value)} placeholder={t.functionPlaceholder} required className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="descricao" className={isDark ? 'text-gray-300' : ''}>{t.description}</Label>
                      <Textarea id="descricao" value={formData.descricao_atividade} onChange={(e) => handleInputChange('descricao_atividade', e.target.value)} placeholder={t.descriptionPlaceholder} required className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="relatedProject" className={isDark ? 'text-gray-300' : ''}>{t.relatedProject}</Label>
                            <Select value={formData.id_empreendimento} onValueChange={handleProjectChange}>
                                <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}><SelectValue placeholder={t.selectProject} /></SelectTrigger>
                                <SelectContent className={isDark ? 'bg-gray-800 text-white border-gray-700' : ''}>
                                    <SelectItem value={null}>{t.noProject}</SelectItem>
                                    {empreendimentos.map(emp => (
                                        <SelectItem key={emp.id} value={emp.id}>{emp.nome_empreendimento}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="relatedUnit" className={isDark ? 'text-gray-300' : ''}>{t.relatedUnit}</Label>
                            <Select value={formData.id_unidade} onValueChange={(v) => handleInputChange("id_unidade", v)} disabled={!formData.id_empreendimento || unidades.length === 0}>
                                <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}><SelectValue placeholder={t.selectUnit} /></SelectTrigger>
                                <SelectContent className={isDark ? 'bg-gray-800 text-white border-gray-700' : ''}>
                                    <SelectItem value={null}>{t.noUnit}</SelectItem>
                                    {unidades.map(unidade => (
                                        <SelectItem key={unidade.id} value={unidade.id}>{unidade.unidade_empreendimento}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                      <div className="space-y-2">
                        <Label htmlFor="recorrencia" className={isDark ? 'text-gray-300' : ''}>{t.recurrence}</Label>
                        <Select value={formData.recorrencia} onValueChange={(v) => handleInputChange('recorrencia', v)}>
                          <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}><SelectValue /></SelectTrigger>
                          <SelectContent className={isDark ? 'bg-gray-800 text-white border-gray-700' : ''}>
                            <SelectItem value="Única">Única</SelectItem>
                            <SelectItem value="Diária">Diária</SelectItem>
                            <SelectItem value="Semanal">Semanal</SelectItem>
                            <SelectItem value="Mensal">Mensal</SelectItem>
                            <SelectItem value="Anual">Anual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                       {formData.recorrencia === 'Semanal' && (
                        <div className="space-y-2">
                            <Label htmlFor="frequencia" className={isDark ? 'text-gray-300' : ''}>{t.frequency}</Label>
                            <div className="flex flex-wrap gap-2">
                                {diasDaSemana.map(dia => (
                                    <Button
                                        key={dia.en}
                                        type="button"
                                        variant={formData.frequencia_dias_semana.includes(dia.pt) ? "default" : "outline"}
                                        onClick={() => handleDayToggle(dia.pt)}
                                        className="flex-1 min-w-[40px] px-2 text-xs"
                                    >
                                        {dia.pt.substring(0, 3)}
                                    </Button>
                                ))}
                            </div>
                        </div>
                       )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tempo_estimado" className={isDark ? 'text-gray-300' : ''}>{t.estimatedTime}</Label>
                      <Input id="tempo_estimado" type="number" step="0.1" value={formData.tempo_estimado_horas} onChange={(e) => handleInputChange('tempo_estimado_horas', e.target.value)} placeholder={t.timePlaceholder} required className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''} />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className={isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : ''}>{t.cancel}</Button>
                      <Button type="submit" disabled={saving}>{saving ? t.saving : t.save}</Button>
                    </div>
                  </form>
                </DialogContent>
            </Dialog>
        </div>
        <Card className={isDark ? 'bg-gray-800' : ''}>
          <CardContent className="p-6">
            {loading ? (
                <div className="flex justify-center items-center h-48">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600"/>
                </div>
            ) : atividades.length === 0 ? (
              <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t.noRecords}</p>
            ) : (
              <div className="space-y-3">
                {atividades.map(item => (
                  <div key={item.id} className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className={`font-semibold ${isDark ? 'text-white' : ''}`}>{item.descricao_atividade}</p>
                        <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500 mt-2">
                          <span className="flex items-center gap-1"><ListChecks className="w-4 h-4"/>{item.funcao}</span>
                          <span className="flex items-center gap-1"><Repeat className="w-4 h-4"/>
                            {(() => {
                              if (item.recorrencia !== 'Semanal' || !item.frequencia) {
                                return item.recorrencia;
                              }
                              try {
                                const days = JSON.parse(item.frequencia);
                                if (Array.isArray(days)) {
                                  return days.map(d => d.substring(0, 3)).join(', ');
                                }
                              } catch (e) {
                                // Se não for um JSON válido, apenas mostra o texto antigo
                                console.warn("Erro ao parsear frequencia:", e);
                                return item.frequencia;
                              }
                              return item.recorrencia; // Fallback se 'frequencia' não for um array após o parse
                            })()}
                          </span>
                          <span className="flex items-center gap-1"><Clock className="w-4 h-4"/>{item.tempo_estimado_horas}h</span>
                          {item.nome_empreendimento && (
                            <span className="flex items-center gap-1"><Building2 className="w-4 h-4"/>{item.nome_empreendimento}</span>
                          )}
                           {item.nome_unidade && (
                            <span className="flex items-center gap-1 text-xs">{item.nome_unidade}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}><Edit className="w-4 h-4"/></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-red-500"/></Button></AlertDialogTrigger>
                          <AlertDialogContent className={isDark ? 'bg-gray-800 text-white border-gray-700' : ''}>
                            <AlertDialogHeader><AlertDialogTitle className={isDark ? 'text-white' : ''}>{t.confirmDelete}</AlertDialogTitle><AlertDialogDescription className={isDark ? 'text-gray-400' : ''}>{t.deleteMessage}</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className={isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : ''}>{t.cancel}</AlertDialogCancel>
                              <AlertDialogAction className={isDark ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-500 text-white hover:bg-red-600'} onClick={() => handleDelete(item.id)}>{t.delete}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
