import React, { useState, useRef } from "react";
import { Empreendimento } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Plus, 
  Trash2, 
  Camera,
  Loader2,
  Edit3
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

export default function GaleriaFotosDialog({ open, onOpenChange, empreendimento, onSuccess, language = 'pt', theme = 'light' }) {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingLegend, setEditingLegend] = useState(null);
  const [tempLegend, setTempLegend] = useState("");
  const fileInputRef = useRef(null);

  const isDark = theme === 'dark';
  const fotos = empreendimento?.fotos_empreendimento || [];

  const handleAddPhotosClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAddPhotos = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const { file_url } = await UploadFile({ file });
        return { url: file_url, legenda: "" };
      });
      
      const newPhotos = await Promise.all(uploadPromises);
      const updatedPhotos = [...fotos, ...newPhotos];
      
      await Empreendimento.update(empreendimento.id, {
        fotos_empreendimento: updatedPhotos
      });
      
      onSuccess();
    } catch (error) {
      console.error("Erro ao adicionar fotos:", error);
    }
    setUploading(false);
    e.target.value = ''; // Clear input
  };

  const handleRemovePhoto = async (index) => {
    try {
      const updatedPhotos = fotos.filter((_, i) => i !== index);
      
      await Empreendimento.update(empreendimento.id, {
        fotos_empreendimento: updatedPhotos
      });
      
      onSuccess();
    } catch (error) {
      console.error("Erro ao remover foto:", error);
    }
  };

  const handleEditLegend = (index, currentLegend) => {
    setEditingLegend(index);
    setTempLegend(currentLegend || "");
  };

  const handleSaveLegend = async () => {
    if (editingLegend === null) return;
    
    setSaving(true);
    try {
      const updatedPhotos = fotos.map((foto, i) => 
        i === editingLegend ? { ...foto, legenda: tempLegend } : foto
      );
      
      await Empreendimento.update(empreendimento.id, {
        fotos_empreendimento: updatedPhotos
      });
      
      setEditingLegend(null);
      setTempLegend("");
      onSuccess();
    } catch (error) {
      console.error("Erro ao salvar legenda:", error);
    }
    setSaving(false);
  };

  const handleCancelEdit = () => {
    setEditingLegend(null);
    setTempLegend("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-4xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-800' : ''}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
            <Camera className="w-5 h-5" />
            Galeria de Fotos - {empreendimento?.nome_empreendimento}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Gerencie as fotos do empreendimento ({fotos.length} foto{fotos.length !== 1 ? 's' : ''})
            </p>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleAddPhotos}
                disabled={uploading}
                style={{ display: 'none' }}
              />
              <Button 
                onClick={handleAddPhotosClick}
                disabled={uploading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Fotos
                  </>
                )}
              </Button>
            </div>
          </div>

          {fotos.length === 0 ? (
            <div className="text-center py-12">
              <Camera className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
                Nenhuma foto encontrada
              </h3>
              <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                Adicione as primeiras fotos deste empreendimento
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {fotos.map((foto, index) => (
                <Card key={index} className={`group hover:shadow-lg transition-shadow ${isDark ? 'bg-gray-700' : ''}`}>
                  <CardContent className="p-0">
                    <div className="relative">
                      <img
                        src={foto.url}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="w-8 h-8 bg-black/50 hover:bg-black/70 text-white"
                          onClick={() => handleEditLegend(index, foto.legenda)}
                          title="Editar legenda"
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="w-8 h-8 bg-red-500/80 hover:bg-red-600"
                              title="Remover foto"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover esta foto? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemovePhoto(index)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <div className="p-3">
                      {editingLegend === index ? (
                        <div className="space-y-2">
                          <Input
                            value={tempLegend}
                            onChange={(e) => setTempLegend(e.target.value)}
                            placeholder="Digite a legenda da foto..."
                            className={`text-sm ${isDark ? 'bg-gray-600 border-gray-500 text-white' : ''}`}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleSaveLegend}
                              disabled={saving}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvar"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEdit}
                              className={`flex-1 ${isDark ? 'border-gray-500 text-gray-300' : ''}`}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} min-h-[20px]`}>
                          {foto.legenda || "Sem legenda"}
                        </p>
                      )}
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