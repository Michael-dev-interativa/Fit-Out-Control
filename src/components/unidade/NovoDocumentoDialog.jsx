import React, { useState } from "react";
import { DocumentosUnidade } from "@/api/entities";
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
import { Upload, File, FileText } from "lucide-react";

export default function NovoDocumentoDialog({ open, onOpenChange, unidadeId, onSuccess }) {
  const [formData, setFormData] = useState({
    numero_documento: "",
    nome_documento: "",
    arquivo: ""
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({ ...prev, arquivo: file_url }));
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
    }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome_documento || !formData.arquivo) return;

    setSaving(true);
    try {
      await DocumentosUnidade.create({
        ...formData,
        id_unidade: unidadeId
      });
      onSuccess();
      onOpenChange(false);
      setFormData({
        numero_documento: "",
        nome_documento: "",
        arquivo: ""
      });
    } catch (error) {
      console.error("Erro ao criar documento:", error);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <File className="w-5 h-5" />
            Novo Documento
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="numero">Número do Documento</Label>
            <Input
              id="numero"
              value={formData.numero_documento}
              onChange={(e) => handleInputChange("numero_documento", e.target.value)}
              placeholder="Ex: DOC-001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome_documento">Nome do Documento *</Label>
            <Input
              id="nome_documento"
              value={formData.nome_documento}
              onChange={(e) => handleInputChange("nome_documento", e.target.value)}
              placeholder="Ex: Planta Baixa da Sala 101"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="arquivo">Arquivo *</Label>
            <div className="flex gap-2">
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                disabled={uploading}
                className="flex-1"
              />
              {uploading && (
                <Button disabled size="icon">
                  <Upload className="w-4 h-4 animate-pulse" />
                </Button>
              )}
            </div>
            {formData.arquivo && (
              <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <a href={formData.arquivo} target="_blank" rel="noopener noreferrer" className="underline">
                  Arquivo carregado - Clique para visualizar
                </a>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving || !formData.nome_documento || !formData.arquivo}
            >
              {saving ? "Salvando..." : "Criar Documento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}