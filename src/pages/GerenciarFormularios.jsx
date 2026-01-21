
import React, { useState, useEffect } from "react";
import { FormularioVistoria } from "@/api/entities";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Edit, 
  Eye,
  Trash2,
  FileText,
  Shield,
  Loader2
} from "lucide-react";
import NovoFormularioDialog from "../components/formularios/NovoFormularioDialog";
import EditarFormularioDialog from "../components/formularios/EditarFormularioDialog";
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
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const translations = {
  pt: {
    title: "Gerenciar Formulários",
    subtitle: "Crie e gerencie os modelos de vistoria do sistema.",
    newForm: "Novo Formulário",
    massUpdate: "Atualização em Massa",
    searchPlaceholder: "Buscar por nome...",
    name: "Nome",
    description: "Descrição",
    sections: "Seções",
    status: "Status",
    actions: "Ações",
    active: "Ativo",
    inactive: "Inativo",
    delete: "Excluir",
    confirmDelete: "Confirmar Exclusão",
    deleteMessage: "Tem certeza que deseja excluir este formulário? Esta ação é irreversível.",
    noForms: "Nenhum formulário encontrado.",
    addFirst: "Adicione o primeiro formulário para começar.",
    restrictedAccess: "Acesso Restrito",
    adminOnly: "Apenas administradores podem acessar esta página.",
  },
  en: {
    title: "Manage Forms",
    subtitle: "Create and manage system inspection templates.",
    newForm: "New Form",
    massUpdate: "Mass Update",
    searchPlaceholder: "Search by name...",
    name: "Name",
    description: "Description",
    sections: "Sections",
    status: "Status",
    actions: "Actions",
    active: "Active",
    inactive: "Inactive",
    delete: "Delete",
    confirmDelete: "Confirm Deletion",
    deleteMessage: "Are you sure you want to delete this form? This action is irreversible.",
    noForms: "No forms found.",
    addFirst: "Add the first form to get started.",
    restrictedAccess: "Restricted Access",
    adminOnly: "Only administrators can access this page.",
  }
};

export default function GerenciarFormularios({ language: initialLanguage = 'pt', theme: initialTheme = 'light' }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [formularios, setFormularios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNovoDialog, setShowNovoDialog] = useState(false);
  const [editingFormulario, setEditingFormulario] = useState(null);
  const [showEditarDialog, setShowEditarDialog] = useState(false);
  
  const navigate = useNavigate();
  const t = translations[initialLanguage];
  const isDark = initialTheme === 'dark';

  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
        if (user.role !== 'admin') {
          // Non-admins are redirected
          navigate(createPageUrl("Dashboard"));
        } else {
          loadFormularios();
        }
      } catch (error) {
        // Not logged in, redirect
        navigate(createPageUrl("Dashboard"));
      }
    };
    checkUser();
  }, [navigate]);

  const loadFormularios = async () => {
    setLoading(true);
    try {
      const data = await FormularioVistoria.list("-created_date");
      setFormularios(data);
    } catch (error) {
      console.error("Erro ao carregar formulários:", error);
    }
    setLoading(false);
  };

  const handleSuccess = () => {
    loadFormularios();
    setShowNovoDialog(false);
    setShowEditarDialog(false);
  };

  const handleEdit = (form) => {
    setEditingFormulario(form);
    setShowEditarDialog(true);
  };

  const handleDelete = async (formId) => {
    try {
      await FormularioVistoria.delete(formId);
      loadFormularios();
    } catch (error) {
      console.error("Erro ao excluir formulário:", error);
    }
  };

  const filteredFormularios = formularios.filter(form =>
    form.nome_formulario.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="p-6">
        <Card className={`max-w-md mx-auto text-center ${isDark ? 'bg-gray-800' : ''}`}>
          <CardContent className="p-8">
            <Shield className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>{t.restrictedAccess}</h2>
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{t.adminOnly}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${isDark ? 'bg-gray-900' : ''}`}>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.title}</h1>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>{t.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => navigate(createPageUrl('AtualizarFormularioEmMassa'))} 
            variant="outline"
            className={isDark ? 'border-gray-600 text-white hover:bg-gray-700' : ''}
          >
            {t.massUpdate}
          </Button>
          <Button onClick={() => setShowNovoDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            {t.newForm}
          </Button>
        </div>
      </div>

      <Card className={isDark ? 'bg-gray-800' : ''}>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-10 ${isDark ? 'bg-gray-700 border-gray-600' : ''}`}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" /></div>
          ) : filteredFormularios.length === 0 ? (
            <div className="text-center py-12">
              <FileText className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.noForms}</h3>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{searchTerm ? '' : t.addFirst}</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredFormularios.map(form => (
                <Card key={form.id} className={`${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50'}`}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className={`font-semibold ${isDark ? 'text-white' : ''}`}>{form.nome_formulario}</h4>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{form.descricao_formulario}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant="secondary" className={isDark ? 'bg-gray-600 text-gray-300' : ''}>{form.secoes?.length || 0} {t.sections}</Badge>
                        <Badge className={form.status_formulario === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {form.status_formulario === 'Ativo' ? t.active : t.inactive}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleEdit(form)}><Edit className="w-4 h-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon"><Trash2 className="w-4 h-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t.confirmDelete}</AlertDialogTitle>
                            <AlertDialogDescription>{t.deleteMessage}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(form.id)} className="bg-red-600 hover:bg-red-700">{t.delete}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <NovoFormularioDialog
        open={showNovoDialog}
        onOpenChange={setShowNovoDialog}
        onSuccess={handleSuccess}
        language={initialLanguage}
        theme={initialTheme}
      />

      {editingFormulario && (
        <EditarFormularioDialog
          open={showEditarDialog}
          onOpenChange={setShowEditarDialog}
          formulario={editingFormulario}
          onSuccess={handleSuccess}
          language={initialLanguage}
          theme={initialTheme}
        />
      )}
    </div>
  );
}
