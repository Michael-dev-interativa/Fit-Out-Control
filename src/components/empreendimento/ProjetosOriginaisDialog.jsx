import React, { useState, useEffect } from "react";
import { ProjetoOriginal } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
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
import { Card, CardContent } from "@/components/ui/card";
import { 
  Plus, 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  FolderOpen,
  Loader2 
} from "lucide-react";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const disciplinaOptions = [
  "Arquitetura", "Estrutura", "Civil", "Elétrica", 
  "Hidráulica", "Incêndio", "Climatização", "Outros"
];

export default function ProjetosOriginaisDialog({ open, onOpenChange, empreendimentoId, language = 'pt', theme = 'light' }) {
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [formData, setFormData] = useState({
    nome_projeto: "",
    disciplina_projeto: "",
    arquivo_projeto: "",
    descricao_projeto: ""
  });

  const isDark = theme === 'dark';

  useEffect(() => {
    if (open && empreendimentoId) {
      loadProjetos();
    }
  }, [open, empreendimentoId]);

  const loadProjetos = async () => {
    setLoading(true);
    try {
      const data = await ProjetoOriginal.filter({ id_empreendimento: empreendimentoId }, "-created_date");
      setProjetos(data);
    } catch (error) {
      console.error("Erro ao carregar projetos:", error);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");
    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({ ...prev, arquivo_projeto: file_url }));
      setUploadError("");
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      setUploadError("Erro ao fazer upload do arquivo. Tente novamente.");
    }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome_projeto || !formData.arquivo_projeto || !empreendimentoId) {
      setSaveError("Preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      const projetoData = {
        nome_projeto: formData.nome_projeto,
        disciplina_projeto: formData.disciplina_projeto || "Outros",
        arquivo_projeto: formData.arquivo_projeto,
        descricao_projeto: formData.descricao_projeto,
        id_empreendimento: empreendimentoId
      };
      
      console.log("Salvando projeto:", projetoData);
      await ProjetoOriginal.create(projetoData);
      
      setFormData({
        nome_projeto: "",
        disciplina_projeto: "",
        arquivo_projeto: "",
        descricao_projeto: ""
      });
      setSaveError("");
      setShowAddForm(false);
      loadProjetos();
    } catch (error) {
      console.error("Erro ao salvar projeto:", error);
      setSaveError(error.message || "Erro ao salvar projeto. Tente novamente.");
    }
    setSaving(false);
  };

  const handleDelete = async (projetoId) => {
    try {
      await ProjetoOriginal.delete(projetoId);
      loadProjetos();
    } catch (error) {
      console.error("Erro ao excluir projeto:", error);
    }
  };

  const getDisciplinaColor = (disciplina) => {
    const colors = {
      "Arquitetura": isDark ? "bg-pink-900/50 text-pink-300" : "bg-pink-100 text-pink-700",
      "Estrutura": isDark ? "bg-orange-900/50 text-orange-300" : "bg-orange-100 text-orange-700",
      "Civil": isDark ? "bg-yellow-900/50 text-yellow-300" : "bg-yellow-100 text-yellow-700",
      "Elétrica": isDark ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700",
      "Hidráulica": isDark ? "bg-cyan-900/50 text-cyan-300" : "bg-cyan-100 text-cyan-700",
      "Incêndio": isDark ? "bg-red-900/50 text-red-300" : "bg-red-100 text-red-700",
      "Climatização": isDark ? "bg-indigo-900/50 text-indigo-300" : "bg-indigo-100 text-indigo-700",
      "Outros": isDark ? "bg-gray-900/50 text-gray-300" : "bg-gray-100 text-gray-700"
    };
    return colors[disciplina] || (isDark ? "bg-gray-900/50 text-gray-300" : "bg-gray-100 text-gray-700");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-4xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-800' : ''}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
            <FolderOpen className="w-5 h-5" />
            Projetos Originais
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Gerencie os projetos originais do empreendimento
            </p>
            {!showAddForm && (
              <Button 
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Projeto
              </Button>
            )}
          </div>

          {showAddForm && (
            <Card className={isDark ? 'bg-gray-700' : ''}>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className={isDark ? 'text-gray-300' : ''}>Nome do Projeto</Label>
                      <Input
                        value={formData.nome_projeto}
                        onChange={(e) => setFormData(prev => ({ ...prev, nome_projeto: e.target.value }))}
                        placeholder="Ex: Projeto Arquitetônico - Pavimento Tipo"
                        required
                        className={isDark ? 'bg-gray-600 border-gray-500 text-white' : ''}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className={isDark ? 'text-gray-300' : ''}>Disciplina</Label>
                      <Select 
                        value={formData.disciplina_projeto} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, disciplina_projeto: value }))}
                      >
                        <SelectTrigger className={isDark ? 'bg-gray-600 border-gray-500 text-white' : ''}>
                          <SelectValue placeholder="Selecione a disciplina" />
                        </SelectTrigger>
                        <SelectContent>
                          {disciplinaOptions.map(disciplina => (
                            <SelectItem key={disciplina} value={disciplina}>
                              {disciplina}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className={isDark ? 'text-gray-300' : ''}>Descrição</Label>
                    <Textarea
                      value={formData.descricao_projeto}
                      onChange={(e) => setFormData(prev => ({ ...prev, descricao_projeto: e.target.value }))}
                      placeholder="Descrição detalhada do projeto..."
                      className={`min-h-[80px] ${isDark ? 'bg-gray-600 border-gray-500 text-white' : ''}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className={isDark ? 'text-gray-300' : ''}>Arquivo</Label>
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className={`flex-1 ${isDark ? 'bg-gray-600 border-gray-500 text-white' : ''}`}
                        accept=".pdf,.dwg,.dxf,.zip,.rar"
                      />
                      {uploading && (
                        <Button disabled size="icon">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </Button>
                      )}
                      {formData.arquivo_projeto && (
                        <div className={`flex items-center px-3 rounded border ${isDark ? 'bg-gray-600 border-gray-500' : 'bg-gray-100 border-gray-300'}`}>
                          <FileText className="w-4 h-4 text-green-600" />
                        </div>
                      )}
                    </div>
                    {uploadError && (
                      <p className="text-xs text-red-600">{uploadError}</p>
                    )}
                  </div>

                  {saveError && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200">
                      <p className="text-sm text-red-600">{saveError}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false);
                        setSaveError("");
                      }}
                      className={isDark ? 'border-gray-500 text-gray-300' : ''}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={saving || !formData.nome_projeto || !formData.arquivo_projeto}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        "Salvar Projeto"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Carregando projetos...</p>
            </div>
          ) : projetos.length === 0 ? (
            <div className="text-center py-12">
              <FileText className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
                Nenhum projeto encontrado
              </h3>
              <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                Adicione o primeiro projeto original deste empreendimento
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {projetos.map((projeto) => (
                <Card key={projeto.id} className={`hover:shadow-md transition-shadow ${isDark ? 'bg-gray-700' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-lg ${isDark ? 'bg-blue-900/50' : 'bg-blue-50'}`}>
                          <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {projeto.nome_projeto}
                          </h4>
                          {projeto.disciplina_projeto && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getDisciplinaColor(projeto.disciplina_projeto)}`}>
                                {projeto.disciplina_projeto}
                              </span>
                            </div>
                          )}
                          {projeto.descricao_projeto && (
                            <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              {projeto.descricao_projeto}
                            </p>
                          )}
                          <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            Adicionado em {(() => {
                              const dateStr = projeto.created_date.includes('Z') ? projeto.created_date : projeto.created_date + 'Z';
                              return new Date(dateStr).toLocaleString('pt-BR', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                year: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit',
                                timeZone: 'America/Sao_Paulo'
                              }).replace(',', ' às');
                            })()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => window.open(projeto.arquivo_projeto, '_blank')}
                          title="Baixar arquivo"
                          className={isDark ? 'border-gray-500 hover:bg-gray-600' : ''}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="icon"
                              title="Excluir projeto"
                              className="bg-red-500 hover:bg-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(projeto.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}