
import React, { useState, useEffect, useMemo } from "react";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Play,
  Pause,
  CheckCircle2,
  Hourglass,
  User as UserIcon,
  BarChart2,
  Users // Added Users icon
} from "lucide-react";
import { format, addWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox component
import { cn } from "@/lib/utils"; // Import cn utility

const translations = {
  pt: {
    calendar: "Calendário",
    week: "Semana",
    allUsers: "Todos os Usuários",
    allTypes: "Todos os Tipos",
    today: "Hoje",
    noActivities: "Nenhuma atividade",
    loading: "Carregando calendário...",
    start: "Iniciar",
    pause: "Pausar",
    resume: "Retomar",
    complete: "Concluir",
    runningActivity: "Atividade em execução",
    startedAt: "Iniciada às",
    runningFor: "Em execução há",
    activities: "atividades",
    activity: "atividade", // Added for singular
    viewAll: "Ver todas",
    collapse: "Recolher"
  },
  en: {
    calendar: "Calendar",
    week: "Week",
    allUsers: "All Users",
    allTypes: "All Types",
    today: "Today",
    noActivities: "No activities",
    loading: "Loading calendar...",
    start: "Start",
    pause: "Pause",
    resume: "Resume",
    complete: "Complete",
    runningActivity: "Running activity",
    startedAt: "Started at",
    runningFor: "Running for",
    activities: "activities",
    activity: "activity", // Added for singular
    viewAll: "View all",
    collapse: "Collapse"
  }
};

const statusColors = {
  'Planejada': 'bg-blue-100 text-blue-800',
  'Em Andamento': 'bg-green-100 text-green-800',
  'Pausada': 'bg-yellow-100 text-yellow-800',
  'Concluída': 'bg-purple-100 text-purple-800',
  'Atrasada': 'bg-red-100 text-red-800',
  'Cancelada': 'bg-gray-100 text-gray-800'
};

const priorityColors = {
  'Baixa': 'bg-gray-100 text-gray-800',
  'Média': 'bg-blue-100 text-blue-800',
  'Alta': 'bg-orange-100 text-orange-800',
  'Urgente': 'bg-red-100 text-red-800'
};

export default function CalendarioAtividades({
  language = 'pt',
  theme = 'light',
  onEditAtividade,
  atividades = [],
  usuarios = [],
  execucoes = [],
  loading,
  onStart,
  onPause,
  onStop,
  selectionMode,
  selectedIds,
  onToggleSelection,
}) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [filterUser, setFilterUser] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [expandedDays, setExpandedDays] = useState({});

  const t = translations[language];
  const isDark = theme === 'dark';

  // Debug: Log das atividades recebidas
  // console.log("CalendarioAtividades - Atividades recebidas:", atividades.length);
  // console.log("CalendarioAtividades - Primeira atividade:", atividades[0]);

  const startOfCurrentWeek = useMemo(() => startOfWeek(currentWeek, { locale: ptBR }), [currentWeek]);
  const endOfCurrentWeek = useMemo(() => endOfWeek(currentWeek, { locale: ptBR }), [currentWeek]);

  const daysInWeek = useMemo(() =>
    eachDayOfInterval({ start: startOfCurrentWeek, end: endOfCurrentWeek }),
    [startOfCurrentWeek, endOfCurrentWeek]
  );

  const filteredAtividades = useMemo(() => {
    // console.log("Filtrando atividades:", { total: atividades.length, filterUser, filterType });

    return atividades.filter(atividade => {
      const matchesUser = filterUser === 'all' || atividade.responsavel_email === filterUser;
      const matchesType = filterType === 'all' || atividade.tipo_atividade === filterType;

      // console.log("Atividade:", atividade.titulo_atividade, { matchesUser, matchesType });
      return matchesUser && matchesType;
    });
  }, [atividades, filterUser, filterType]);

  // Encontrar atividade em execução
  const runningExecution = useMemo(() => {
    return execucoes.find(e => e.status_execucao === "Em Execução");
  }, [execucoes]);

  const runningActivity = useMemo(() => {
    if (!runningExecution) return null;
    return filteredAtividades.find(a => a.id === runningExecution.id_atividade_planejamento);
  }, [runningExecution, filteredAtividades]);

  const toggleDayExpansion = (dayString, folderKey) => {
    const key = `${dayString}-${folderKey}`;
    setExpandedDays(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const AtividadeCard = ({ atividade }) => {
    const execucaoAtividade = execucoes.find(e =>
      e.id_atividade_planejamento === atividade.id
    );

    const isEmExecucao = execucaoAtividade?.status_execucao === "Em Execução";
    const isPausada = execucaoAtividade?.status_execucao === "Pausada";
    const isConcluida = atividade.status_atividade === "Concluída";
    const canStart = !isEmExecucao && atividade.status_atividade !== "Concluída" && atividade.status_atividade !== "Cancelada";
    const isSelected = selectedIds?.includes(atividade.id);

    // Determinar cor da barra e fundo baseado no status
    let barColor = '#6b7280'; // cinza padrão (planejada)
    let bgColor = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
    let statusBadgeColor = 'bg-gray-100 text-gray-600';

    if (isEmExecucao) {
      barColor = '#3b82f6'; // azul
      bgColor = isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200';
      statusBadgeColor = 'bg-blue-100 text-blue-700';
    } else if (isPausada) {
      barColor = '#f59e0b'; // amarelo
      bgColor = isDark ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-200';
      statusBadgeColor = 'bg-yellow-100 text-yellow-700';
    } else if (isConcluida) {
      barColor = '#10b981'; // verde
      bgColor = isDark ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200';
      statusBadgeColor = 'bg-green-100 text-green-700';
    }

    const handleCardClick = () => {
      if (selectionMode) {
        onToggleSelection(atividade.id);
      }
    };

    return (
      <div 
        className={cn(
          "relative rounded-xl shadow-sm border overflow-hidden mb-3 transition-all duration-200",
          bgColor,
          selectionMode && "cursor-pointer hover:shadow-lg",
          isSelected && "ring-2 ring-blue-500 border-blue-500"
        )}
        onClick={handleCardClick}
      >
        {/* Barra lateral colorida */}
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{backgroundColor: barColor}}></div>

        <div className="p-4 pl-5">
          {/* Header com título e horas */}
          <div className="flex items-start justify-between mb-3">
            <h4
              className={`font-semibold text-sm leading-tight transition-colors ${isDark ? 'text-gray-100' : 'text-gray-900'} ${!selectionMode && 'cursor-pointer hover:text-blue-600'}`}
              onClick={(e) => {
                if (!selectionMode) {
                  e.stopPropagation();
                  onEditAtividade && onEditAtividade(atividade);
                }
              }}
              title={atividade.titulo_atividade} // Tooltip com título completo
            >
              {atividade.titulo_atividade}
            </h4>
            <div className="flex-shrink-0 ml-2 flex items-center gap-2">
              {selectionMode && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleSelection(atividade.id)}
                  className="mr-2"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              {atividade.horas_estimadas && (
                <Badge className="bg-indigo-100 text-indigo-800 text-xs font-medium">
                  {atividade.horas_estimadas}h
                </Badge>
              )}
            </div>
          </div>

          {/* Informações do usuário */}
          <div className={`flex items-center gap-2 text-xs mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            <UserIcon className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{atividade.responsavel_nome}</span>
          </div>

          {/* Status apenas (sem prioridade) */}
          <div className="flex items-center justify-start mb-3">
            <Badge className={`text-xs ${statusBadgeColor}`}>
              {atividade.status_atividade}
            </Badge>
          </div>

          {/* Botões de ação */}
          <div className="pt-2 border-t border-gray-100">
            {!selectionMode && (
              <>
                {canStart && !isPausada && (
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStart && onStart(atividade);
                    }}
                  >
                    <Play className="w-3 h-3" />
                    {t.start}
                  </Button>
                )}
                {canStart && isPausada && (
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStart && onStart(atividade);
                    }}
                  >
                    <Play className="w-3 h-3" />
                    {t.resume}
                  </Button>
                )}
              </>
            )}
            {isPausada && (
              <div className="flex items-center justify-center w-full py-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-yellow-600 font-medium">Pausada</span>
                </div>
              </div>
            )}
            {isEmExecucao && (
              <div className="flex items-center justify-center w-full py-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-blue-600 font-medium">Em Execução</span>
                </div>
              </div>
            )}
            {isConcluida && (
              <div className="flex items-center justify-center w-full py-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-600 font-medium">Concluída</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const UserActivityFolder = ({ dayString, userId, userName, atividades, isExpanded, onToggle }) => {
    const totalActivities = atividades.length;

    if (totalActivities === 0) return null;

    const totalHours = atividades.reduce((sum, act) => sum + (parseFloat(act.horas_estimadas) || 0), 0);

    const empreendimentoNome = atividades[0]?.nome_empreendimento || 'Sem empreendimento';

    let barColor = '#6b7280';
    let bgColor = isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200';

    const hasEmExecucao = atividades.some(a => execucoes.some(e => e.id_atividade_planejamento === a.id && e.status_execucao === "Em Execução"));
    const hasPausada = atividades.some(a => execucoes.some(e => e.id_atividade_planejamento === a.id && e.status_execucao === "Pausada"));
    const hasConcluida = atividades.some(a => a.status_atividade === "Concluída");

    if (hasEmExecucao) {
      barColor = '#3b82f6';
      bgColor = isDark ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-300';
    } else if (hasPausada) {
      barColor = '#f59e0b';
      bgColor = isDark ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-50 border-yellow-400';
    } else if (hasConcluida) {
      barColor = '#10b981';
      bgColor = isDark ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-300';
    }

    return (
      <div
        className={`relative rounded-xl shadow-sm border overflow-hidden cursor-pointer mb-3 hover:shadow-md transition-all duration-200 ${bgColor}`}
        onClick={onToggle}
      >
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{backgroundColor: barColor}}></div>

        <div className="p-3 pl-4">
          <div className="flex items-center justify-between">
            <h4 className={`font-semibold text-sm truncate mr-2 ${isDark ? 'text-gray-100' : 'text-gray-800'}`} title={empreendimentoNome}>
              {empreendimentoNome}
            </h4>
            <ChevronRight className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded && 'rotate-90'}`} />
          </div>
          
          <div className={`flex items-center gap-2 text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <UserIcon className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{userName}</span>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className={`flex items-center gap-1.5 text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              <BarChart2 className="w-3 h-3 text-purple-500" />
              <span>{totalHours.toFixed(1)}h</span>
            </div>
            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {totalActivities} {totalActivities === 1 ? t.activity : t.activities}
            </span>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-gray-200/50">
            <div className="p-4 space-y-3">
              {atividades.map(atividade => (
                <AtividadeCard 
                  key={atividade.id} 
                  atividade={atividade} 
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const goToPreviousWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, -1));
  };

  const goToNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  if (loading) {
    return (
      <Card className={`${isDark ? 'bg-gray-900 border-gray-800' : ''}`}>
        <CardContent className="p-4 text-center">
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t.loading}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative">
      <Card className={`${isDark ? 'bg-gray-900 border-gray-800' : ''}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            {t.calendar}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={goToToday} className={`${isDark ? 'bg-gray-700 text-gray-100 hover:bg-gray-600' : ''}`}>
              {t.today}
            </Button>
            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger className={`w-[180px] ${isDark ? 'bg-gray-700 text-gray-100 border-gray-600' : ''}`}>
                <SelectValue placeholder={t.allUsers} />
              </SelectTrigger>
              <SelectContent className={`${isDark ? 'bg-gray-800 text-gray-100 border-gray-700' : ''}`}>
                <SelectItem value="all">{t.allUsers}</SelectItem>
                {usuarios.map(user => (
                  <SelectItem key={user.email} value={user.email}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className={`w-[180px] ${isDark ? 'bg-gray-700 text-gray-100 border-gray-600' : ''}`}>
                <SelectValue placeholder={t.allTypes} />
              </SelectTrigger>
              <SelectContent className={`${isDark ? 'bg-gray-800 text-gray-100 border-gray-700' : ''}`}>
                <SelectItem value="all">{t.allTypes}</SelectItem>
                <SelectItem value="Kick-Off">Kick-Off</SelectItem>
                <SelectItem value="Análise de Projetos">Análise de Projetos</SelectItem>
                <SelectItem value="Vistoria de Obras">Vistoria de Obras</SelectItem>
                <SelectItem value="Relatório">Relatório</SelectItem>
                <SelectItem value="Reunião">Reunião</SelectItem>
                <SelectItem value="Documentação">Documentação</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="icon" onClick={goToPreviousWeek} className={`${isDark ? 'bg-gray-700 text-gray-100 hover:bg-gray-600' : ''}`}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                {format(startOfCurrentWeek, "dd MMM", { locale: ptBR })} - {format(endOfCurrentWeek, "dd MMM yyyy", { locale: ptBR })}
              </h3>
              <Button variant="outline" size="icon" onClick={goToNextWeek} className={`${isDark ? 'bg-gray-700 text-gray-100 hover:bg-gray-600' : ''}`}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Cabeçalho dos dias */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {daysInWeek.map(day => (
              <div key={day.toString()} className={`text-center p-2 rounded-lg ${isSameDay(day, new Date()) ? (isDark ? 'bg-blue-800' : 'bg-blue-100') : (isDark ? 'bg-gray-800' : 'bg-gray-50')}`}>
                <span className={`text-xs font-medium ${isSameDay(day, new Date()) ? 'text-blue-600' : (isDark ? 'text-gray-300' : 'text-gray-600')}`}>
                  {format(day, "EEE", { locale: ptBR })}
                </span>
                <span className={`block text-lg font-bold ${isSameDay(day, new Date()) ? 'text-blue-600' : (isDark ? 'text-gray-100' : 'text-gray-900')}`}>
                  {format(day, "d")}
                </span>
              </div>
            ))}
          </div>

          {/* Grid de atividades */}
          <div className="grid grid-cols-7 gap-2">
            {daysInWeek.map(day => {
              const dayString = format(day, 'yyyy-MM-dd');

              // Buscar atividades para este dia
              const atividadesNoDia = filteredAtividades.filter(atividade => {
                const dataPrazo = atividade.data_prazo;
                const dataInicio = atividade.data_inicio;

                // Verifica se a data de prazo ou início corresponde ao dia
                return dataPrazo === dayString || dataInicio === dayString;
              });

              // Agrupar atividades por usuário E empreendimento
              const activityGroups = atividadesNoDia.reduce((groups, atividade) => {
                const userId = atividade.responsavel_email;
                const userName = atividade.responsavel_nome || usuarios.find(u => u.email === userId)?.full_name || 'Usuário Desconhecido';
                const empreendimentoId = atividade.id_empreendimento || 'sem-empreendimento';
                const empreendimentoNome = atividade.nome_empreendimento || 'Sem empreendimento';

                // Criar chave única: usuário + empreendimento
                const groupKey = `${userId}-${empreendimentoId}`;

                if (!groups[groupKey]) {
                  groups[groupKey] = {
                    userId,
                    userName,
                    empreendimentoId,
                    empreendimentoNome,
                    activities: []
                  };
                }
                groups[groupKey].activities.push(atividade);
                return groups;
              }, {});

              const userEmpreendimentoGroups = Object.values(activityGroups);

              return (
                <div key={day.toString()} className={`border rounded-xl p-3 min-h-[200px] ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                  {userEmpreendimentoGroups.length === 0 ? (
                    <p className={`text-center text-xs mt-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {t.noActivities}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {userEmpreendimentoGroups.map(group => {
                        const folderKey = `${group.userId}-${group.empreendimentoId}`;
                        const isExpanded = expandedDays[`${dayString}-${folderKey}`];
                        return (
                          <UserActivityFolder
                            key={`${dayString}-${folderKey}`}
                            dayString={dayString}
                            userId={group.userId}
                            userName={group.userName}
                            atividades={group.activities}
                            isExpanded={isExpanded}
                            onToggle={() => toggleDayExpansion(dayString, folderKey)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Indicador de atividade em execução no canto inferior */}
      {runningActivity && runningExecution && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`rounded-lg shadow-lg border p-4 min-w-[320px] ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                {t.runningActivity}
              </span>
            </div>
            <h4 className={`font-semibold text-base mb-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              {runningActivity.titulo_atividade}
            </h4>
            <div className={`flex items-center gap-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <span>
                {t.startedAt} {format(new Date(runningExecution.data_inicio), 'HH:mm')}
              </span>
              <Badge className="bg-green-100 text-green-800">
                Em Execução
              </Badge>
            </div>
            {runningExecution.usuario_nome && (
              <div className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {runningExecution.usuario_nome}
              </div>
            )}
            <div className="flex gap-2 mt-4 pt-4 border-t border-dashed">
              <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-yellow-600 hover:bg-yellow-100"
                  onClick={() => onPause && onPause(runningActivity, runningExecution)}
              >
                  <Pause className="w-3 h-3 mr-1" />
                  {t.pause}
              </Button>
              <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-blue-600 hover:bg-blue-100"
                  onClick={() => onStop && onStop(runningActivity, runningExecution)}
              >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {t.complete}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
