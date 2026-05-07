import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Empreendimento, ListaDocumentosReport } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, FileText, Calendar, Loader2, Eye, Edit, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { parseLocalDate } from '../lib/dateUtils';

// Formata datas aceitando strings 'YYYY-MM-DD', 'DD/MM/YYYY' ou Date objects
const formatDate = (value) => {
  if (!value) return '';
  try {
    const d = parseLocalDate(value);
    if (!d || isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR');
  } catch {
    return '';
  }
};

const translations = {
  pt: {
    backToProject: "Voltar ao Empreendimento",
    documentList: "Lista de Documentos",
    newDocument: "Novo Documento",
    loading: "Carregando documentos...",
    noDocuments: "Nenhum documento encontrado",
    addFirstDocument: "Adicione o primeiro documento para este empreendimento.",
    documentNumber: "Documento",
    date: "Data",
    type: "Tipo",
    status: "Status",
    actions: "Ações",
    view: "Visualizar",
    edit: "Editar",
    delete: "Excluir",
    confirmDelete: "Confirmar Exclusão",
    confirmDeleteMessage: "Tem certeza que deseja excluir este documento?",
    cancel: "Cancelar",
    deleteSuccess: "Documento excluído com sucesso"
  },
  en: {
    backToProject: "Back to Project",
    documentList: "Document List",
    newDocument: "New Document",
    loading: "Loading documents...",
    noDocuments: "No documents found",
    addFirstDocument: "Add the first document for this project.",
    documentNumber: "Document",
    date: "Date",
    type: "Type",
    status: "Status",
    actions: "Actions",
    view: "View",
    edit: "Edit",
    delete: "Delete",
    confirmDelete: "Confirm Deletion",
    confirmDeleteMessage: "Are you sure you want to delete this document?",
    cancel: "Cancel",
    deleteSuccess: "Document deleted successfully"
  }
};

const getStatusBadge = (status, isDark) => {
  const statusConfig = {
    'Rascunho': { color: 'bg-gray-500', label: 'Rascunho' },
    'Em Análise': { color: 'bg-blue-500', label: 'Em Análise' },
    'Aprovado': { color: 'bg-green-500', label: 'Aprovado' },
    'Arquivado': { color: 'bg-gray-400', label: 'Arquivado' }
  };
  const config = statusConfig[status] || statusConfig['Rascunho'];
  return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
};

export default function EmpreendimentoListaDocumentosReport({ language: initialLanguage, theme: initialTheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const empreendimentoId = urlParams.get('empreendimentoId');

  const [empreendimento, setEmpreendimento] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentoToDelete, setDocumentoToDelete] = useState(null);
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
    loadData();
  }, [empreendimentoId]);

  const loadData = async () => {
    if (!empreendimentoId) return;

    setLoading(true);
    try {
      const [empData, docsData] = await Promise.all([
        Empreendimento.get(empreendimentoId),
        ListaDocumentosReport.filter({ id_empreendimento: empreendimentoId }, '-created_date')
      ]);

      setEmpreendimento(empData);
      setDocumentos(docsData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!documentoToDelete) return;

    try {
      await ListaDocumentosReport.delete(documentoToDelete.id);
      setDeleteDialogOpen(false);
      setDocumentoToDelete(null);
      loadData();
    } catch (error) {
      console.error("Erro ao excluir documento:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className={`ml-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t.loading}</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-6 space-y-6`}>
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl(`Empreendimento?empreendimentoId=${empreendimentoId}`))}
          className={isDark ? 'text-white border-gray-600 hover:bg-gray-800' : ''}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.backToProject}
        </Button>

        <Button
          onClick={() => navigate(createPageUrl(`NovoListaDocumentosReport?empreendimentoId=${empreendimentoId}`))}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t.newDocument}
        </Button>
      </div>

      <Card className={isDark ? 'bg-gray-800' : ''}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
            <FileText className="w-5 h-5" />
            {t.documentList} - {empreendimento?.nome_empreendimento}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documentos.length === 0 ? (
            <div className="text-center py-12">
              <FileText className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} mb-4`}>{t.noDocuments}</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t.addFirstDocument}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documentos.map((doc) => (
                <Card key={doc.id} className={`${isDark ? 'bg-gray-700' : 'bg-white'} hover:shadow-lg transition-shadow`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {doc.numero_documento || 'S/N'}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {doc.titulo || 'Lista de Documentos'}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(doc.status_documento, isDark)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                        {formatDate(doc.data_aviso) || 'Data não definida'}
                      </span>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(createPageUrl(`VisualizarListaDocumentos?documentoId=${doc.id}`))}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        {t.view}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(createPageUrl(`EditarListaDocumentosReport?documentoId=${doc.id}`))}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        {t.edit}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDocumentoToDelete(doc);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmDelete}</AlertDialogTitle>
            <AlertDialogDescription>{t.confirmDeleteMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}