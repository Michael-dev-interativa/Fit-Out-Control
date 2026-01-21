
import React, { useState, useEffect, useCallback } from "react";
import { AtividadePlanejamento } from "@/api/entities";
import { User } from "@/api/entities";
import { Execucao } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Plus,
  Trash2, // Importar ícone de lixeira
  X,      // Importar ícone para fechar
  AlertTriangle
} from "lucide-react";
import { differenceInMinutes } from "date-fns";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import NovaAtividadeDialog from "../components/planejamento/NovaAtividadeDialog";
import EditarAtividadeDialog from "../components/planejamento/EditarAtividadeDialog";
import CalendarioAtividades from "../components/planejamento/CalendarioAtividades";

const translations = {
  pt: {
    title: "Planejamento de Atividades",
    subtitle: "Gerencie as tarefas e cronogramas da equipe",
    newActivity: "Nova Atividade",
    manageActivities: "Gerenciar",
    cancelSelection: "Cancelar Seleção",
    deleteSelection: "Excluir Seleção",
    deleteConfirmationTitle: "Confirmar Exclusão",
    deleteConfirmationMessage: "Tem certeza que deseja excluir as {count} atividades selecionadas? Esta ação não pode ser desfeita.",
    loading: "Carregando...",
    restrictedAccess: "Acesso Restrito",
    adminOnly: "Apenas administradores podem acessar o planejamento de atividades.",
    startError: "Já existe outra atividade em execução. Por favor, conclua-a antes de iniciar uma nova.",
    activityStarted: "Atividade iniciada!",
    activityPaused: "Atividade pausada.",
    activityResumed: "Atividade retomada!",
    activityCompleted: "Atividade concluída com sucesso!",
    errorOccurred: "Ocorreu um erro."
  },
  en: {
    title: "Activity Planning",
    subtitle: "Manage team tasks and schedules",
    newActivity: "New Activity",
    manageActivities: "Manage",
    cancelSelection: "Cancel Selection",
    deleteSelection: "Delete Selection",
    deleteConfirmationTitle: "Confirm Deletion",
    deleteConfirmationMessage: "Are you sure you want to delete the {count} selected activities? This action cannot be undone.",
    loading: "Loading...",
    restrictedAccess: "Restricted Access",
    adminOnly: "Only administrators can access the activity planner.",
    startError: "Another activity is already in progress. Please complete it before starting a new one.",
    activityStarted: "Activity started!",
    activityPaused: "Activity paused.",
    activityResumed: "Activity resumed!",
    activityCompleted: "Activity completed successfully!",
    errorOccurred: "An error occurred."
  }
};

export default function Planejamento({ language: initialLanguage, theme: initialTheme }) {
  const [atividades, setAtividades] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [execucoes, setExecucoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNovaDialog, setShowNovaDialog] = useState(false);
  const [editingAtividade, setEditingAtividade] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [language, setLanguage] = useState(initialLanguage || 'pt');
  const [theme, setTheme] = useState(initialTheme || 'light');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const t = translations[language];
  const isDark = theme === 'dark';

  useEffect(() => {
    const handleLanguageChange = () => {
      const storedLang = localStorage.getItem('language') || 'pt';
      setLanguage(storedLang);
    };
    const handleThemeChange = () => {
      const storedTheme = localStorage.getItem('theme') || 'light';
      setTheme(storedTheme);
    };
    
    window.addEventListener('language-change', handleLanguageChange);
    window.addEventListener('theme-change', handleThemeChange);
    handleLanguageChange();
    handleThemeChange();
    
    return () => {
      window.removeEventListener('language-change', handleLanguageChange);
      window.removeEventListener('theme-change', handleThemeChange);
    };
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      console.log("Carregando dados do planejamento...");
      
      const [atividadesData, usuariosData, userData] = await Promise.all([
        AtividadePlanejamento.list("-created_date").catch(() => []),
        User.list().catch(() => []),
        User.me().catch(() => null)
      ]);
      
      console.log("Dados carregados:", { 
        atividades: atividadesData.length, 
        usuarios: usuariosData.length,
        user: userData?.email 
      });
      
      setAtividades(atividadesData);
      setUsuarios(usuariosData);
      setCurrentUser(userData);

      // Carregar execuções separadamente para não quebrar se der erro
      try {
        const execucoesData = await Execucao.list();
        setExecucoes(execucoesData);
      } catch (error) {
        console.log("Erro ao carregar execuções (não crítico):", error);
        setExecucoes([]);
      }

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error(t.errorOccurred);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = (atividade) => {
    setEditingAtividade(atividade);
  };

  const handleSuccess = () => {
    setShowNovaDialog(false);
    setEditingAtividade(null);
    loadData();
  };

  const handleToggleSelection = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;

    try {
      await Promise.all(selectedIds.map(id => AtividadePlanejamento.delete(id)));
      toast.success(`${selectedIds.length} atividades excluídas com sucesso!`);
      setSelectedIds([]);
      setSelectionMode(false);
      loadData();
    } catch (error) {
      console.error("Erro ao excluir atividades:", error);
      toast.error(t.errorOccurred);
    }
  };

  const handleStartAtividade = async (atividade) => {
    // Verificar se já há uma execução ativa
    const activeExecution = execucoes.find(e => e.status_execucao === "Em Execução");
    if (activeExecution) {
      toast.error(t.startError);
      return;
    }

    // Verificar se existe uma execução pausada para esta atividade
    const existingExecution = execucoes.find(e => 
      e.id_atividade_planejamento === atividade.id && 
      e.status_execucao === "Pausada"
    );

    try {
      if (existingExecution) {
        // Retomar atividade pausada
        const pausas = existingExecution.pausas || [];
        const lastPause = pausas[pausas.length - 1];
        if (lastPause) {
          lastPause.fim_pausa = new Date().toISOString();
          lastPause.duracao_pausa_minutos = differenceInMinutes(
            new Date(lastPause.fim_pausa), 
            new Date(lastPause.inicio_pausa)
          );
        }

        await Execucao.update(existingExecution.id, {
          status_execucao: "Em Execução",
          pausas: pausas
        });
        toast.success(t.activityResumed);
      } else {
        // Iniciar nova atividade
        await Execucao.create({
          id_atividade_planejamento: atividade.id,
          titulo_atividade: atividade.titulo_atividade,
          id_empreendimento: atividade.id_empreendimento,
          nome_empreendimento: atividade.nome_empreendimento,
          id_unidade: atividade.id_unidade,
          nome_pavimento: atividade.nome_unidade,
          usuario_email: currentUser.email,
          usuario_nome: currentUser.full_name,
          data_inicio: new Date().toISOString(),
          status_execucao: "Em Execução",
          tipo_atividade: atividade.tipo_atividade
        });
        
        // Atualizar status da atividade para "Em Andamento"
        await AtividadePlanejamento.update(atividade.id, {
          status_atividade: "Em Andamento"
        });
        
        toast.success(t.activityStarted);
      }
      
      loadData();
    } catch (error) {
      console.error("Erro ao iniciar atividade:", error);
      toast.error(t.errorOccurred);
    }
  };

  const handlePauseAtividade = async (atividade, execucao) => {
    try {
      const newPause = {
        inicio_pausa: new Date().toISOString(),
        motivo_pausa: "Pausa do usuário"
      };
      
      const updatedPausas = execucao.pausas ? [...execucao.pausas, newPause] : [newPause];

      await Execucao.update(execucao.id, {
        status_execucao: "Pausada",
        pausas: updatedPausas
      });
      
      toast.info(t.activityPaused);
      loadData();
    } catch (error) {
      console.error("Erro ao pausar atividade:", error);
      toast.error(t.errorOccurred);
    }
  };

  const handleConcluirAtividade = async (atividade, execucao) => {
    try {
      const dataTermino = new Date();
      const totalPauseMinutes = (execucao.pausas || []).reduce((acc, p) => acc + (p.duracao_pausa_minutos || 0), 0);
      const totalMinutes = differenceInMinutes(dataTermino, new Date(execucao.data_inicio)) - totalPauseMinutes;

      await Execucao.update(execucao.id, {
        status_execucao: "Concluída",
        data_termino: dataTermino.toISOString(),
        tempo_total_minutos: totalMinutes,
        tempo_total_horas: totalMinutes / 60
      });

      // Calcular total de horas realizadas para a atividade
      const allExecutionsForActivity = await Execucao.filter({
        id_atividade_planejamento: atividade.id
      });
      const totalRealizadoHoras = allExecutionsForActivity.reduce((acc, e) => acc + (e.tempo_total_horas || 0), 0);
      
      await AtividadePlanejamento.update(atividade.id, {
        status_atividade: "Concluída",
        horas_realizadas: totalRealizadoHoras,
        data_conclusao: dataTermino.toISOString()
      });
      
      toast.success(t.activityCompleted);
      loadData();
    } catch (error) {
      console.error("Erro ao concluir atividade:", error);
      toast.error(t.errorOccurred);
    }
  };

  // Verificação de permissão mais robusta
  const isAdmin = currentUser?.role === "admin";

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t.loading}</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t.restrictedAccess}
        </h2>
        <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {t.adminOnly}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t.title}
          </h1>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
            {t.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
              <Button variant="ghost" onClick={() => { setSelectionMode(false); setSelectedIds([]); }}>
                <X className="w-4 h-4 mr-2" />
                {t.cancelSelection}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={selectedIds.length === 0}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t.deleteSelection} ({selectedIds.length})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t.deleteConfirmationTitle}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t.deleteConfirmationMessage.replace('{count}', selectedIds.length)}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSelected}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setSelectionMode(true)}>
                {t.manageActivities}
              </Button>
              <Button onClick={() => setShowNovaDialog(true)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {t.newActivity}
              </Button>
            </>
          )}
        </div>
      </div>

      <CalendarioAtividades 
        language={language}
        theme={theme}
        onEditAtividade={handleEdit}
        atividades={atividades}
        usuarios={usuarios}
        execucoes={execucoes}
        loading={loading}
        onStart={handleStartAtividade}
        onPause={handlePauseAtividade}
        onStop={handleConcluirAtividade}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        onToggleSelection={handleToggleSelection}
      />

      <NovaAtividadeDialog
        open={showNovaDialog}
        onOpenChange={setShowNovaDialog}
        onSuccess={handleSuccess}
        usuarios={usuarios}
        currentUser={currentUser}
        language={language}
      />

      {editingAtividade && (
        <EditarAtividadeDialog
          open={!!editingAtividade}
          onOpenChange={() => setEditingAtividade(null)}
          onSuccess={handleSuccess}
          atividade={editingAtividade}
          usuarios={usuarios}
          currentUser={currentUser}
          language={language}
        />
      )}
    </div>
  );
}
