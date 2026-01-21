
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { RespostaVistoria } from '@/api/entities';
import { FormularioVistoria } from '@/api/entities';
import UnidadeHeader from '../components/unidade/UnidadeHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, ArrowLeft, Loader2, AlertTriangle, ListChecks, Edit, Trash2 } from 'lucide-react';
import { useUnidadeData } from '@/components/hooks/useUnidadeData';
import { format } from 'date-fns';
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
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

const translations = {
  pt: {
    title: "Vistoria de Obras",
    backToUnit: "Voltar para Unidade",
    newInspection: "Iniciar Nova Vistoria",
    previousInspections: "Vistorias Anteriores",
    noPreviousInspections: "Nenhuma vistoria anterior encontrada.",
    inspectionDate: "Data",
    status: "Status",
    viewReport: "Ver Relatório",
    edit: "Editar",
    delete: "Excluir",
    confirmDelete: "Confirmar Exclusão",
    deleteMessage: "Tem certeza que deseja excluir esta vistoria? Esta ação não pode ser desfeita.",
    errorTitle: "Erro ao Carregar Dados",
    backToProjects: "Voltar aos Empreendimentos",
    loading: "Carregando dados...",
    selectForm: "Iniciar Nova Vistoria",
    selectFormDescription: "Selecione um formulário para iniciar a vistoria ou crie uma vistoria avulsa.",
    createAdHocInspection: "Criar Vistoria Avulsa (sem formulário)",
    orUseTemplate: "Ou use um modelo existente",
    noFormsFound: "Nenhum formulário ativo encontrado.",
    select: "Selecionar"
  },
  en: {
    title: "Work Inspection",
    backToUnit: "Back to Unit",
    newInspection: "Start New Inspection",
    previousInspections: "Previous Inspections",
    noPreviousInspections: "No previous inspections found.",
    inspectionDate: "Date",
    status: "Status",
    viewReport: "View Report",
    edit: "Edit",
    delete: "Delete",
    confirmDelete: "Confirm Deletion",
    deleteMessage: "Are you sure you want to delete this inspection? This action cannot be undone.",
    errorTitle: "Error Loading Data",
    backToProjects: "Back to Projects",
    loading: "Loading data...",
    selectForm: "Start New Inspection",
    selectFormDescription: "Select a form to start the inspection or create an ad-hoc inspection.",
    createAdHocInspection: "Create Ad-Hoc Inspection (no form)",
    orUseTemplate: "Or use an existing template",
    noFormsFound: "No active forms found.",
    select: "Select"
  },
};

const isValidId = (id) => id && String(id).trim() !== '' && !['null', 'undefined'].includes(String(id).toLowerCase());

const NovaVistoriaDialog = ({ open, onOpenChange, unidade, empreendimento, language, theme }) => {
  const [formularios, setFormularios] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const t = translations[language];
  const isDark = theme === 'dark';

  useEffect(() => {
    if (open) {
      const loadFormularios = async () => {
        setLoading(true);
        try {
          const data = await FormularioVistoria.filter({ status_formulario: "Ativo" });
          setFormularios(data);
        } catch (error) {
          console.error("Erro ao carregar formulários:", error);
          setFormularios([]);
        } finally {
          setLoading(false);
        }
      };
      loadFormularios();
    } else {
      setFormularios([]);
      setLoading(true);
    }
  }, [open]);

  const handleSelectFormulario = (formId) => {
    navigate(createPageUrl(`PreencherVistoria?unidadeId=${unidade.id}&empreendimentoId=${empreendimento.id}&formularioId=${formId}`));
    onOpenChange(false);
  };

  const handleCriarVistoriaAvulsa = () => {
    navigate(createPageUrl(`PreencherVistoria?unidadeId=${unidade.id}&empreendimentoId=${empreendimento.id}&avulsa=true`));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-2xl ${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white'}`}>
        <DialogHeader>
          <DialogTitle className={isDark ? 'text-white' : ''}>{t.selectForm}</DialogTitle>
          <DialogDescription className={isDark ? 'text-gray-400' : ''}>{t.selectFormDescription}</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <Button 
            onClick={handleCriarVistoriaAvulsa} 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t.createAdHocInspection}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className={`w-full border-t ${isDark ? 'border-gray-600' : 'border-gray-300'}`} />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className={`px-2 ${isDark ? 'bg-gray-800 text-gray-500' : 'bg-white text-gray-500'}`}>{t.orUseTemplate}</span>
            </div>
          </div>

          {loading ? (
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            </div>
          ) : formularios.length > 0 ? (
            <div className="space-y-2">
              {formularios.map((form) => (
                <div key={form.id} className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'}`}>
                  <span className={isDark ? 'text-white' : 'text-gray-900'}>{form.nome_formulario}</span>
                  <Button 
                    onClick={() => handleSelectFormulario(form.id)} 
                    variant="outline" 
                    size="sm"
                    className={isDark ? 'border-gray-600 text-white hover:bg-gray-500' : ''}
                  >
                    {t.select}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t.noFormsFound}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className={isDark ? 'border-gray-600 text-white hover:bg-gray-700' : ''}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function IniciarVistoria(props) {
  const navigate = useNavigate();
  const location = useLocation();

  const urlParams = new URLSearchParams(location.search);
  const unidadeId = urlParams.get('unidadeId');
  const empreendimentoId = urlParams.get('empreendimentoId');

  const { unidade, empreendimento, loading, error } = useUnidadeData(unidadeId, empreendimentoId);
  const [vistorias, setVistorias] = useState([]);
  const [loadingVistorias, setLoadingVistorias] = useState(true);
  const [language, setLanguage] = useState(props.language || 'pt');
  const [theme, setTheme] = useState(props.theme || 'light');

  const [deletingVistoria, setDeletingVistoria] = useState(null);
  const [isNewInspectionDialogOpen, setIsNewInspectionDialogOpen] = useState(false);

  const t = translations[language];
  const isDark = theme === 'dark';

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Liberado para Ocupação':
      case 'Liberado Para Ocupação':
        return `bg-green-100 text-green-800 ${isDark ? 'dark:bg-green-900/50 dark:text-green-300' : ''}`;
      case 'Não Liberado para Ocupação':
      case 'Não Liberado Para Ocupação':
        return `bg-red-100 text-red-800 ${isDark ? 'dark:bg-red-900/50 dark:text-red-300' : ''}`;
      case 'Em Andamento':
      default:
        return `bg-yellow-100 text-yellow-800 ${isDark ? 'dark:bg-yellow-900/50 dark:text-yellow-300' : ''}`;
    }
  };

  const loadVistorias = useCallback(async () => {
    setLoadingVistorias(true);
    try {
      if (isValidId(unidadeId)) {
        const data = await RespostaVistoria.filter({ id_unidade: unidadeId }, '-created_date');
        setVistorias(data);
      } else {
        setVistorias([]);
      }
    } catch (err) {
      console.error("Erro ao carregar vistorias:", err);
    }
    setLoadingVistorias(false);
  }, [unidadeId]);

  useEffect(() => {
    if (unidadeId) {
      loadVistorias();
    }
  }, [unidadeId, loadVistorias]);

  useEffect(() => {
    const handleLanguageChange = () => setLanguage(localStorage.getItem('language') || 'pt');
    const handleThemeChange = () => setTheme(localStorage.getItem('theme') || 'light');
    window.addEventListener('language-change', handleLanguageChange);
    window.addEventListener('theme-change', handleThemeChange);
    return () => {
      window.removeEventListener('language-change', handleLanguageChange);
      window.removeEventListener('theme-change', handleThemeChange);
    };
  }, []);

  const handleDeleteVistoria = async (vistoria) => {
    setDeletingVistoria(vistoria.id);
    try {
      await RespostaVistoria.delete(vistoria.id);
      await loadVistorias();
    } catch (error) {
      console.error("Erro ao excluir vistoria:", error);
      alert("Erro ao excluir vistoria. Por favor, tente novamente.");
    } finally {
      setDeletingVistoria(null);
    }
  };

  const handleVerRelatorio = (resposta) => {
    const url = createPageUrl(`VisualizarRelatorioVistoria?respostaId=${resposta.id}&unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`);
    window.open(url, '_blank');
  };

  const handleEditarResposta = (resposta) => {
    const queryParams = new URLSearchParams();
    queryParams.set('respostaId', resposta.id);
    queryParams.set('unidadeId', unidadeId);
    queryParams.set('empreendimentoId', empreendimentoId);
    queryParams.set('modo', 'edicao');
    if (resposta.id_formulario) {
      queryParams.set('formularioId', resposta.id_formulario);
    } else {
      queryParams.set('avulsa', 'true');
    }
    navigate(createPageUrl(`PreencherVistoria?${queryParams.toString()}`));
  };

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center h-screen p-6 ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50'}`}>
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
        <p className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>
          {t.loading || "Carregando dados..."}
        </p>
      </div>
    );
  }

  if (error || !isValidId(unidadeId) || !isValidId(empreendimentoId)) {
    return (
      <div className={`flex flex-col items-center justify-center h-screen p-8 text-center ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50'}`}>
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-red-600 mb-4">{t.errorTitle}</h2>
        <p className={`mb-6 max-w-md ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          {error?.message || `ID da unidade ou empreendimento inválido na URL. Unidade: '${unidadeId}', Empreendimento: '${empreendimentoId}'`}
        </p>
        <Button onClick={() => navigate(createPageUrl("Empreendimentos"))}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t.backToProjects}
        </Button>
      </div>
    );
  }

  return (
    <div className={`p-4 md:p-6 space-y-6 ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50'}`}>
      <UnidadeHeader 
        unidade={unidade} 
        empreendimento={empreendimento} 
        language={language}
        theme={theme}
      />
      
      <Card className={isDark ? 'bg-gray-800' : ''}>
        <CardContent className="p-4">
          <Button 
            className="w-full bg-black text-white hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600"
            onClick={() => setIsNewInspectionDialogOpen(true)}
            disabled={!isValidId(unidadeId) || !isValidId(empreendimentoId)}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t.newInspection}
          </Button>
        </CardContent>
      </Card>
      
      <NovaVistoriaDialog 
        open={isNewInspectionDialogOpen}
        onOpenChange={setIsNewInspectionDialogOpen}
        unidade={unidade}
        empreendimento={empreendimento}
        language={language}
        theme={theme}
      />

      <Card className={isDark ? 'bg-gray-800' : ''}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
            <ListChecks />
            {t.previousInspections}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingVistorias ? (
            <div className="text-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
            </div>
          ) : vistorias.length > 0 ? (
            <div className="space-y-3">
              {vistorias.map(vistoria => (
                <div key={vistoria.id} className={`p-3 rounded-lg flex items-center justify-between transition-colors ${isDark ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
                  <div>
                    <p className={`font-semibold ${isDark ? 'text-white' : ''}`}>{vistoria.nome_vistoria || `Vistoria ${vistoria.id}`}</p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t.inspectionDate}: {format(new Date(vistoria.data_vistoria || vistoria.created_date), "dd/MM/yyyy")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusBadgeClass(vistoria.status_vistoria || 'Em Andamento')}>
                      {vistoria.status_vistoria || 'Em Andamento'}
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditarResposta(vistoria)}
                      className={`text-blue-600 hover:text-blue-700 ${isDark ? 'border-gray-600 text-blue-400 hover:bg-gray-700 hover:text-blue-300' : ''}`}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      {t.edit}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleVerRelatorio(vistoria)}
                      className={isDark ? 'border-gray-600 text-white hover:bg-gray-700' : ''}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {t.viewReport}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          disabled={deletingVistoria === vistoria.id}
                        >
                          {deletingVistoria === vistoria.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 mr-2" />
                          )}
                          {t.delete}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className={isDark ? 'bg-gray-800 text-gray-100' : ''}>
                        <AlertDialogHeader>
                          <AlertDialogTitle className={isDark ? 'text-white' : ''}>{t.confirmDelete}</AlertDialogTitle>
                          <AlertDialogDescription className={isDark ? 'text-gray-400' : ''}>
                            {t.deleteMessage}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className={isDark ? 'border-gray-600 text-white hover:bg-gray-700' : ''}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteVistoria(vistoria)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {t.delete}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-center py-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t.noPreviousInspections}</p>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <Button 
          variant="outline" 
          onClick={() => navigate(createPageUrl(`Unidade?unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`))}
          className={isDark ? 'border-gray-600 text-white hover:bg-gray-700' : ''}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.backToUnit}
        </Button>
      </div>
    </div>
  );
}
