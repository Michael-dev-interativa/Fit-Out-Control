
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AtividadePlanejamento } from "@/api/entities";
import { User } from "@/api/entities";
import { Empreendimento } from "@/api/entities"; // Kept for consistency if needed elsewhere, though not used here
import { UnidadeEmpreendimento } from "@/api/entities"; // Kept for consistency if needed elsewhere, though not used here
import { Atividade } from "@/api/entities"; // Importar a entidade de atividades padrão/template
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Users, Target, AlertTriangle, ListChecks } from "lucide-react"; // Renamed Calendar to CalendarIcon to avoid conflict
import { Calendar } from "@/components/ui/calendar"; // Actual Calendar component
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Popover for date picker
import { format, addDays, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Switch } from "@/components/ui/switch";

const translations = {
  pt: {
    title: "Planejar Atividade(s)",
    activityTitle: "Título da Atividade",
    activityTitlePlaceholder: "Ex: Realizar vistoria do 7º andar",
    description: "Descrição",
    descriptionPlaceholder: "Descreva os detalhes da atividade...",
    responsible: "Responsável",
    userRole: "Função",
    selectRole: "Selecione a função",
    user: "Usuário",
    selectUser: "Selecione o usuário",
    startDate: "Data de Início do Planejamento",
    dueDate: "Data de Prazo",
    priority: "Prioridade",
    selectPriority: "Selecione a prioridade",
    activityType: "Tipo de Atividade",
    selectActivityType: "Selecione o tipo",
    relatedProject: "Empreendimento Relacionado",
    selectProject: "Selecione o empreendimento (opcional)",
    relatedUnit: "Unidade Relacionada",
    selectUnit: "Selecione a unidade (opcional)",
    estimatedHours: "Horas Estimadas",
    observations: "Observações",
    observationsPlaceholder: "Informações adicionais...",
    cancel: "Cancelar",
    create: "Planejar Atividades",
    creating: "Planejando...",
    low: "Baixa",
    medium: "Média",
    high: "Alta",
    urgent: "Urgente",
    kickoff: "Kick-Off",
    projectAnalysis: "Análise de Projetos",
    workInspection: "Vistoria de Obras",
    report: "Relatório",
    meeting: "Reunião",
    documentation: "Documentação",
    other: "Outro",
    workloadWarning: "Prévia do Planejamento",
    workloadDetails: "As atividades selecionadas ({totalHours}h) serão distribuídas para {responsible} a partir de {startDate}:",
    workloadDetailsSingle: "A atividade ({totalHours}h) será distribuída para {responsible} a partir de {startDate}:",
    workloadDetailsSingleMultiDate: "1 atividade de {hours}h em cada uma das {count} datas selecionadas, para {responsible}.",
    workloadDetailsBatch: "As atividades para {function} serão criadas nas {count} datas selecionadas ({totalHours}h por data) para {responsible}:",
    workloadDetailsRecurrenceDistribution: "As atividades selecionadas ({totalHours}h por recorrência) foram distribuídas automaticamente ao longo de vários dias para {responsible}, respeitando o limite de 8h por dia.", // New
    dailyDistribution: "Distribuição diária:",
    maxHoursPerDay: "Máximo 8h por dia",
    availableHours: "Disponível: {available}h de 8h",
    standardActivity: "Atividade Padrão",
    selectStandardActivity: "Usar uma atividade padrão (opcional)",
    suggestedActivities: "Atividades Sugeridas para {function}",
    selectSuggestedActivity: "Selecione uma atividade sugerida (opcional)",
    noActivitiesFound: "Nenhuma atividade padrão encontrada para esta função",
    fillFields: "Selecione a Função, Usuário e Data de Início ou Datas de Frequência e as atividades/detalhes para ver o planejamento.",
    activitiesToBeScheduled: "Atividades selecionadas:",
    selectActivities: "Selecione as Atividades para {function}",
    selectAllActivities: "Selecionar Todas",
    deselectAllActivities: "Desmarcar Todas",
    noActivitiesSelected: "Nenhuma atividade selecionada.",
    batchPlanning: "Planejamento em Lote",
    singleActivity: "Atividade Única",
    recurrence: "Recorrência",
    frequency: "Frequência",
    selectDates: "Selecionar Datas",
    selectedDates: "datas selecionadas",
    batchRecurrence: "Recorrência do Lote",
    recurrenceCount: "recorrências",
    datesFromTemplate: "Datas da atividade padrão"
  },
  en: {
    title: "Plan Activity(s)",
    activityTitle: "Activity Title",
    activityTitlePlaceholder: "Ex: Perform 7th floor inspection",
    description: "Description",
    descriptionPlaceholder: "Describe the activity details...",
    responsible: "Responsible",
    userRole: "Role",
    selectRole: "Select role",
    user: "User",
    selectUser: "Select user",
    startDate: "Planning Start Date",
    dueDate: "Due Date",
    priority: "Priority",
    selectPriority: "Select priority",
    activityType: "Activity Type",
    selectActivityType: "Select type",
    relatedProject: "Related Project",
    selectProject: "Select project (optional)",
    relatedUnit: "Related Unit",
    selectUnit: "Select unit (optional)",
    estimatedHours: "Estimated Hours",
    observations: "Observations",
    observationsPlaceholder: "Additional information...",
    cancel: "Cancel",
    create: "Plan Activities",
    creating: "Planning...",
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
    kickoff: "Kick-Off",
    projectAnalysis: "Project Analysis",
    workInspection: "Work Inspection",
    report: "Report",
    meeting: "Meeting",
    documentation: "Documentation",
    other: "Other",
    workloadWarning: "Planning Preview",
    workloadDetails: "The selected activities ({totalHours}h) will be distributed to {responsible} starting from {startDate}:",
    workloadDetailsSingle: "The activity ({totalHours}h) will be distributed for {responsible} starting from {startDate}:",
    workloadDetailsSingleMultiDate: "1 activity of {hours}h will be created on each of the {count} selected dates for {responsible}.",
    workloadDetailsBatch: "The activities for {function} will be created on {count} selected dates ({totalHours}h per date) for {responsible}:",
    workloadDetailsRecurrenceDistribution: "The selected activities ({totalHours}h per recurrence) have been automatically distributed across several days for {responsible}, respecting the 8h daily limit.", // New
    dailyDistribution: "Daily distribution:",
    maxHoursPerDay: "Maximum 8h per day",
    availableHours: "Available: {available}h of 8h",
    standardActivity: "Standard Activity",
    selectStandardActivity: "Use a standard activity (optional)",
    suggestedActivities: "Suggested Activities for {function}",
    selectSuggestedActivity: "Select a suggested activity (optional)",
    noActivitiesFound: "No standard activities found for this role",
    fillFields: "Select Role, User, Start Date or Frequency Dates and activities/details to see the plan.",
    selectActivities: "Select Activities for {function}",
    selectAllActivities: "Select All",
    deselectAllActivities: "Deselect All",
    noActivitiesSelected: "No activities selected.",
    batchPlanning: "Batch Planning",
    singleActivity: "Single Activity",
    recurrence: "Recurrence",
    frequency: "Frequency",
    selectDates: "Select Dates",
    selectedDates: "selected dates",
    batchRecurrence: "Batch Recurrence",
    recurrenceCount: "recurrences",
    datesFromTemplate: "Dates from standard activity"
  }
};

export default function NovaAtividadeDialog({ open, onOpenChange, onSuccess, language = 'pt' }) {
  const [formData, setFormData] = useState({
    responsavel_email: "",
    data_inicio: "",
    // Campos comuns para recorrência
    recorrencia: "Única",
    frequencia_datas: [], // Array de datas selecionadas
    // Campos para atividade única
    descricao_atividade: "",
    prioridade: "Média",
    tipo_atividade: "Outro",
    horas_estimadas: "",
    // Novos campos
    id_empreendimento: "",
    id_unidade: "",
  });
  const [usuarios, setUsuarios] = useState([]);
  const [atividadesPadrao, setAtividadesPadrao] = useState([]); // Entidade Atividade (templates)
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [saving, setSaving] = useState(false);
  const [workloadPreview, setWorkloadPreview] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedActivities, setSelectedActivities] = useState([]); // IDs das atividades selecionadas
  const [isBatchMode, setIsBatchMode] = useState(true);

  const t = translations[language];

  useEffect(() => {
    if (open) {
      loadData();
      // Reset form and state when dialog opens
      setFormData({ 
        responsavel_email: "", data_inicio: "",
        recorrencia: "Única", frequencia_datas: [],
        descricao_atividade: "", prioridade: "Média",
        tipo_atividade: "Outro", horas_estimadas: "",
        id_empreendimento: "", id_unidade: ""
      });
      setWorkloadPreview(null);
      setSelectedRole("");
      setSelectedActivities([]);
      setIsBatchMode(true); // Default to batch mode when opening
    }
  }, [open]);

  const loadData = async () => {
    try {
      const [usuariosData, atividadesPadraoData, empreendimentosData] = await Promise.all([
        User.list(),
        Atividade.list(), // Carregar atividades padrão (templates)
        Empreendimento.list("-created_date")
      ]);
      setUsuarios(usuariosData);
      setAtividadesPadrao(atividadesPadraoData);
      setEmpreendimentos(empreendimentosData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
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

  const handleProjectChange = (empreendimentoId) => {
    handleInputChange('id_empreendimento', empreendimentoId);
    loadUnidades(empreendimentoId);
  };

  // Quando a função muda, marcar todas as atividades por padrão (em modo lote)
  useEffect(() => {
    if (isBatchMode && selectedRole && atividadesPadrao.length > 0) {
      const roleActivities = atividadesPadrao.filter(a => a.funcao === selectedRole);
      setSelectedActivities(roleActivities.map(a => a.id));
    } else {
      setSelectedActivities([]);
    }
  }, [selectedRole, atividadesPadrao, isBatchMode]);
  
  const scheduleActivitiesWithRecurrence = useCallback(async (responsavelEmail, selectedActivitiesIds, recurrenceDates) => {
    if (!responsavelEmail || selectedActivitiesIds.length === 0 || recurrenceDates.length === 0) {
      setWorkloadPreview(null);
      return;
    }

    try {
      // Buscar atividades existentes do usuário que não estejam concluídas ou canceladas
      const atividadesExistentes = await AtividadePlanejamento.filter({
        responsavel_email: responsavelEmail,
        status_atividade: ['!in', ['Concluída', 'Cancelada']]
      });

      const activities = atividadesPadrao.filter(a => selectedActivitiesIds.includes(a.id));
      const totalHoursPerRecurrence = activities.reduce((sum, act) => sum + (parseFloat(act.tempo_estimado_horas) || 0), 0);

      const finalSchedule = [];
      
      // Para cada data de recorrência
      for (const originalRecurrenceDate of recurrenceDates) { // Renamed from recurrenceDate to originalRecurrenceDate for clarity
        const baseDate = new Date(originalRecurrenceDate);
        let currentDate = new Date(baseDate);
        // Create a deep copy of activities for this recurrence to allow modification of tempo_estimado_horas
        let activitiesLeftToSchedule = activities.map(act => ({ ...act, tempo_estimado_horas: parseFloat(act.tempo_estimado_horas) || 0, original_tempo_estimado_horas: parseFloat(act.tempo_estimado_horas) || 0 }));
        
        const MAX_DAYS_DISTRIBUTION = 30; // Limite para evitar loops infinitos
        let loopGuard = 0;

        while (activitiesLeftToSchedule.some(a => a.tempo_estimado_horas > 0) && loopGuard < MAX_DAYS_DISTRIBUTION) {
          // Pular fins de semana (sábado = 6, domingo = 0)
          if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
            currentDate.setDate(currentDate.getDate() + 1);
            loopGuard++;
            continue;
          }

          const dateStr = currentDate.toISOString().split('T')[0];

          // Calcular horas já planejadas para este dia (existentes + já agendadas nesta sessão)
          const horasJaPlanejadas = atividadesExistentes
            .filter(ativ => {
              const ativDate = ativ.data_prazo || ativ.data_inicio;
              return ativDate && ativDate.startsWith(dateStr);
            })
            .reduce((total, ativ) => total + (parseFloat(ativ.horas_estimadas) || 0), 0)
            + finalSchedule
            .filter(s => s.data_inicio === dateStr)
            .reduce((total, s) => total + (parseFloat(s.horas_estimadas) || 0), 0);

          let horasDisponiveis = Math.max(0, 8 - horasJaPlanejadas); // Max 8 hours per day
          
          if (horasDisponiveis > 0) {
            // Tentar alocar atividades para hoje respeitando o limite de 8h
            // Iterate backwards to safely remove/modify items
            for (let i = activitiesLeftToSchedule.length - 1; i >= 0; i--) {
              const activity = activitiesLeftToSchedule[i];
              const remainingActivityHours = activity.tempo_estimado_horas;

              if (remainingActivityHours > 0) {
                  if (remainingActivityHours <= horasDisponiveis) {
                    // Atividade cabe inteiramente hoje
                    finalSchedule.push({
                      id: activity.id, // Original template ID for tracking
                      originalActivityId: activity.id, // Explicitly store original ID
                      originalRecurrenceDate: originalRecurrenceDate,
                      descricao_atividade: activity.descricao_atividade,
                      tempo_estimado_horas_original: activity.original_tempo_estimado_horas,
                      tipo_atividade: activity.tipo_atividade,
                      prioridade: activity.prioridade || "Média",
                      horas_estimadas: remainingActivityHours,
                      data_inicio: dateStr,
                      data_prazo: dateStr,
                    });
                    
                    horasDisponiveis -= remainingActivityHours;
                    activity.tempo_estimado_horas = 0; // Mark as fully scheduled
                  } else if (horasDisponiveis > 0) {
                    // Atividade precisa ser dividida - alocar parte hoje
                    finalSchedule.push({
                      id: `${activity.id}-${dateStr}-part`, // Unique ID for this part
                      originalActivityId: activity.id, // Explicitly store original ID
                      originalRecurrenceDate: originalRecurrenceDate,
                      descricao_atividade: activity.descricao_atividade,
                      tempo_estimado_horas_original: activity.original_tempo_estimado_horas,
                      tipo_atividade: activity.tipo_atividade,
                      prioridade: activity.prioridade || "Média",
                      horas_estimadas: horasDisponiveis,
                      data_inicio: dateStr,
                      data_prazo: dateStr,
                      isPartialActivity: true,
                    });

                    // Atualizar a atividade restante
                    activity.tempo_estimado_horas -= horasDisponiveis;
                    horasDisponiveis = 0;
                  }
              }
            }
            // Remove fully scheduled activities from the list
            activitiesLeftToSchedule = activitiesLeftToSchedule.filter(a => a.tempo_estimado_horas > 0);
          }

          // Mover para o próximo dia se ainda houver horas a serem agendadas para esta recorrência
          if (activitiesLeftToSchedule.some(a => a.tempo_estimado_horas > 0)) {
            currentDate.setDate(currentDate.getDate() + 1);
            loopGuard++;
          }
        }
        if (activitiesLeftToSchedule.some(a => a.tempo_estimado_horas > 0)) {
            console.warn(`Could not fully schedule all activities for recurrence starting on ${format(originalRecurrenceDate, 'yyyy-MM-dd')}. Remaining hours:`, activitiesLeftToSchedule);
        }
      }

      // Agrupar por data para preview
      const groupedDistribution = finalSchedule.reduce((acc, task) => {
        const date = task.data_inicio;
        if (!acc[date]) {
          acc[date] = { date: new Date(date + 'T12:00:00Z'), hours: 0, tasks: [], recurrenceDates: new Set() };
        }
        acc[date].hours += task.horas_estimadas;
        acc[date].tasks.push(task);
        acc[date].recurrenceDates.add(format(new Date(task.originalRecurrenceDate), 'yyyy-MM-dd')); // Store formatted original recurrence dates
        return acc;
      }, {});

      // Converter Set para Array para o preview
      Object.values(groupedDistribution).forEach(group => {
        group.recurrenceDates = Array.from(group.recurrenceDates);
      });

      setWorkloadPreview({
        totalHours: totalHoursPerRecurrence,
        totalRecurrences: recurrenceDates.length,
        distribution: Object.values(groupedDistribution).sort((a, b) => a.date.getTime() - b.date.getTime()),
        scheduledActivities: finalSchedule,
        originalActivities: activities,
        isRecurrenceDistribution: true,
        isBatchMultiDate: false,
        isMultiDate: false,
      });

    } catch (error) {
      console.error("Erro ao calcular distribuição de recorrência:", error);
      setWorkloadPreview(null);
    }
  }, [atividadesPadrao]);

  const scheduleActivities = useCallback(async (responsavelEmail, dataInicioStr, activitiesToSchedule) => {
    if (!responsavelEmail || !dataInicioStr || activitiesToSchedule.length === 0) {
      setWorkloadPreview(null);
      return;
    }
    
    const totalHours = activitiesToSchedule.reduce((sum, act) => sum + (parseFloat(act.tempo_estimado_horas) || 0), 0);

    try {
      // Buscar atividades existentes do usuário que não estejam concluídas ou canceladas
      const atividadesExistentes = await AtividadePlanejamento.filter({
        responsavel_email: responsavelEmail,
        status_atividade: ['!in', ['Concluída', 'Cancelada']]
      });

      const finalSchedule = [];
      let currentDate = new Date(dataInicioStr + 'T12:00:00Z'); // Add time to avoid timezone issues for date comparisons
      const MAX_DAYS_DISTRIBUTION = 365 * 5; // Limit to 5 years of distribution to prevent infinite loops

      let loopGuard = 0;

      for (const activity of activitiesToSchedule) {
        let remainingHoursForThisActivity = parseFloat(activity.tempo_estimado_horas) || 0;
        
        while (remainingHoursForThisActivity > 0 && loopGuard < MAX_DAYS_DISTRIBUTION) {
            // Pular fins de semana (sábado = 6, domingo = 0)
            if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
                currentDate.setDate(currentDate.getDate() + 1);
                loopGuard++;
                continue;
            }

            const dateStr = currentDate.toISOString().split('T')[0];

            // Calcular horas já planejadas para este dia
            // Inclui atividades existentes do DB e as já agendadas na 'finalSchedule' desta sessão
            const horasJaPlanejadas = atividadesExistentes
                .filter(ativ => {
                    const ativDate = ativ.data_prazo || ativ.data_inicio; 
                    return ativDate && ativDate.startsWith(dateStr);
                })
                .reduce((total, ativ) => total + (parseFloat(ativ.horas_estimadas) || 0), 0)
                + finalSchedule
                .filter(s => s.data_inicio === dateStr)
                .reduce((total, s) => total + (parseFloat(s.horas_estimadas) || 0), 0);
            
            const horasDisponiveis = Math.max(0, 8 - horasJaPlanejadas); // Max 8 hours per day

            if (horasDisponiveis > 0) {
                const horasParaAlocar = Math.min(remainingHoursForThisActivity, horasDisponiveis);
                
                finalSchedule.push({
                    id: activity.id, // Keep original activity ID for grouping
                    descricao_atividade: activity.descricao_atividade, // This is the 'template' description/title for parts
                    tempo_estimado_horas_original: activity.tempo_estimado_horas, // Store original for reference
                    tipo_atividade: activity.tipo_atividade,
                    prioridade: activity.prioridade || "Média",
                    horas_estimadas: horasParaAlocar,
                    data_inicio: dateStr,
                    data_prazo: dateStr, // For batch planning, due date is the same as start date for parts
                });
                
                remainingHoursForThisActivity -= horasParaAlocar;
            }
            
            // If hours still remaining for this activity, move to next day
            if (remainingHoursForThisActivity > 0) {
                currentDate.setDate(currentDate.getDate() + 1);
                loopGuard++;
            }
        }
      }
      
      // Group by date for preview distribution
      const groupedDistribution = finalSchedule.reduce((acc, task) => {
        const date = task.data_inicio;
        if (!acc[date]) {
            acc[date] = { date: new Date(date + 'T12:00:00Z'), hours: 0, tasks: [] };
        }
        acc[date].hours += task.horas_estimadas;
        acc[date].tasks.push(task); // Keep track of tasks for detailed view if needed
        return acc;
      }, {});

      setWorkloadPreview({
        totalHours: totalHours,
        distribution: Object.values(groupedDistribution).sort((a,b) => a.date.getTime() - b.date.getTime()),
        scheduledActivities: finalSchedule,
        originalActivities: activitiesToSchedule, // Store original activities for preview display
        isMultiDate: false, // Explicitly false for distributed planning
        isBatchMultiDate: false, // Explicitly false for distributed planning
        isRecurrenceDistribution: false,
      });

    } catch (error) {
      console.error("Erro ao calcular distribuição de carga horária:", error);
      setWorkloadPreview(null);
    }
  }, []); 

  // Extrair informações de frequência pré-definidas das atividades padrão selecionadas
  const predefinedFrequencyInfo = useMemo(() => {
    if (!isBatchMode || selectedActivities.length === 0) return null;

    const firstActivityTemplate = atividadesPadrao.find(a => a.id === selectedActivities[0]);
    if (!firstActivityTemplate || firstActivityTemplate.recorrencia !== 'Semanal' || !firstActivityTemplate.frequencia) {
        return null;
    }

    try {
        const firstFrequencyString = firstActivityTemplate.frequencia;
        const daysOfWeek = JSON.parse(firstFrequencyString); // Expects ["Segunda", "Quarta"]
        if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) return null;

        // Check if all other selected activities have the same recurrence and frequency
        for (let i = 1; i < selectedActivities.length; i++) {
            const nextActivityTemplate = atividadesPadrao.find(a => a.id === selectedActivities[i]);
            if (!nextActivityTemplate || nextActivityTemplate.recorrencia !== 'Semanal' || nextActivityTemplate.frequencia !== firstFrequencyString) {
                return null; // Mismatched frequencies
            }
        }
        return { recurrence: 'Semanal', days: daysOfWeek };
    } catch {
        return null;
    }
  }, [isBatchMode, selectedActivities, atividadesPadrao]);

  const isDateSelectionDisabled = predefinedFrequencyInfo !== null;

  // Recalcular preview quando os dados relevantes mudarem
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      let shouldClearPreview = true;

      // Se estamos em modo lote e temos atividades selecionadas
      if (isBatchMode && selectedActivities.length > 0 && formData.data_inicio && formData.responsavel_email) {
        const startDate = new Date(formData.data_inicio + 'T12:00:00Z');
        const allSelectedTemplates = atividadesPadrao.filter(a => selectedActivities.includes(a.id));

        // Separar atividades por tipo de recorrência
        const weeklyActivities = allSelectedTemplates.filter(a => a.recorrencia === 'Semanal' && a.frequencia);
        const uniqueActivities = allSelectedTemplates.filter(a => a.recorrencia !== 'Semanal' || !a.frequencia);
        
        let weeklyDates = [];
        // Se houver atividades semanais, gerar as datas
        if (weeklyActivities.length > 0) {
            // Assume-se que todas as semanais selecionadas têm a mesma frequência, como na lógica de `predefinedFrequencyInfo`
            try {
                const daysOfWeek = JSON.parse(weeklyActivities[0].frequencia);
                const dayNameToIndex = { "Domingo": 0, "Segunda": 1, "Terça": 2, "Quarta": 3, "Quinta": 4, "Sexta": 5, "Sábado": 6 };
                const targetDayIndexes = daysOfWeek.map(dayName => dayNameToIndex[dayName]);

                let currentDate = new Date(startDate);
                for (let i = 0; i < 28; i++) { // Gerar para 4 semanas
                    if (targetDayIndexes.includes(getDay(currentDate))) {
                        weeklyDates.push(new Date(currentDate));
                    }
                    currentDate = addDays(currentDate, 1);
                }
            } catch (e) {
                console.error("Erro ao processar frequência semanal:", e);
                weeklyDates = [];
            }
        }
        
        // Se temos datas semanais, chamamos a função de recorrência para elas
        if (weeklyDates.length > 0) {
            scheduleActivitiesWithRecurrence(formData.responsavel_email, weeklyActivities.map(a => a.id), weeklyDates);
            shouldClearPreview = false;
        } 
        // Se há apenas atividades únicas (ou as semanais falharam em gerar datas), usamos a distribuição simples
        else if (uniqueActivities.length > 0) {
            scheduleActivities(formData.responsavel_email, formData.data_inicio, uniqueActivities);
            shouldClearPreview = false;
        }
        // NOTA: Esta lógica atual trata os dois grupos separadamente. 
        // Uma melhoria futura poderia combinar as previews, mas isso resolve o bug principal.

      } 
      // Lógica para atividade única (manual)
      else if (!isBatchMode && formData.data_inicio && formData.responsavel_email) {
          if (formData.frequencia_datas && formData.frequencia_datas.length > 0) {
              // Atividade única com múltiplas datas selecionadas
              const totalHoursPerActivity = parseFloat(formData.horas_estimadas);
              if (totalHoursPerActivity > 0) {
                  const distribution = formData.frequencia_datas.map(date => ({ date: date, hours: totalHoursPerActivity })).sort((a,b) => a.date.getTime() - b.date.getTime());
                  setWorkloadPreview({
                      totalHours: totalHoursPerActivity * distribution.length,
                      distribution: distribution,
                      isMultiDate: true,
                      singleActivityHours: totalHoursPerActivity,
                      isBatchMultiDate: false,
                      isRecurrenceDistribution: false,
                  });
                  shouldClearPreview = false;
              }
          } else {
              // Atividade única com data de início única (distribuída)
              const singleActivity = [{ id: 'single', descricao_atividade: formData.descricao_atividade, tempo_estimado_horas: parseFloat(formData.horas_estimadas), tipo_atividade: formData.tipo_atividade, prioridade: formData.prioridade }];
              if (singleActivity[0].tempo_estimado_horas > 0) {
                  scheduleActivities(formData.responsavel_email, formData.data_inicio, singleActivity);
                  shouldClearPreview = false;
              }
          }
      }

      if (shouldClearPreview) {
        setWorkloadPreview(null);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [
    formData.responsavel_email, 
    formData.data_inicio, 
    selectedActivities, 
    isBatchMode, 
    formData.descricao_atividade, 
    formData.horas_estimadas, 
    formData.tipo_atividade, 
    formData.prioridade, 
    scheduleActivities, 
    atividadesPadrao, 
    formData.frequencia_datas,
    scheduleActivitiesWithRecurrence,
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.responsavel_email || !selectedRole) {
        alert(t.fillFields);
        return;
    }

    // Date validation
    // If predefined weekly recurrence is active (from template for batch mode)
    if (isBatchMode && selectedActivities.some(id => {
      const act = atividadesPadrao.find(a => a.id === id);
      return act && act.recorrencia === 'Semanal' && act.frequencia;
    })) {
        if (!formData.data_inicio) { // We need a start date to generate weekly dates
            alert(t.fillFields);
            return;
        }
    } else { // No predefined weekly recurrence, use form fields or single date
        if (!formData.data_inicio && (!formData.frequencia_datas || formData.frequencia_datas.length === 0)) {
            alert(t.fillFields);
            return;
        }
    }

    // Check if there's a valid workload preview to create activities from
    if (!workloadPreview || (workloadPreview.totalHours === 0 && !workloadPreview.isRecurrenceDistribution && !workloadPreview.isMultiDate) || (workloadPreview.isRecurrenceDistribution && workloadPreview.scheduledActivities.length === 0)) {
        alert(t.fillFields);
        return;
    }

    // Additional specific validations
    if (isBatchMode && selectedActivities.length === 0) {
        alert(t.fillFields);
        return;
    }
    if (!isBatchMode && (!formData.descricao_atividade || parseFloat(formData.horas_estimadas) <= 0)) {
        alert(t.fillFields);
        return;
    }


    setSaving(true);
    try {
      const responsavelUser = usuarios.find(u => u.email === formData.responsavel_email);
      const empreendimento = empreendimentos.find(emp => emp.id === formData.id_empreendimento);
      const unidade = unidades.find(uni => uni.id === formData.id_unidade);
      const activitiesToCreate = [];

      // NOVO: Lógica para distribuição com recorrência (quando workloadPreview.isRecurrenceDistribution é true)
      if (workloadPreview && workloadPreview.isRecurrenceDistribution && workloadPreview.scheduledActivities) {
        // Group parts by original activity ID and original recurrence date
        const activityPartsMap = new Map(); // Key: `${originalActivityId}_${format(originalRecurrenceDate, 'yyyy-MM-dd')}`, Value: Array of scheduled parts

        for (const task of workloadPreview.scheduledActivities) {
            const key = `${task.originalActivityId}_${format(new Date(task.originalRecurrenceDate), 'yyyy-MM-dd')}`;
            if (!activityPartsMap.has(key)) {
                activityPartsMap.set(key, []);
            }
            activityPartsMap.get(key).push(task);
        }

        // Now iterate through the grouped parts to create final activities
        activityPartsMap.forEach((partsForOneOriginalActivityAndRecurrence, key) => {
            partsForOneOriginalActivityAndRecurrence.sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio)); // Sort by date for part numbering
            
            // Crucial fix: Use originalActivityId OR id to find the template, as some scheduled tasks might not have originalActivityId if they weren't split.
            // But with the new scheduleActivitiesWithRecurrence, originalActivityId is always present.
            const originalActivityTemplate = atividadesPadrao.find(a => a.id === partsForOneOriginalActivityAndRecurrence[0].originalActivityId);
            
            partsForOneOriginalActivityAndRecurrence.forEach((part, index) => {
                let activityTitle = originalActivityTemplate?.descricao_atividade || "Atividade Planejada";
                if (partsForOneOriginalActivityAndRecurrence.length > 1) {
                    activityTitle = `${activityTitle} (Parte ${index + 1}/${partsForOneOriginalActivityAndRecurrence.length})`;
                }

                activitiesToCreate.push({
                    titulo_atividade: activityTitle,
                    descricao_atividade: originalActivityTemplate?.descricao_atividade || "Atividade distribuída em recorrência",
                    responsavel_email: formData.responsavel_email,
                    responsavel_nome: responsavelUser?.full_name || '',
                    data_inicio: part.data_inicio,
                    data_prazo: part.data_prazo,
                    prioridade: originalActivityTemplate?.prioridade || "Média",
                    tipo_atividade: originalActivityTemplate?.tipo_atividade || "Outro",
                    id_empreendimento: formData.id_empreendimento || null, 
                    nome_empreendimento: empreendimento?.nome_empreendimento || '',
                    id_unidade: formData.id_unidade || null,
                    nome_unidade: unidade?.unidade_empreendimento || '',
                    horas_estimadas: parseFloat(part.horas_estimadas.toFixed(2)),
                    horas_realizadas: 0,
                    observacoes: `Planejado em lote com recorrência para a função: ${selectedRole}. Recorrência de: ${format(new Date(part.originalRecurrenceDate), 'dd/MM/yyyy', { locale: ptBR })}. ${partsForOneOriginalActivityAndRecurrence.length > 1 ? `Atividade original (${originalActivityTemplate?.tempo_estimado_horas}h) distribuída em ${partsForOneOriginalActivityAndRecurrence.length} partes.` : ''}`,
                    status_atividade: "Planejada",
                    recorrencia: originalActivityTemplate?.recorrencia || formData.recorrencia, // Use the template recurrence if available
                    frequencia: format(new Date(part.originalRecurrenceDate), 'dd/MM/yyyy', { locale: ptBR }), // The date of the recurrence instance
                });
            });
        });
      }
      // This branch handles single activity multi-date and potentially old batch multi-date (if UI allowed it)
      else if (workloadPreview && workloadPreview.isMultiDate && !workloadPreview.isRecurrenceDistribution) { 
        for (const dist of workloadPreview.distribution) { // Iterate through the dates from the preview distribution
            const dateStr = format(dist.date, 'yyyy-MM-dd');
            // Assuming this branch only happens for single activity, not batch templates
            if (!isBatchMode) { // Ensure it's single activity if it gets here
                activitiesToCreate.push({
                    titulo_atividade: formData.descricao_atividade, 
                    descricao_atividade: formData.descricao_atividade,
                    responsavel_email: formData.responsavel_email,
                    responsavel_nome: responsavelUser?.full_name || '',
                    data_inicio: dateStr,
                    data_prazo: dateStr, 
                    prioridade: formData.prioridade,
                    tipo_atividade: formData.tipo_atividade,
                    id_empreendimento: formData.id_empreendimento || null,
                    nome_empreendimento: empreendimento?.nome_empreendimento || '',
                    id_unidade: formData.id_unidade || null,
                    nome_unidade: unidade?.unidade_empreendimento || '',
                    horas_estimadas: parseFloat(formData.horas_estimadas),
                    horas_realizadas: 0,
                    observacoes: formData.descricao_atividade || `Atividade única planejada para a função: ${selectedRole}.`,
                    status_atividade: "Planejada",
                    recorrencia: formData.recorrencia, 
                    frequencia: format(dist.date, 'dd/MM/yyyy', { locale: ptBR }),
                });
            }
        }
      } else if (workloadPreview && workloadPreview.scheduledActivities) {
        // LÓGICA EXISTENTE para distribuição de horas (lote ou única distribuída)
        // This handles cases where `scheduleActivities` (single-date distribution) was called.
        // The `scheduledActivities` from this path will already be broken down into daily parts.
        const activityPartCounts = workloadPreview.scheduledActivities.reduce((acc, task) => {
            acc[task.id] = (acc[task.id] || 0) + 1;
            return acc;
        }, {});
        
        const activityCurrentPartCounter = {};

        for (const task of workloadPreview.scheduledActivities) {
          activityCurrentPartCounter[task.id] = (activityCurrentPartCounter[task.id] || 0) + 1;
          const totalParts = activityPartCounts[task.id];
          
          // Adjust title for multi-part activities
          const activityTitle = totalParts > 1 
              ? `${task.descricao_atividade} (Parte ${activityCurrentPartCounter[task.id]}/${totalParts})`
              : task.descricao_atividade;

          let observacoes;
          let activityRecurrence = "Única";
          let activityFrequencia = "";

          if (isBatchMode) {
            const originalTemplateActivity = atividadesPadrao.find(a => a.id === task.id);
            observacoes = `Planejado em lote para a função: ${selectedRole}. Atividade original: "${originalTemplateActivity?.descricao_atividade}". Total original: ${task.tempo_estimado_horas_original}h.`;
            activityRecurrence = originalTemplateActivity?.recorrencia || "Única";
            activityFrequencia = originalTemplateActivity?.frequencia || "";
          } else {
            observacoes = `Atividade única planejada para a função: ${selectedRole}.`;
            activityRecurrence = formData.recorrencia;
            activityFrequencia = formData.frequencia_datas.length > 0 ? format(new Date(task.data_inicio), 'dd/MM/yyyy', { locale: ptBR }) : "";
          }

          activitiesToCreate.push({
            titulo_atividade: activityTitle,
            // For single activity, the description comes from the form's description field, not the title
            // For batch mode, it's the original template description
            descricao_atividade: isBatchMode 
              ? (atividadesPadrao.find(a => a.id === task.id)?.descricao_atividade || task.descricao_atividade) 
              : formData.descricao_atividade, 
            responsavel_email: formData.responsavel_email,
            responsavel_nome: responsavelUser?.full_name || '',
            data_inicio: task.data_inicio,
            data_prazo: task.data_prazo,
            prioridade: task.prioridade || "Média", // Use priority from scheduled task (which comes from form/template)
            tipo_atividade: task.tipo_atividade || "Outro", // Use type from scheduled task
            id_empreendimento: formData.id_empreendimento || null,
            nome_empreendimento: empreendimento?.nome_empreendimento || '',
            id_unidade: formData.id_unidade || null,
            nome_unidade: unidade?.unidade_empreendimento || '',
            horas_estimadas: parseFloat(task.horas_estimadas.toFixed(2)),
            horas_realizadas: 0,
            observacoes: observacoes,
            status_atividade: "Planejada",
            recorrencia: activityRecurrence, 
            frequencia: activityFrequencia, 
          });
        }
      }

      if (activitiesToCreate.length > 0) {
        await Promise.all(activitiesToCreate.map(activityData => AtividadePlanejamento.create(activityData)));
      }

      onSuccess();
    } catch (error) {
      console.error("Erro ao criar atividades em lote:", error);
      alert("Ocorreu um erro ao criar as atividades. Por favor, tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  // Extrair funções únicas das atividades padrão cadastradas
  const uniqueRoles = useMemo(() => [...new Set(atividadesPadrao.map(a => a.funcao).filter(Boolean))], [atividadesPadrao]);
  const roleActivities = useMemo(() => atividadesPadrao.filter(a => a.funcao === selectedRole), [atividadesPadrao, selectedRole]);

  const handleActivityToggle = (activityId) => {
    setSelectedActivities(prev => {
      if (prev.includes(activityId)) {
        return prev.filter(id => id !== activityId);
      } else {
        return [...prev, activityId];
      }
    }); 
  };

  const handleSelectAll = () => {
    setSelectedActivities(roleActivities.map(a => a.id));
  };

  const handleDeselectAll = () => {
    setSelectedActivities([]);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            {t.title}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Mode Switch */}
            <div className="flex justify-center items-center space-x-2 py-2">
              <Label htmlFor="mode-switch" className="text-sm font-medium text-gray-700">{t.singleActivity}</Label>
              <Switch
                id="mode-switch"
                checked={isBatchMode}
                onCheckedChange={setIsBatchMode}
              />
              <Label htmlFor="mode-switch" className="text-sm font-medium text-gray-700">{t.batchPlanning}</Label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="funcao_usuario">{t.userRole}</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole} required>
                    <SelectTrigger><SelectValue placeholder={t.selectRole} /></SelectTrigger>
                    <SelectContent>
                      {uniqueRoles.map(role => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsavel">{t.user}</Label>
                    <Select value={formData.responsavel_email} onValueChange={(v) => handleInputChange("responsavel_email", v)} required>
                        <SelectTrigger><SelectValue placeholder={t.selectUser} /></SelectTrigger>
                        <SelectContent>
                          {usuarios.map(user => (
                            <SelectItem key={user.email} value={user.email}>{user.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
              <div className="space-y-2">
                  <Label>{t.relatedProject}</Label>
                  <Select value={formData.id_empreendimento} onValueChange={handleProjectChange}>
                      <SelectTrigger><SelectValue placeholder={t.selectProject} /></SelectTrigger>
                      <SelectContent>
                          {empreendimentos.map(emp => (
                              <SelectItem key={emp.id} value={emp.id}>{emp.nome_empreendimento}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
              <div className="space-y-2">
                  <Label>{t.relatedUnit}</Label>
                  <Select value={formData.id_unidade} onValueChange={(v) => handleInputChange("id_unidade", v)} disabled={!unidades.length}>
                      <SelectTrigger><SelectValue placeholder={t.selectUnit} /></SelectTrigger>
                      <SelectContent>
                          {unidades.map(unidade => (
                              <SelectItem key={unidade.id} value={unidade.id}>{unidade.unidade_empreendimento}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
            </div>
            
            <div className={`grid grid-cols-1 ${!isBatchMode ? 'md:grid-cols-3' : ''} gap-4 items-end border-t pt-4`}>
                <div className="space-y-2">
                    <Label htmlFor="data_inicio">{t.startDate}</Label>
                    <Input 
                        id="data_inicio" 
                        type="date" 
                        value={formData.data_inicio} 
                        onChange={(e) => handleInputChange("data_inicio", e.target.value)} 
                        required={isBatchMode && selectedActivities.some(id => {
                            const act = atividadesPadrao.find(a => a.id === id);
                            return act && act.recorrencia === 'Semanal' && act.frequencia;
                        }) || (!isBatchMode && (formData.frequencia_datas.length === 0)) }
                        disabled={!isBatchMode && formData.frequencia_datas && formData.frequencia_datas.length > 0} // Disable if single activity and freq dates are selected
                    />
                </div>
           
            {/* Seção de Recorrência/Frequência - APENAS PARA ATIVIDADE ÚNICA (se não for template weekly) ou para exibição do template weekly */}
            {(!isBatchMode || isDateSelectionDisabled) && ( 
              <>
                <div className="space-y-2">
                  <Label htmlFor="recorrencia">{t.recurrence}</Label>
                  <Select value={isDateSelectionDisabled ? predefinedFrequencyInfo.recurrence : formData.recorrencia} onValueChange={v => handleInputChange('recorrencia', v)} disabled={isDateSelectionDisabled}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Única">Única</SelectItem>
                      <SelectItem value="Diária">Diária</SelectItem>
                      <SelectItem value="Semanal">Semanal</SelectItem>
                      <SelectItem value="Mensal">Mensal</SelectItem>
                      <SelectItem value="Anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frequencia">{t.frequency}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant={"outline"} className="w-full justify-start text-left font-normal" disabled={isDateSelectionDisabled}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {isDateSelectionDisabled
                          ? t.datesFromTemplate
                          : formData.frequencia_datas && formData.frequencia_datas.length > 0
                          ? `${formData.frequencia_datas.length} ${t.selectedDates}`
                          : t.selectDates
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="multiple"
                        selected={!isDateSelectionDisabled ? formData.frequencia_datas : undefined} // Only show selected if not template weekly
                        onSelect={(dates) => handleInputChange('frequencia_datas', dates || [])}
                        initialFocus
                        locale={ptBR} // Ensure calendar uses ptBR locale
                        disabled={isDateSelectionDisabled} // Disable the calendar itself
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
            </div>

            {isBatchMode ? (
              <>
                {selectedRole && roleActivities.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">
                        {t.selectActivities.replace('{function}', selectedRole)}
                      </Label>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>
                          {t.selectAllActivities}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={handleDeselectAll}>
                          {t.deselectAllActivities}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto border rounded-lg p-4">
                      {roleActivities.map((atividade) => (
                        <div key={atividade.id} className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id={`activity-${atividade.id}`}
                            checked={selectedActivities.includes(atividade.id)}
                            onChange={() => handleActivityToggle(atividade.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor={`activity-${atividade.id}`} className="text-sm flex-1 cursor-pointer">
                            <span className="font-medium">{atividade.descricao_atividade}</span>
                            <span className="text-gray-500 ml-2">({atividade.tempo_estimado_horas}h)</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : selectedRole && roleActivities.length === 0 ? (
                  <div className="text-center text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
                    {t.noActivitiesFound}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <Label htmlFor="descricao_atividade">{t.activityTitle}</Label>
                  <Textarea 
                    id="descricao_atividade" 
                    value={formData.descricao_atividade} 
                    onChange={e => handleInputChange('descricao_atividade', e.target.value)} 
                    placeholder={t.descriptionPlaceholder}
                    required 
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="horas_estimadas">{t.estimatedHours}</Label>
                    <Input 
                      id="horas_estimadas" 
                      type="number" 
                      step="0.5" 
                      min="0.5"
                      value={formData.horas_estimadas} 
                      onChange={e => handleInputChange('horas_estimadas', e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.activityType}</Label>
                    <Select value={formData.tipo_atividade} onValueChange={v => handleInputChange('tipo_atividade', v)}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kick-Off">{t.kickoff}</SelectItem>
                        <SelectItem value="Análise de Projetos">{t.projectAnalysis}</SelectItem>
                        <SelectItem value="Vistoria de Obras">{t.workInspection}</SelectItem>
                        <SelectItem value="Relatório">{t.report}</SelectItem>
                        <SelectItem value="Reunião">{t.meeting}</SelectItem>
                        <SelectItem value="Documentação">{t.documentation}</SelectItem>
                        <SelectItem value="Outro">{t.other}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.priority}</Label>
                    <Select value={formData.prioridade} onValueChange={v => handleInputChange('prioridade', v)}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Baixa">{t.low}</SelectItem>
                        <SelectItem value="Média">{t.medium}</SelectItem>
                        <SelectItem value="Alta">{t.high}</SelectItem>
                        <SelectItem value="Urgente">{t.urgent}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            
            {/* Workload Preview Section */}
            {(workloadPreview && (workloadPreview.totalHours > 0 || (workloadPreview.isRecurrenceDistribution && workloadPreview.scheduledActivities.length > 0)) && formData.responsavel_email) ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                        <h4 className="font-medium text-blue-800">{t.workloadWarning}</h4>
                        {workloadPreview.isRecurrenceDistribution ? (
                            <p className="text-sm text-blue-700 mt-1">
                                {t.workloadDetailsRecurrenceDistribution
                                  .replace('{totalHours}', workloadPreview.totalHours.toFixed(2))
                                  .replace('{responsible}', usuarios.find(u => u.email === formData.responsavel_email)?.full_name || '')
                                }
                            </p>
                        ) : workloadPreview.isBatchMultiDate ? (
                            <p className="text-sm text-blue-700 mt-1">
                                {t.workloadDetailsBatch
                                  .replace('{function}', selectedRole)
                                  .replace('{count}', workloadPreview.distribution.length)
                                  .replace('{totalHours}', workloadPreview.totalHours.toFixed(2))
                                  .replace('{responsible}', usuarios.find(u => u.email === formData.responsavel_email)?.full_name || '')
                                }
                            </p>
                        ) : workloadPreview.isMultiDate ? (
                            <p className="text-sm text-blue-700 mt-1">
                                {t.workloadDetailsSingleMultiDate
                                  .replace('{hours}', workloadPreview.singleActivityHours.toFixed(2))
                                  .replace('{count}', workloadPreview.distribution.length)
                                  .replace('{responsible}', usuarios.find(u => u.email === formData.responsavel_email)?.full_name || '')
                                }
                            </p>
                        ) : (
                            <p className="text-sm text-blue-700 mt-1">
                                {isBatchMode 
                                ? t.workloadDetails
                                    .replace('{totalHours}', workloadPreview.totalHours.toFixed(2))
                                    .replace('{responsible}', usuarios.find(u => u.email === formData.responsavel_email)?.full_name || '')
                                    .replace('{startDate}', format(new Date(formData.data_inicio + 'T12:00:00Z'), "dd/MM/yyyy", { locale: ptBR }))
                                : t.workloadDetailsSingle
                                    .replace('{totalHours}', workloadPreview.totalHours.toFixed(2))
                                    .replace('{responsible}', usuarios.find(u => u.email === formData.responsavel_email)?.full_name || '')
                                    .replace('{startDate}', format(new Date(formData.data_inicio + 'T12:00:00Z'), "dd/MM/yyyy", { locale: ptBR }))
                                }
                            </p>
                        )}
                        {(isBatchMode || workloadPreview.isBatchMultiDate) && workloadPreview.originalActivities && workloadPreview.originalActivities.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-semibold text-blue-800 mb-2">{t.activitiesToBeScheduled}</p>
                            <div className="text-xs text-blue-700 space-y-1">
                                {workloadPreview.originalActivities.map(act => (
                                    <div key={act.id}>- {act.descricao_atividade} ({act.tempo_estimado_horas}h)</div>
                                ))}
                            </div>
                          </div>
                        )}
                        <div className="mt-4">
                            <p className="text-sm font-semibold text-blue-800">{t.dailyDistribution}</p>
                            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                                {workloadPreview.distribution.map((dist, index) => (
                                <div key={index} className="flex justify-between text-xs text-blue-700">
                                    <span>{format(dist.date, "dd/MM/yyyy", { locale: ptBR })}</span>
                                    <span>{dist.hours.toFixed(2)}h {dist.recurrenceDates && dist.recurrenceDates.length > 1 && `(${dist.recurrenceDates.length} ${t.recurrenceCount})`}</span>
                                </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
                ) : (
                // Show message if required fields are missing
                (!formData.responsavel_email || !selectedRole || 
                    (isBatchMode && selectedActivities.length === 0) || 
                    (!isBatchMode && (!formData.descricao_atividade || parseFloat(formData.horas_estimadas) <= 0)) ||
                    // Date validation matches handleSubmit logic
                    (isBatchMode && selectedActivities.some(id => {
                        const act = atividadesPadrao.find(a => a.id === id);
                        return act && act.recorrencia === 'Semanal' && act.frequencia;
                    }) && !formData.data_inicio) || // If batch and has weekly recurrence from templates, start date is required
                    (!(isBatchMode && selectedActivities.some(id => {
                        const act = atividadesPadrao.find(a => a.id === id);
                        return act && act.recorrencia === 'Semanal' && act.frequencia;
                    })) && !formData.data_inicio && (!formData.frequencia_datas || formData.frequencia_datas.length === 0)) || // If not template weekly, then either start date or freq dates are needed
                    (selectedRole && roleActivities.length === 0 && isBatchMode && selectedActivities.length === 0) // No activities for batch mode and selected role
                ) ? (
                    <div className="text-center text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
                        {t.fillFields}
                    </div>
                ) : null
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t.cancel}</Button>
            <Button 
              type="submit" 
              disabled={
                saving || 
                !workloadPreview || 
                (workloadPreview.totalHours === 0 && !workloadPreview.isRecurrenceDistribution && !workloadPreview.isMultiDate) || // Ensure a valid workload exists for non-recurrence distribution
                (workloadPreview.isRecurrenceDistribution && workloadPreview.scheduledActivities.length === 0) || // Check actual scheduled tasks for recurrence
                (isBatchMode && selectedActivities.length === 0) || // Batch mode: must have selected activities
                (!isBatchMode && ( // Single activity mode checks
                  !formData.descricao_atividade || parseFloat(formData.horas_estimadas) <= 0
                )) ||
                // Date validation matches handleSubmit logic
                (isBatchMode && selectedActivities.some(id => {
                    const act = atividadesPadrao.find(a => a.id === id);
                    return act && act.recorrencia === 'Semanal' && act.frequencia;
                }) && !formData.data_inicio) ||
                (!(isBatchMode && selectedActivities.some(id => {
                    const act = atividadesPadrao.find(a => a.id === id);
                    return act && act.recorrencia === 'Semanal' && act.frequencia;
                })) && !formData.data_inicio && (!formData.frequencia_datas || formData.frequencia_datas.length === 0)) ||
                !formData.responsavel_email ||
                (selectedRole && roleActivities.length === 0 && isBatchMode && selectedActivities.length === 0) // No activities for batch mode and selected role
              } 
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? t.creating : t.create}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
