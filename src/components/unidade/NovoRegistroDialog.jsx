import React, { useState, useEffect } from "react";
import { RegistroUnidade } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload } from "lucide-react";

// Este componente agora é usado para criar um registro manual DENTRO de uma emissão.
// Ele foi simplificado.

const disciplinas = ["Arquitetura", "Estrutura", "Civil", "Elétrica", "Hidráulica", "Incêndio", "Climatização"];
const statusOptions = ["Pendente", "Em Andamento", "Concluído"];

export default function NovoRegistroDialog({ open, onOpenChange, unidadeId, tipoRegistro, emissao, onSuccess }) {
  const [formData, setFormData] = useState({
    item_registro: "",
    descricao_registro: "",
    status: "Pendente",
    disciplina: disciplinas[0],
    foto_registro: "",
    comentario_foto: ""
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData({
        item_registro: "",
        descricao_registro: "",
        status: "Pendente",
        disciplina: disciplinas[0],
        foto_registro: "",
        comentario_foto: ""
      });
    }
  }, [open]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({ ...prev, foto_registro: file_url }));
    } catch (error) {
      console.error("Erro no upload:", error);
    }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await RegistroUnidade.create({
        ...formData,
        id_unidade: unidadeId,
        tipo_registro: tipoRegistro,
        emissao_registro: emissao, // Assume a 'emissão' is passed for context
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao criar registro:", error);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Registro Manual</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item_registro">Item do Registro *</Label>
            <Input id="item_registro" value={formData.item_registro} onChange={e => handleInputChange("item_registro", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao_registro">Descrição</Label>
            <Textarea id="descricao_registro" value={formData.descricao_registro} onChange={e => handleInputChange("descricao_registro", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Disciplina</Label>
              <Select value={formData.disciplina} onValueChange={v => handleInputChange("disciplina", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{disciplinas.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={v => handleInputChange("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Foto</Label>
            <Input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
            {formData.foto_registro && (
                <div className="mt-2 space-y-2">
                    <img src={formData.foto_registro} alt="Preview" className="w-full h-48 object-cover rounded-lg border"/>
                    <Label htmlFor="comentario_foto">Comentário da Foto</Label>
                    <Input id="comentario_foto" value={formData.comentario_foto} onChange={(e) => handleInputChange("comentario_foto", e.target.value)} />
                </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || uploading}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}