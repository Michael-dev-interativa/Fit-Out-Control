
import React, { useState, useEffect } from "react";
import { DisciplinaGeral } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Edit, Trash2, BookOpen, Search, Hash } from "lucide-react";

const translations = {
  pt: {
    disciplines: "Disciplinas Gerais",
    addDiscipline: "Adicionar Disciplina",
    editDiscipline: "Editar Disciplina",
    deleteDiscipline: "Excluir Disciplina",
    description: "Descrição da Disciplina",
    prefix: "Prefixo Numérico",
    save: "Salvar",
    cancel: "Cancelar",
    edit: "Editar",
    delete: "Excluir",
    confirmDelete: "Confirmar Exclusão",
    deleteMessage: "Tem certeza que deseja excluir esta disciplina? Esta ação não pode ser desfeita.",
    noDisciplines: "Nenhuma disciplina encontrada",
    addFirstDiscipline: "Adicione a primeira disciplina",
    search: "Buscar disciplinas...",
    saving: "Salvando...",
    deleting: "Excluindo...",
    prefixPlaceholder: "Ex: 100, 200, 300..."
  },
  en: {
    disciplines: "General Disciplines",
    addDiscipline: "Add Discipline",
    editDiscipline: "Edit Discipline",
    deleteDiscipline: "Delete Discipline",
    description: "Discipline Description",
    prefix: "Numeric Prefix",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    confirmDelete: "Confirm Deletion",
    deleteMessage: "Are you sure you want to delete this discipline? This action cannot be undone.",
    noDisciplines: "No disciplines found",
    addFirstDiscipline: "Add the first discipline",
    search: "Search disciplines...",
    saving: "Saving...",
    deleting: "Deleting...",
    prefixPlaceholder: "Ex: 100, 200, 300..."
  }
};

export default function DisciplinaGeralManager({ language = 'pt', theme = 'light' }) {
  const [disciplinas, setDisciplinas] = useState([]);
  const [filteredDisciplinas, setFilteredDisciplinas] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    descricao_disciplina: "",
    prefixo_disciplina: ""
  });

  const t = translations[language];
  const isDark = theme === 'dark';

  useEffect(() => {
    loadDisciplinas();
  }, []);

  useEffect(() => {
    filterDisciplinas();
  }, [disciplinas, searchTerm]);

  const loadDisciplinas = async () => {
    try {
      setLoading(true);
      const data = await DisciplinaGeral.list("prefixo_disciplina");
      setDisciplinas(data);
    } catch (error) {
      console.error("Erro ao carregar disciplinas:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterDisciplinas = () => {
    let filtered = disciplinas;
    if (searchTerm) {
      filtered = filtered.filter(disciplina =>
        disciplina.descricao_disciplina?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        disciplina.prefixo_disciplina?.toString().includes(searchTerm)
      );
    }
    setFilteredDisciplinas(filtered);
  };

  const handleInputChange = (field, value) => {
    if (field === 'prefixo_disciplina') {
      // Aceitar apenas números
      const numericValue = value.replace(/[^0-9]/g, '');
      setFormData(prev => ({ ...prev, [field]: numericValue ? parseInt(numericValue) : "" }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const resetForm = () => {
    setFormData({
      descricao_disciplina: "",
      prefixo_disciplina: ""
    });
    setEditingRecord(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (disciplina) => {
    setFormData({
      descricao_disciplina: disciplina.descricao_disciplina || "",
      prefixo_disciplina: disciplina.prefixo_disciplina || ""
    });
    setEditingRecord(disciplina);
    setShowDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.descricao_disciplina.trim() || !formData.prefixo_disciplina) return;

    setSaving(true);
    try {
      if (editingRecord) {
        await DisciplinaGeral.update(editingRecord.id, formData);
      } else {
        await DisciplinaGeral.create(formData);
      }
      await loadDisciplinas();
      setShowDialog(false);
      resetForm();
    } catch (error) {
      console.error("Erro ao salvar disciplina:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (disciplina) => {
    try {
      await DisciplinaGeral.delete(disciplina.id);
      await loadDisciplinas();
    } catch (error) {
      console.error("Erro ao excluir disciplina:", error);
    }
  };

  const getDisciplinaColor = (index) => {
    const colors = [
      isDark ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700",
      isDark ? "bg-green-900/50 text-green-300" : "bg-green-100 text-green-700",
      isDark ? "bg-purple-900/50 text-purple-300" : "bg-purple-100 text-purple-700",
      isDark ? "bg-orange-900/50 text-orange-300" : "bg-orange-100 text-orange-700",
      isDark ? "bg-pink-900/50 text-pink-300" : "bg-pink-100 text-pink-700",
      isDark ? "bg-cyan-900/50 text-cyan-300" : "bg-cyan-100 text-cyan-700",
      isDark ? "bg-yellow-900/50 text-yellow-300" : "bg-yellow-100 text-yellow-700"
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <Card className={isDark ? 'bg-gray-800' : ''}>
        <CardHeader>
          <CardTitle className={isDark ? 'text-white' : ''}>{t.disciplines}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className={`h-16 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isDark ? 'bg-gray-800' : ''}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
            <BookOpen className="w-5 h-5" />
            {t.disciplines}
          </CardTitle>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                {t.addDiscipline}
              </Button>
            </DialogTrigger>
            <DialogContent className={isDark ? 'bg-gray-800' : ''}>
              <DialogHeader>
                <DialogTitle className={isDark ? 'text-white' : ''}>
                  {editingRecord ? t.editDiscipline : t.addDiscipline}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="descricao" className={isDark ? 'text-gray-300' : ''}>{t.description}</Label>
                  <Input
                    id="descricao"
                    value={formData.descricao_disciplina}
                    onChange={(e) => handleInputChange("descricao_disciplina", e.target.value)}
                    placeholder="Ex: Arquitetura, Estrutura, Elétrica..."
                    required
                    className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prefixo" className={isDark ? 'text-gray-300' : ''}>{t.prefix}</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="prefixo"
                      type="text"
                      value={formData.prefixo_disciplina}
                      onChange={(e) => handleInputChange("prefixo_disciplina", e.target.value)}
                      placeholder={t.prefixPlaceholder}
                      className={`pl-10 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDialog(false)}
                    className={isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : ''}
                  >
                    {t.cancel}
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving || !formData.descricao_disciplina.trim() || !formData.prefixo_disciplina}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {saving ? t.saving : t.save}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            placeholder={t.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`pl-10 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
          />
        </div>

        {/* Lista de disciplinas */}
        {filteredDisciplinas.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              {searchTerm ? t.noDisciplines : t.addFirstDiscipline}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredDisciplinas.map((disciplina, index) => (
              <div 
                key={disciplina.id}
                className={`p-4 rounded-lg border transition-colors ${isDark ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={getDisciplinaColor(index)}>
                        #{disciplina.prefixo_disciplina}
                      </Badge>
                      <h4 className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {disciplina.descricao_disciplina}
                      </h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openEditDialog(disciplina)}
                      title={t.edit}
                      className={isDark ? 'border-gray-600 hover:bg-gray-600' : ''}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="icon"
                          title={t.delete}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t.confirmDelete}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t.deleteMessage}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(disciplina)}
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
