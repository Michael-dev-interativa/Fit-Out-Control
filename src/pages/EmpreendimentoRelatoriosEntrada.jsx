import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Empreendimento, UnidadeEmpreendimento, FormularioVistoria } from "@/api/entities";
import { RelatorioEntrada } from "@/entities/RelatorioEntrada";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Plus, Eye, Edit, Trash2, AlertTriangle, FileText } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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

const translations = {
  pt: {
    title: "Relatórios de Entrada",
    backToProject: "Voltar ao Empreendimento",
    newReport: "Novo Relatório de Entrada",
    noReports: "Nenhum relatório de entrada encontrado",
    addFirstReport: "Adicione o primeiro relatório de entrada",
    unit: "Unidade",
    tenant: "Locatário",
    date: "Data",
    status: "Status",
    view: "Visualizar",
    edit: "Editar",
    delete: "Excluir",
    confirmDelete: "Confirmar Exclusão",
    deleteMessage: "Tem certeza que deseja excluir este relatório? Esta ação não pode ser desfeita.",
    loading: "Carregando...",
    selectUnit: "Selecionar Unidade",
    selectUnitDescription: "Escolha a unidade para criar o relatório de entrada",
    noUnits: "Nenhuma unidade encontrada neste empreendimento",
    cancel: "Cancelar",
    select: "Selecionar",
    inProgress: "Em Andamento",
    completed: "Concluído",
  },
  en: {
    title: "Entry Reports",
    backToProject: "Back to Project",
    newReport: "New Entry Report",
    noReports: "No entry reports found",
    addFirstReport: "Add the first entry report",
    unit: "Unit",
    tenant: "Tenant",
    date: "Date",
    status: "Status",
    view: "View",
    edit: "Edit",
    delete: "Delete",
    confirmDelete: "Confirm Deletion",
    deleteMessage: "Are you sure you want to delete this report? This action cannot be undone.",
    loading: "Loading...",
    selectUnit: "Select Unit",
    selectUnitDescription: "Choose the unit to create the entry report",
    noUnits: "No units found in this project",
    cancel: "Cancel",
    select: "Select",
    inProgress: "In Progress",
    completed: "Completed",
  }
};

const isValidId = (id) => id && String(id).trim() !== '' && !['null', 'undefined'].includes(String(id).toLowerCase());

const SelectUnitDialog = ({ open, onOpenChange, empreendimentoId, language, theme }) => {
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const t = translations[language];
  const isDark = theme === 'dark';

  useEffect(() => {
    if (open && isValidId(empreendimentoId)) {
      const loadUnidades = async () => {
        setLoading(true);
        try {
          const data = await UnidadeEmpreendimento.filter({ id_empreendimento: empreendimentoId });
          setUnidades(data);
        } catch (error) {
          console.error("Erro ao carregar unidades:", error);
          setUnidades([]);
        } finally {
          setLoading(false);
        }
      };
      loadUnidades();
    }
  }, [open, empreendimentoId]);

  const handleSelectUnidade = async (unidade) => {
    // Buscar o formulário "Relatório de Entrada de Locatário Padrão"
    try {
      const formularios = await FormularioVistoria.filter({
        nome_formulario: "Relatório de Entrada de Locatário Padrão",
        status_formulario: "Ativo"
      });

      const formularioId = formularios.length > 0 ? formularios[0].id : null;

      navigate(createPageUrl(`PreencherRelatorioEntrada?unidadeId=${unidade.id}&empreendimentoId=${empreendimentoId}${formularioId ? `&formularioId=${formularioId}` : ''}`));
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao buscar formulário:", error);
      // Se não encontrar, cria sem formulário
      navigate(createPageUrl(`PreencherRelatorioEntrada?unidadeId=${unidade.id}&empreendimentoId=${empreendimentoId}`));
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-2xl ${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white'}`}>
        <DialogHeader>
          <DialogTitle className={isDark ? 'text-white' : ''}>{t.selectUnit}</DialogTitle>
          <DialogDescription className={isDark ? 'text-gray-400' : ''}>{t.selectUnitDescription}</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            </div>
          ) : unidades.length > 0 ? (
            unidades.map((unidade) => (
              <div key={unidade.id} className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'}`}>
                <div>
                  <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{unidade.unidade_empreendimento}</p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{unidade.cliente_unidade}</p>
                </div>
                <Button
                  onClick={() => handleSelectUnidade(unidade)}
                  variant="outline"
                  size="sm"
                  className={isDark ? 'border-gray-600 text-white hover:bg-gray-500' : ''}
                >
                  {t.select}
                </Button>
              </div>
            ))
          ) : (
            <p className={`text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t.noUnits}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className={isDark ? 'border-gray-600 text-white hover:bg-gray-700' : ''}>
            {t.cancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function EmpreendimentoRelatoriosEntrada({ language: initialLanguage, theme: initialTheme }) {
  const navigate = useNavigate();
  const location = useLocation();

  const urlParams = new URLSearchParams(location.search);
  const empreendimentoId = urlParams.get('empreendimentoId');

  const [relatorios, setRelatorios] = useState([]);
  const [empreendimento, setEmpreendimento] = useState(null);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState(initialLanguage || 'pt');
  const [theme, setTheme] = useState(initialTheme || 'light');
  const [showSelectUnitDialog, setShowSelectUnitDialog] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const t = translations[language];
  const isDark = theme === 'dark';

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

  const loadData = async () => {
    if (!isValidId(empreendimentoId)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [empData, relatoriosData, unidadesData] = await Promise.all([
        Empreendimento.get(empreendimentoId),
        RelatorioEntrada.filter({ id_empreendimento: empreendimentoId }, '-created_date'),
        UnidadeEmpreendimento.filter({ id_empreendimento: empreendimentoId })
      ]);

      setEmpreendimento(empData);
      setRelatorios(relatoriosData);
      setUnidades(unidadesData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [empreendimentoId]);

  const handleDelete = async (relatorioId) => {
    setDeletingId(relatorioId);
    try {
      await RelatorioEntrada.delete(relatorioId);
      await loadData();
    } catch (error) {
      console.error("Erro ao excluir relatório:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleView = (relatorio) => {
    window.open(createPageUrl(`VisualizarRelatorioEntrada?relatorioId=${relatorio.id}`), '_blank');
  };

  const handleEdit = (relatorio) => {
    navigate(createPageUrl(`PreencherRelatorioEntrada?relatorioId=${relatorio.id}&unidadeId=${relatorio.id_unidade}&empreendimentoId=${empreendimentoId}`));
  };

  const getUnidadeNome = (unidadeId) => {
    const unidade = unidades.find(u => u.id === unidadeId);
    return unidade?.unidade_empreendimento || '-';
  };

  const getStatusBadgeClass = (status) => {
    return status === 'Concluído'
      ? 'bg-green-100 text-green-800'
      : 'bg-yellow-100 text-yellow-800';
  };

  if (!isValidId(empreendimentoId)) {
    return (
      <div className={`flex flex-col items-center justify-center h-screen p-8 text-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <Button onClick={() => navigate(createPageUrl('Empreendimentos'))}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t.backToProject}
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
        <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>{t.loading}</p>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.title}</h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{empreendimento?.nome_empreendimento}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowSelectUnitDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            {t.newReport}
          </Button>
        </div>
      </div>

      <Card className={isDark ? 'bg-gray-800' : ''}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
            <FileText className="w-5 h-5" />
            Relatórios de Entrada
          </CardTitle>
        </CardHeader>
        <CardContent>
          {relatorios.length > 0 ? (
            <div className="space-y-3">
              {relatorios.map(relatorio => (
                <div key={relatorio.id} className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {relatorio.nome_relatorio}
                      </h3>
                      <div className={`text-sm mt-2 space-y-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <p><strong>{t.unit}:</strong> {getUnidadeNome(relatorio.id_unidade)}</p>
                        <p><strong>{t.tenant}:</strong> {relatorio.locatario || '-'}</p>
                        <p><strong>{t.date}:</strong> {relatorio.data_entrada ? format(new Date(relatorio.data_entrada), "dd/MM/yyyy", { locale: pt }) : '-'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={getStatusBadgeClass(relatorio.status_entrada)}>
                        {relatorio.status_entrada}
                      </Badge>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(relatorio)}
                          className={isDark ? 'border-gray-600 text-blue-400 hover:bg-gray-600' : 'text-blue-600'}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(relatorio)}
                          className={isDark ? 'border-gray-600 text-white hover:bg-gray-600' : ''}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={deletingId === relatorio.id}
                            >
                              {deletingId === relatorio.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
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
                              <AlertDialogCancel className={isDark ? 'border-gray-600 text-white hover:bg-gray-700' : ''}>
                                {t.cancel}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(relatorio.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                {t.delete}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={`mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t.noReports}</p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t.addFirstReport}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        variant="outline"
        onClick={() => navigate(createPageUrl(`Empreendimento?empreendimentoId=${empreendimentoId}`))}
        className={isDark ? 'border-gray-600 text-white hover:bg-gray-700' : ''}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t.backToProject}
      </Button>

      <SelectUnitDialog
        open={showSelectUnitDialog}
        onOpenChange={setShowSelectUnitDialog}
        empreendimentoId={empreendimentoId}
        language={language}
        theme={theme}
      />
    </div>
  );
}