import React, { useState, useEffect, useMemo } from "react";
import { RegistroGeral } from "@/api/entities";
import { DisciplinaGeral } from "@/api/entities"; // New import
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Plus, Edit, Trash2, FileText, Search } from "lucide-react";
import _ from 'lodash'; // New import

const tipoOptions = ["Kick Off", "Análise de Projetos", "Vistoria de Obras"];
const emissaoOptions = ["1ª Emissão", "2ª Emissão", "3ª Emissão", "4ª Emissão", "5ª Emissão"];

const translations = {
  pt: {
    generalRecords: "Registros Gerais",
    addRecord: "Adicionar Registro",
    editRecord: "Editar Registro",
    deleteRecord: "Excluir Registro",
    description: "Descrição",
    recordType: "Tipo de Registro",
    reportType: "Tipo de Relatório",
    discipline: "Disciplina",
    issueType: "Emissão",
    save: "Salvar",
    cancel: "Cancelar",
    edit: "Editar",
    delete: "Excluir",
    confirmDelete: "Confirmar Exclusão",
    deleteMessage: "Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.",
    noRecords: "Nenhum registro encontrado",
    addFirstRecord: "Adicione o primeiro registro geral",
    search: "Buscar registros...",
    saving: "Salvando...",
    deleting: "Excluindo..."
  },
  en: {
    generalRecords: "General Records",
    addRecord: "Add Record",
    editRecord: "Edit Record",
    deleteRecord: "Delete Record",
    description: "Description",
    recordType: "Record Type",
    reportType: "Report Type",
    discipline: "Discipline",
    issueType: "Issue Type",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    confirmDelete: "Confirm Deletion",
    deleteMessage: "Are you sure you want to delete this record? This action cannot be undone.",
    noRecords: "No records found",
    addFirstRecord: "Add the first general record",
    search: "Search records...",
    saving: "Saving...",
    deleting: "Deleting..."
  }
};

export default function RegistroGeralManager({ language = 'pt', theme = 'light' }) {
  const [registros, setRegistros] = useState([]);
  const [filteredRegistros, setFilteredRegistros] = useState([]);
  const [disciplinasGerais, setDisciplinasGerais] = useState([]); // New state
  const [disciplinaPrefixMap, setDisciplinaPrefixMap] = useState({}); // New state
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    descricao_registro: "",
    tipo_registro: tipoOptions[0],
    tipo_relatorio: "",
    disciplina: "", // Changed default to empty string
    emissao_registro: "1ª Emissão"
  });

  const t = translations[language];
  const isDark = theme === 'dark';

  useEffect(() => {
    loadData(); // Changed from loadRegistros
  }, []);

  useEffect(() => {
    filterRegistros();
  }, [registros, searchTerm]);

  const loadData = async () => { // Renamed from loadRegistros
    try {
      setLoading(true);
      const [registrosData, disciplinasData] = await Promise.all([
        RegistroGeral.list("-created_date", 500), // Limit to 500 most recent records
        DisciplinaGeral.list("prefixo_disciplina") // Fetches disciplines and sorts by prefix
      ]);
      
      setRegistros(registrosData);
      setDisciplinasGerais(disciplinasData);

      // Criar mapa de prefixos
      const prefixMap = disciplinasData.reduce((acc, disc) => {
          acc[disc.descricao_disciplina] = disc.prefixo_disciplina;
          return acc;
      }, {});
      setDisciplinaPrefixMap(prefixMap);

      // Definir disciplina padrão se ainda não estiver definida e houver disciplinas carregadas
      if (!formData.disciplina && disciplinasData.length > 0) {
        setFormData(prev => ({ ...prev, disciplina: disciplinasData[0].descricao_disciplina }));
      }

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterRegistros = () => {
    let filtered = registros;
    if (searchTerm) {
      filtered = filtered.filter(registro =>
        registro.descricao_registro?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        registro.tipo_registro?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        registro.tipo_relatorio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        registro.disciplina?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredRegistros(filtered);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      descricao_registro: "",
      tipo_registro: tipoOptions[0],
      tipo_relatorio: "",
      disciplina: disciplinasGerais.length > 0 ? disciplinasGerais[0].descricao_disciplina : "", // Set default from loaded disciplines
      emissao_registro: "1ª Emissão"
    });
    setEditingRecord(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (registro) => {
    setFormData({
      descricao_registro: registro.descricao_registro || "",
      tipo_registro: registro.tipo_registro || tipoOptions[0],
      tipo_relatorio: registro.tipo_relatorio || "",
      disciplina: registro.disciplina || (disciplinasGerais.length > 0 ? disciplinasGerais[0].descricao_disciplina : ""), // Set default from loaded disciplines
      emissao_registro: registro.emissao_registro || "1ª Emissão"
    });
    setEditingRecord(registro);
    setShowDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.descricao_registro.trim()) return;

    setSaving(true);
    try {
      if (editingRecord) {
        await RegistroGeral.update(editingRecord.id, formData);
      } else {
        const { disciplina, tipo_registro, tipo_relatorio } = formData;
        // Filter records by discipline, type, and report type to get the next sequential number
        const existingRecords = await RegistroGeral.filter({ disciplina, tipo_registro, tipo_relatorio });
        const maxNumeracao = existingRecords.reduce((max, r) => (r.numeracao || 0) > max ? r.numeracao : max, 0);
        const newNumeracao = maxNumeracao + 1; // This will start at 1 since maxNumeracao starts at 0
        
        await RegistroGeral.create({ ...formData, numeracao: newNumeracao });
      }
      await loadData();
      setShowDialog(false);
      resetForm();
    } catch (error) {
      console.error("Erro ao salvar registro:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (registro) => {
    try {
      await RegistroGeral.delete(registro.id);
      await loadData(); // Changed from loadRegistros
    } catch (error) {
      console.error("Erro ao excluir registro:", error);
    }
  };

  const getTipoColor = (tipo) => {
    const colors = {
      "Kick Off": isDark ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700",
      "Análise de Projetos": isDark ? "bg-green-900/50 text-green-300" : "bg-green-100 text-green-700",
      "Vistoria de Obras": isDark ? "bg-purple-900/50 text-purple-300" : "bg-purple-100 text-purple-700"
    };
    return colors[tipo] || (isDark ? "bg-gray-900/50 text-gray-300" : "bg-gray-100 text-gray-700");
  };

  const getDisciplinaColor = (disciplina) => {
    // This function still uses hardcoded colors for specific discipline names.
    // If discipline names can vary widely from DB, consider a more dynamic color assignment
    // or ensuring these specific names are always present in the DB.
    const colors = {
      "Arquitetura": isDark ? "bg-pink-900/50 text-pink-300" : "bg-pink-100 text-pink-700",
      "Estrutura": isDark ? "bg-orange-900/50 text-orange-300" : "bg-orange-100 text-orange-700",
      "Civil": isDark ? "bg-yellow-900/50 text-yellow-300" : "bg-yellow-100 text-yellow-700",
      "Elétrica": isDark ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700",
      "Hidráulica": isDark ? "bg-cyan-900/50 text-cyan-300" : "bg-cyan-100 text-cyan-700",
      "Incêndio": isDark ? "bg-red-900/50 text-red-300" : "bg-red-100 text-red-700",
      "Climatização": isDark ? "bg-indigo-900/50 text-indigo-300" : "bg-indigo-100 text-indigo-700"
    };
    return colors[disciplina] || (isDark ? "bg-gray-900/50 text-gray-300" : "bg-gray-100 text-gray-700");
  };

  if (loading) {
    return (
      <Card className={isDark ? 'bg-gray-800' : ''}>
        <CardHeader>
          <CardTitle className={isDark ? 'text-white' : ''}>{t.generalRecords}</CardTitle>
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
            <FileText className="w-5 h-5" />
            {t.generalRecords}
          </CardTitle>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                {t.addRecord}
              </Button>
            </DialogTrigger>
            <DialogContent className={isDark ? 'bg-gray-800' : ''}>
              <DialogHeader>
                <DialogTitle className={isDark ? 'text-white' : ''}>
                  {editingRecord ? t.editRecord : t.addRecord}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="descricao" className={isDark ? 'text-gray-300' : ''}>{t.description}</Label>
                  <Input
                    id="descricao"
                    value={formData.descricao_registro}
                    onChange={(e) => handleInputChange("descricao_registro", e.target.value)}
                    placeholder="Digite a descrição do registro..."
                    required
                    className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                  />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="tipo_relatorio" className={isDark ? 'text-gray-300' : ''}>{t.reportType}</Label>
                  <Input
                    id="tipo_relatorio"
                    value={formData.tipo_relatorio}
                    onChange={(e) => handleInputChange("tipo_relatorio", e.target.value)}
                    placeholder="Ex: Memorial Descritivo, RRT, etc."
                    className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className={isDark ? 'text-gray-300' : ''}>{t.recordType}</Label>
                    <Select value={formData.tipo_registro} onValueChange={(v) => handleInputChange('tipo_registro', v)}>
                      <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tipoOptions.map(tipo => (
                          <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className={isDark ? 'text-gray-300' : ''}>{t.discipline}</Label>
                    <Select value={formData.disciplina} onValueChange={(v) => handleInputChange('disciplina', v)}>
                      <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {disciplinasGerais.map(disciplina => (
                          <SelectItem key={disciplina.id} value={disciplina.descricao_disciplina}>
                            {disciplina.descricao_disciplina}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className={isDark ? 'text-gray-300' : ''}>{t.issueType}</Label>
                  <Select value={formData.emissao_registro} onValueChange={(v) => handleInputChange('emissao_registro', v)}>
                    <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {emissaoOptions.map(emissao => (
                        <SelectItem key={emissao} value={emissao}>{emissao}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    disabled={saving || !formData.descricao_registro.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
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

        {/* Lista de registros agrupada */}
        {filteredRegistros.length === 0 ? (
          <div className="text-center py-8">
            <FileText className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              {searchTerm ? t.noRecords : t.addFirstRecord}
            </p>
          </div>
        ) : (
          <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
            {Object.entries(_.groupBy(filteredRegistros, 'tipo_registro')).map(([tipo, group1]) => (
              <div key={tipo}>
                <h3 className={`font-bold text-lg mb-2 pb-1 border-b ${isDark ? 'text-blue-400 border-gray-700' : 'text-blue-600 border-gray-200'}`}>{tipo}</h3>
                {Object.entries(_.groupBy(group1, 'emissao_registro')).map(([emissao, group2]) => (
                  <div key={emissao} className="pl-2">
                    <h4 className={`font-semibold mt-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}>{emissao}</h4>
                    {Object.entries(_.groupBy(group2, (item) => item.tipo_relatorio || "Geral")).map(([tipoRelatorio, group3]) => (
                      <div key={tipoRelatorio} className="pl-4">
                        <h5 className={`font-medium text-base mt-1.5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>{tipoRelatorio}</h5>
                        {Object.entries(_.groupBy(group3, 'disciplina')).map(([disciplina, registros]) => (
                          <div key={disciplina} className="pl-6">
                            <h6 className={`font-medium text-sm mt-1 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>{disciplina}</h6>
                            <div className="space-y-3 pt-2">
                              {registros.sort((a, b) => (a.numeracao || 0) - (b.numeracao || 0)).map((registro) => (
                                <div 
                                  key={registro.id}
                                  className={`p-3 rounded-lg border transition-colors ${isDark ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        <span className="font-bold">{`${disciplinaPrefixMap[registro.disciplina] || '?'}.${registro.numeracao || 0}`}</span> - {registro.descricao_registro}
                                      </h4>
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        <Badge className={getTipoColor(registro.tipo_registro)}>{registro.tipo_registro}</Badge>
                                        {registro.tipo_relatorio && <Badge variant="secondary" className={isDark ? 'bg-yellow-900/50 text-yellow-300 border-yellow-700' : 'bg-yellow-100 text-yellow-800'}>{registro.tipo_relatorio}</Badge>}
                                        <Badge className={getDisciplinaColor(registro.disciplina)}>{registro.disciplina}</Badge>
                                        <Badge variant="outline" className={isDark ? 'border-gray-600 text-gray-300' : ''}>{registro.emissao_registro}</Badge>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <Button variant="outline" size="icon" onClick={() => openEditDialog(registro)} title={t.edit} className={isDark ? 'border-gray-600 hover:bg-gray-600' : ''}>
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="destructive" size="icon" title={t.delete} className="bg-red-500 hover:bg-red-600">
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>{t.confirmDelete}</AlertDialogTitle>
                                            <AlertDialogDescription>{t.deleteMessage}</AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(registro)} className="bg-red-600 hover:bg-red-700">{t.delete}</AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}