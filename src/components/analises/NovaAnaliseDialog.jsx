import React, { useState } from "react";
import { AP_unidade } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, Upload, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const emissoesOptions = ["1ª Emissão", "2ª Emissão", "3ª Emissão", "4ª Emissão", "5ª Emissão"];
const statusOptions = ["Pendente", "Em Andamento", "Concluído"];

export default function NovaAnaliseDialog({ open, onOpenChange, unidadeId, onSuccess }) {
  const [formData, setFormData] = useState({
    item_ap: "",
    descricao_ap: "",
    comentario_ap: "",
    replica_ap: "",
    treplica_ap: "",
    emissao_ap: "1ª Emissão",
    status: "Pendente",
    imagem_ap: "",
    comentario_im_ap: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      handleInputChange("imagem_ap", file_url);
    } catch (error) {
      console.error("Erro no upload do arquivo:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.item_ap.trim() || !unidadeId) return;

    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        id_unidade: unidadeId,
        data_inclusao_ap: new Date().toISOString()
      };
      await AP_unidade.create(dataToSave);
      onSuccess(); // Recarrega a lista na página pai
      onOpenChange(false); // Fecha o diálogo
      resetForm();
    } catch (error) {
      console.error("Erro ao criar nova análise:", error);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      item_ap: "",
      descricao_ap: "",
      comentario_ap: "",
      replica_ap: "",
      treplica_ap: "",
      emissao_ap: "1ª Emissão",
      status: "Pendente",
      imagem_ap: "",
      comentario_im_ap: "",
    });
  };

  const isDark = theme === 'dark';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className={`sm:max-w-2xl ${isDark ? 'bg-gray-800' : ''}`}>
        <DialogHeader>
          <DialogTitle className={isDark ? 'text-white' : ''}>Nova Análise de Projeto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="space-y-2">
            <Label htmlFor="item_ap" className={isDark ? 'text-gray-300' : ''}>Item*</Label>
            <Input 
              id="item_ap" 
              value={formData.item_ap} 
              onChange={(e) => handleInputChange("item_ap", e.target.value)} 
              placeholder="Ex: 1.1 - Acessos" 
              required 
              className={isDark ? 'bg-gray-700 border-gray-600' : ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao_ap" className={isDark ? 'text-gray-300' : ''}>Descrição</Label>
            <Textarea 
              id="descricao_ap" 
              value={formData.descricao_ap} 
              onChange={(e) => handleInputChange("descricao_ap", e.target.value)} 
              placeholder="Descreva a análise..." 
              className={isDark ? 'bg-gray-700 border-gray-600' : ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comentario_ap" className={isDark ? 'text-gray-300' : ''}>Comentário</Label>
            <Textarea 
              id="comentario_ap" 
              value={formData.comentario_ap} 
              onChange={(e) => handleInputChange("comentario_ap", e.target.value)} 
              placeholder="Adicione um comentário..." 
              className={isDark ? 'bg-gray-700 border-gray-600' : ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="replica_ap" className={isDark ? 'text-gray-300' : ''}>Réplica</Label>
            <Textarea 
              id="replica_ap" 
              value={formData.replica_ap} 
              onChange={(e) => handleInputChange("replica_ap", e.target.value)} 
              placeholder="Adicione uma réplica..." 
              className={isDark ? 'bg-gray-700 border-gray-600' : ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="treplica_ap" className={isDark ? 'text-gray-300' : ''}>Tréplica</Label>
            <Textarea 
              id="treplica_ap" 
              value={formData.treplica_ap} 
              onChange={(e) => handleInputChange("treplica_ap", e.target.value)} 
              placeholder="Adicione uma tréplica..." 
              className={isDark ? 'bg-gray-700 border-gray-600' : ''}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className={isDark ? 'text-gray-300' : ''}>Emissão</Label>
              <Select value={formData.emissao_ap} onValueChange={(v) => handleInputChange("emissao_ap", v)}>
                <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {emissoesOptions.map(e => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className={isDark ? 'text-gray-300' : ''}>Status</Label>
              <Select value={formData.status} onValueChange={(v) => handleInputChange("status", v)}>
                <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="imagem_ap" className={isDark ? 'text-gray-300' : ''}>Imagem</Label>
            <Input 
              id="imagem_ap" 
              type="file" 
              onChange={handleFileUpload} 
              disabled={uploading} 
              className={`file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold ${isDark ? 'bg-gray-700 border-gray-600 file:bg-gray-600 file:text-white' : 'file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'}`} 
            />
            {uploading && (
              <div className="flex items-center text-sm text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fazendo upload...
              </div>
            )}
            {formData.imagem_ap && (
              <div className="mt-2 space-y-2">
                <img src={formData.imagem_ap} alt="Preview" className="rounded-lg max-h-48 w-auto"/>
                <Label htmlFor="comentario_im_ap" className={isDark ? 'text-gray-300' : ''}>Comentário da Imagem</Label>
                <Textarea 
                  id="comentario_im_ap" 
                  value={formData.comentario_im_ap} 
                  onChange={(e) => handleInputChange("comentario_im_ap", e.target.value)} 
                  placeholder="Adicione um comentário para a imagem" 
                  className={isDark ? 'bg-gray-700 border-gray-600' : ''} 
                />
              </div>
            )}
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className={isDark ? 'text-gray-300 border-gray-600 hover:bg-gray-700' : ''}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || uploading}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                Salvando...
              </>
            ) : (
              "Salvar Análise"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}