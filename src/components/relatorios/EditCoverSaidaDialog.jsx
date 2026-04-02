import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function EditCoverSaidaDialog({ open, onOpenChange, data, onSave }) {
  const [formData, setFormData] = useState({
    subtitulo: '',
    locatario: '',
    unidade: '',
    endereco: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setFormData({
      subtitulo: data?.subtitulo || '',
      locatario: data?.locatario || '',
      unidade: data?.unidade || '',
      endereco: data?.endereco || '',
    });
  }, [open, data]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!onSave) {
      onOpenChange(false);
      return;
    }

    try {
      setSaving(true);
      await onSave(formData);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar capa</DialogTitle>
          <DialogDescription>
            Ajuste as informacoes exibidas na capa do relatorio de saida.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="saida-subtitulo">Subtitulo</Label>
            <Input
              id="saida-subtitulo"
              value={formData.subtitulo}
              onChange={(e) => handleChange('subtitulo', e.target.value)}
              placeholder="Ex: SAIDA DE LOCATARIO"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="saida-locatario">Locatario</Label>
            <Input
              id="saida-locatario"
              value={formData.locatario}
              onChange={(e) => handleChange('locatario', e.target.value)}
              placeholder="Nome do locatario"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="saida-unidade">Unidade</Label>
            <Input
              id="saida-unidade"
              value={formData.unidade}
              onChange={(e) => handleChange('unidade', e.target.value)}
              placeholder="Ex: Conjunto 1201"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="saida-endereco">Endereco da capa</Label>
            <Input
              id="saida-endereco"
              value={formData.endereco}
              onChange={(e) => handleChange('endereco', e.target.value)}
              placeholder="Ex: Edificio X | Rua Y, 123"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
