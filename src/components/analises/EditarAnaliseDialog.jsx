
import React, { useState, useEffect } from "react";
import { AP_unidade } from "@/api/entities";
import { DisciplinaGeral } from "@/api/entities"; // New import
import { UploadFile } from "@/api/integrations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2 } from "lucide-react"; // Added Trash2
import { // New imports for AlertDialog
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

const statusOptions = ["Pendente", "Em Andamento", "Concluído"];
const emissoesOptions = ["1ª Emissão", "2ª Emissão", "3ª Emissão", "4ª Emissão", "5ª Emissão"]; // New constant

export default function EditarAnaliseDialog({ open, onOpenChange, analise, onSuccess }) {
  const [formData, setFormData] = useState({});
  const [disciplinas, setDisciplinas] = useState([]); // New state
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showDeleteImageDialog, setShowDeleteImageDialog] = useState(false); // New state
  const [deleteImageComment, setDeleteImageComment] = useState(false); // New state
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  // New useEffect to load disciplines on component mount
  useEffect(() => {
    loadDisciplinas();
  }, []);

  useEffect(() => {
    if (analise) {
      setFormData({
        descricao_ap: analise.descricao_ap || "",
        comentario_ap: analise.comentario_ap || "",
        replica_ap: analise.replica_ap || "",
        treplica_ap: analise.treplica_ap || "",
        imagem_ap: analise.imagem_ap || "",
        comentario_im_ap: analise.comentario_im_ap || "",
        status: analise.status || "Pendente",
        emissao_ap: analise.emissao_ap || "1ª Emissão", // New field
        disciplina_ap: analise.disciplina_ap || "", // New field
      });
    }
  }, [analise]);

  // New function to load disciplines
  const loadDisciplinas = async () => {
    try {
      // Assuming DisciplinaGeral.list can fetch all disciplines
      const data = await DisciplinaGeral.list(); 
      setDisciplinas(data);
    } catch (error) {
      console.error("Erro ao carregar disciplinas:", error);
    }
  };

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
      handleInputChange("comentario_im_ap", ""); // Clear comment if a new image is uploaded
    } catch (error) {
      console.error("Erro no upload do arquivo:", error);
    } finally {
      setUploading(false);
    }
  };

  // New function to handle image deletion
  const handleDeleteImage = () => {
    const updates = { imagem_ap: "" };
    if (deleteImageComment) {
      updates.comentario_im_ap = "";
    }
    setFormData(prev => ({ ...prev, ...updates }));
    setShowDeleteImageDialog(false);
    setDeleteImageComment(false); // Reset checkbox state
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!analise) return;

    setSaving(true);
    
    try {
      await AP_unidade.update(analise.id, formData);

      onSuccess(); 
      onOpenChange(false); 
    } catch (error) {
      console.error("Erro ao salvar análise:", error);
    } finally {
      setSaving(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-2xl ${isDark ? 'bg-gray-800 text-white' : ''}`}>
        <DialogHeader>
          <DialogTitle>Editar Análise de Projeto</DialogTitle> {/* Updated title */}
          <DialogDescription>
            {analise?.item_ap} - {analise?.disciplina_ap}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
          
          <div className="space-y-2">
            <Label htmlFor="descricao_ap">Descrição</Label>
            <Textarea id="descricao_ap" value={formData.descricao_ap} onChange={(e) => handleInputChange("descricao_ap", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comentario_ap">Comentário</Label>
            <Textarea id="comentario_ap" value={formData.comentario_ap} onChange={(e) => handleInputChange("comentario_ap", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="replica_ap">Réplica</Label>
            <Textarea id="replica_ap" value={formData.replica_ap} onChange={(e) => handleInputChange("replica_ap", e.target.value)} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="treplica_ap">Tréplica</Label>
            <Textarea id="treplica_ap" value={formData.treplica_ap} onChange={(e) => handleInputChange("treplica_ap", e.target.value)} />
          </div>

          {/* New grid layout for Status, Emissão, Disciplina */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(v) => handleInputChange('status', v)}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emissao_ap">Emissão</Label>
              <Select value={formData.emissao_ap} onValueChange={(v) => handleInputChange("emissao_ap", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {emissoesOptions.map(emissao => (
                    <SelectItem key={emissao} value={emissao}>{emissao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="disciplina_ap">Disciplina</Label>
              <Select value={formData.disciplina_ap} onValueChange={(v) => handleInputChange("disciplina_ap", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {disciplinas.map(disciplina => (
                    <SelectItem key={disciplina.id} value={disciplina.descricao_disciplina}>
                      {disciplina.descricao_disciplina}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="imagem_ap">Imagem</Label>
            <Input type="file" onChange={handleFileUpload} disabled={uploading} />
            {uploading && (
              <div className="flex items-center text-sm text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fazendo upload...
              </div>
            )}
            {formData.imagem_ap && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <img src={formData.imagem_ap} alt="Preview" className="rounded-lg max-h-48 w-auto"/>
                  <AlertDialog open={showDeleteImageDialog} onOpenChange={setShowDeleteImageDialog}>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Imagem</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir esta imagem?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="deleteComment"
                          checked={deleteImageComment}
                          onChange={(e) => setDeleteImageComment(e.target.checked)}
                        />
                        <label htmlFor="deleteComment">Excluir também o comentário da imagem</label>
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteImage}>Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <Label htmlFor="comentario_im_ap">Comentário da Imagem</Label>
                <Textarea id="comentario_im_ap" value={formData.comentario_im_ap} onChange={(e) => handleInputChange("comentario_im_ap", e.target.value)} />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
