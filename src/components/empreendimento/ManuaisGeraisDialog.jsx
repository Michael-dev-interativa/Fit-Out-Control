import React, { useState, useEffect } from "react";
import { ManualGeral } from "@/api/entities";
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
  BookOpen,
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

const tipoManualOptions = [
  "Manual de Operação", "Manual de Manutenção", "Manual de Segurança", 
  "Manual do Proprietário", "Outros"
];

export default function ManuaisGeraisDialog({ open, onOpenChange, empreendimentoId, language = 'pt', theme = 'light' }) {
  const [manuais, setManuais] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome_manual: "",
    tipo_manual: "",
    arquivo_manual: "",
    descricao_manual: ""
  });

  const isDark = theme === 'dark';

  useEffect(() => {
    if (open && empreendimentoId) {
      loadManuais();
    }
  }, [open, empreendimentoId]);

  const loadManuais = async () => {
    setLoading(true);
    try {
      const data = await ManualGeral.filter({ id_empreendimento: empreendimentoId }, "-created_date");
      setManuais(data);
    } catch (error) {
      console.error("Erro ao carregar manuais:", error);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({ ...prev, arquivo_manual: file_url }));
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
    }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome_manual || !formData.arquivo_manual || !empreendimentoId) return;

    setSaving(true);
    try {
      const manualData = {
        nome_manual: formData.nome_manual,
        tipo_manual: formData.tipo_manual || "Outros",
        arquivo_manual: formData.arquivo_manual,
        descricao_manual: formData.descricao_manual,
        id_empreendimento: empreendimentoId
      };
      
      await ManualGeral.create(manualData);
      
      setFormData({
        nome_manual: "",
        tipo_manual: "",
        arquivo_manual: "",
        descricao_manual: ""
      });
      setShowAddForm(false);
      loadManuais();
    } catch (error) {
      console.error("Erro ao salvar manual:", error);
    }
    setSaving(false);
  };

  const handleDelete = async (manualId) => {
    try {
      await ManualGeral.delete(manualId);
      loadManuais();
    } catch (error) {
      console.error("Erro ao excluir manual:", error);
    }
  };

  const getTipoColor = (tipo) => {
    const colors = {
      "Manual de Operação": isDark ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700",
      "Manual de Manutenção": isDark ? "bg-green-900/50 text-green-300" : "bg-green-100 text-green-700",
      "Manual de Segurança": isDark ? "bg-red-900/50 text-red-300" : "bg-red-100 text-red-700",
      "Manual do Proprietário": isDark ? "bg-purple-900/50 text-purple-300" : "bg-purple-100 text-purple-700",
      "Outros": isDark ? "bg-gray-900/50 text-gray-300" : "bg-gray-100 text-gray-700"
    };
    return colors[tipo] || (isDark ? "bg-gray-900/50 text-gray-300" : "bg-gray-100 text-gray-700");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-4xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-800' : ''}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
            <BookOpen className="w-5 h-5" />
            Manuais Gerais
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Gerencie os manuais gerais do empreendimento
            </p>
            <Button 
              onClick={() => setShowAddForm(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Manual
            </Button>
          </div>

          {showAddForm && (
            <Card className={isDark ? 'bg-gray-700' : ''}>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className={isDark ? 'text-gray-300' : ''}>Nome do Manual</Label>
                      <Input
                        value={formData.nome_manual}
                        onChange={(e) => setFormData(prev => ({ ...prev, nome_manual: e.target.value }))}
                        placeholder="Ex: Manual de Operação do Sistema de Climatização"
                        required
                        className={isDark ? 'bg-gray-600 border-gray-500 text-white' : ''}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className={isDark ? 'text-gray-300' : ''}>Tipo do Manual</Label>
                      <Select 
                        value={formData.tipo_manual} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_manual: value }))}
                      >
                        <SelectTrigger className={isDark ? 'bg-gray-600 border-gray-500 text-white' : ''}>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {tipoManualOptions.map(tipo => (
                            <SelectItem key={tipo} value={tipo}>
                              {tipo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className={isDark ? 'text-gray-300' : ''}>Descrição</Label>
                    <Textarea
                      value={formData.descricao_manual}
                      onChange={(e) => setFormData(prev => ({ ...prev, descricao_manual: e.target.value }))}
                      placeholder="Descrição detalhada do manual..."
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
                        accept=".pdf,.doc,.docx,.zip,.rar"
                      />
                      {uploading && (
                        <Button disabled size="icon">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </Button>
                      )}
                      {formData.arquivo_manual && (
                        <div className={`flex items-center px-3 rounded border ${isDark ? 'bg-gray-600 border-gray-500' : 'bg-gray-100 border-gray-300'}`}>
                          <FileText className="w-4 h-4 text-green-600" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddForm(false)}
                      className={isDark ? 'border-gray-500 text-gray-300' : ''}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={saving || !formData.nome_manual || !formData.arquivo_manual}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        "Salvar Manual"
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
              <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Carregando manuais...</p>
            </div>
          ) : manuais.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
                Nenhum manual encontrado
              </h3>
              <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                Adicione o primeiro manual geral deste empreendimento
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {manuais.map((manual) => (
                <Card key={manual.id} className={`hover:shadow-md transition-shadow ${isDark ? 'bg-gray-700' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-lg ${isDark ? 'bg-green-900/50' : 'bg-green-50'}`}>
                          <BookOpen className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {manual.nome_manual}
                          </h4>
                          {manual.tipo_manual && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getTipoColor(manual.tipo_manual)}`}>
                                {manual.tipo_manual}
                              </span>
                            </div>
                          )}
                          {manual.descricao_manual && (
                            <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              {manual.descricao_manual}
                            </p>
                          )}
                          <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            Adicionado em {(() => {
                              const dateStr = manual.created_date.includes('Z') ? manual.created_date : manual.created_date + 'Z';
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
                          onClick={() => window.open(manual.arquivo_manual, '_blank')}
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
                              title="Excluir manual"
                              className="bg-red-500 hover:bg-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir este manual? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(manual.id)}
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