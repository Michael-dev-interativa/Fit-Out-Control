import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit } from 'lucide-react';
import { UnidadeEmpreendimento } from '@/api/entities';

const translations = {
  pt: {
    editUnit: "Editar Unidade/Pavimento",
    unitName: "Nome da Unidade/Pavimento",
    clientName: "Nome do Cliente",
    area: "Metragem (m²)",
    scope: "Escopo",
    contacts: "Contatos",
    save: "Salvar Alterações",
    cancel: "Cancelar",
    saving: "Salvando..."
  },
  en: {
    editUnit: "Edit Unit/Floor",
    unitName: "Unit/Floor Name",
    clientName: "Client Name",
    area: "Area (m²)",
    scope: "Scope",
    contacts: "Contacts",
    save: "Save Changes",
    cancel: "Cancel",
    saving: "Saving..."
  }
};

export default function EditarUnidadeDialog({ unidade, empreendimentoId, onSuccess, language, theme, isDataValid }) {
  const t = translations[language] || translations.pt;
  const [formData, setFormData] = useState({});
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (unidade) {
      setFormData({
        id_empreendimento: empreendimentoId,
        unidade_empreendimento: unidade.unidade_empreendimento || '',
        cliente_unidade: unidade.cliente_unidade || '',
        metragem_unidade: unidade.metragem_unidade || '',
        escopo_unidade: unidade.escopo_unidade || '',
        contatos: unidade.contatos || '',
      });
    }
  }, [unidade, empreendimentoId]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!unidade || !unidade.id) return;
    setSaving(true);
    try {
      const dataToUpdate = {
        ...formData,
        metragem_unidade: Number(formData.metragem_unidade) || null
      };
      await UnidadeEmpreendimento.update(unidade.id, dataToUpdate);
      onSuccess();
      setOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar unidade:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title={t.editUnit} disabled={!isDataValid}>
          <Edit className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className={isDark ? 'bg-gray-800' : ''}>
        <DialogHeader>
          <DialogTitle className={isDark ? 'text-white' : ''}>{t.editUnit}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label htmlFor="unidade_empreendimento" className={isDark ? 'text-gray-300' : ''}>{t.unitName}</Label>
            <Input id="unidade_empreendimento" value={formData.unidade_empreendimento || ''} onChange={handleInputChange} className={isDark ? 'bg-gray-700 border-gray-600' : ''} />
          </div>
          <div>
            <Label htmlFor="cliente_unidade" className={isDark ? 'text-gray-300' : ''}>{t.clientName}</Label>
            <Input id="cliente_unidade" value={formData.cliente_unidade || ''} onChange={handleInputChange} className={isDark ? 'bg-gray-700 border-gray-600' : ''} />
          </div>
          <div>
            <Label htmlFor="metragem_unidade" className={isDark ? 'text-gray-300' : ''}>{t.area}</Label>
            <Input id="metragem_unidade" type="number" value={formData.metragem_unidade || ''} onChange={handleInputChange} className={isDark ? 'bg-gray-700 border-gray-600' : ''} />
          </div>
          <div>
            <Label htmlFor="escopo_unidade" className={isDark ? 'text-gray-300' : ''}>{t.scope}</Label>
            <Input id="escopo_unidade" value={formData.escopo_unidade || ''} onChange={handleInputChange} className={isDark ? 'bg-gray-700 border-gray-600' : ''} />
          </div>
          <div>
            <Label htmlFor="contatos" className={isDark ? 'text-gray-300' : ''}>{t.contacts}</Label>
            <Input id="contatos" value={formData.contatos || ''} onChange={handleInputChange} className={isDark ? 'bg-gray-700 border-gray-600' : ''} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className={isDark ? 'text-gray-300' : ''}>{t.cancel}</Button>
            <Button type="submit" disabled={saving}>{saving ? t.saving : t.save}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}