import React, { useState } from "react";
import { UnidadeEmpreendimento } from "@/api/entities";
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
import { Building2, Users, Square, FileText, Phone } from "lucide-react";

export default function NovaUnidadeDialog({ open, onOpenChange, id_empreendimento, onSuccess }) {
  const [formData, setFormData] = useState({
    unidade_empreendimento: "",
    cliente_unidade: "",
    metragem_unidade: "",
    escopo_unidade: "",
    contatos: ""
  });
  const [saving, setSaving] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.unidade_empreendimento || !formData.cliente_unidade) return;
    
    // Validar se temos um id_empreendimento válido
    if (!id_empreendimento || id_empreendimento === '-' || id_empreendimento.trim() === '') {
      console.error("ID do empreendimento inválido:", id_empreendimento);
      alert("Erro: ID do empreendimento não foi encontrado. Por favor, recarregue a página.");
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        id_empreendimento: id_empreendimento,
        metragem_unidade: formData.metragem_unidade ? parseFloat(formData.metragem_unidade) : null
      };
      
      console.log("Criando unidade com dados:", dataToSave);
      await UnidadeEmpreendimento.create(dataToSave);
      onSuccess();
      onOpenChange(false);
      setFormData({
        unidade_empreendimento: "",
        cliente_unidade: "",
        metragem_unidade: "",
        escopo_unidade: "",
        contatos: ""
      });
    } catch (error) {
      console.error("Erro ao criar unidade:", error);
      alert("Erro ao criar unidade. Verifique os dados e tente novamente.");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Nova Unidade
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="unidade">Identificação da Unidade</Label>
            <Input
              id="unidade"
              value={formData.unidade_empreendimento}
              onChange={(e) => handleInputChange("unidade_empreendimento", e.target.value)}
              placeholder="Ex: Loja 101, Sala 1001"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente">Cliente</Label>
            <div className="relative">
              <Users className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                id="cliente"
                value={formData.cliente_unidade}
                onChange={(e) => handleInputChange("cliente_unidade", e.target.value)}
                className="pl-10"
                placeholder="Nome do cliente"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="metragem">Metragem (m²)</Label>
            <div className="relative">
              <Square className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                id="metragem"
                type="number"
                step="0.01"
                value={formData.metragem_unidade}
                onChange={(e) => handleInputChange("metragem_unidade", e.target.value)}
                className="pl-10"
                placeholder="Área em metros quadrados"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="escopo">Escopo da Unidade</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Textarea
                id="escopo"
                value={formData.escopo_unidade}
                onChange={(e) => handleInputChange("escopo_unidade", e.target.value)}
                className="pl-10 min-h-[80px]"
                placeholder="Descreva o escopo dos trabalhos..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contatos">Contatos</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Textarea
                id="contatos"
                value={formData.contatos}
                onChange={(e) => handleInputChange("contatos", e.target.value)}
                className="pl-10 min-h-[80px]"
                placeholder="Informações de contato (telefones, emails, responsáveis...)"
              />
            </div>
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
              disabled={saving || !formData.unidade_empreendimento || !formData.cliente_unidade || !id_empreendimento}
            >
              {saving ? "Salvando..." : "Criar Unidade"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}