import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Calendar, User, Users, MessageSquare } from "lucide-react";

const translations = {
  pt: {
    title: "Gerar Relatório de Análise",
    analysisDate: "Data da Análise",
    consultant: "Consultor",
    participants: "Participantes",
    observations: "Observações",
    emission: "Emissão",
    status: "Status",
    discipline: "Disciplina",
    allEmissions: "Todas as Emissões",
    allStatus: "Todos os Status",
    allDisciplines: "Todas as Disciplinas",
    generate: "Gerar Relatório",
    cancel: "Cancelar",
    generating: "Gerando...",
  },
  en: {
    title: "Generate Analysis Report",
    analysisDate: "Analysis Date",
    consultant: "Consultant",
    participants: "Participants",
    observations: "Observations",
    emission: "Emission",
    status: "Status",
    discipline: "Discipline",
    allEmissions: "All Emissions",
    allStatus: "All Status",
    allDisciplines: "All Disciplines",
    generate: "Generate Report",
    cancel: "Cancel",
    generating: "Generating...",
  }
};

export default function GerarRelatorioDialog({ 
  open, 
  onOpenChange, 
  language = 'pt' 
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    data_analise: new Date().toISOString().split('T')[0],
    consultor: "",
    participantes: "",
    observacoes: "",
    emissao: "Todas",
    status: "Todos",
    disciplina: "Todas"
  });

  const t = translations[language];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const unidadeId = urlParams.get('unidade');
    const empreendimentoId = urlParams.get('emp');

    if (!unidadeId || !empreendimentoId) {
      console.error("IDs de unidade/empreendimento não encontrados na URL.");
      return;
    }

    setLoading(true);
    
    try {
      const reportParams = new URLSearchParams({
        unidade: unidadeId,
        emp: empreendimentoId,
        emissao: formData.emissao,
        status: formData.status,
        disciplina: formData.disciplina,
        data_analise: formData.data_analise,
        consultor: formData.consultor,
        participantes: formData.participantes,
        observacoes: formData.observacoes
      });

      const url = createPageUrl(`VisualizarRelatorioAnalise?${reportParams.toString()}`);
      navigate(url);
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data">{t.analysisDate}</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="data"
                  type="date"
                  value={formData.data_analise}
                  onChange={(e) => handleInputChange("data_analise", e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="consultor">{t.consultant}</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="consultor"
                  value={formData.consultor}
                  onChange={(e) => handleInputChange("consultor", e.target.value)}
                  className="pl-10"
                  placeholder={t.consultant}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="participantes">{t.participants}</Label>
            <div className="relative">
              <Users className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                id="participantes"
                value={formData.participantes}
                onChange={(e) => handleInputChange("participantes", e.target.value)}
                className="pl-10"
                placeholder={t.participants}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="observacoes">{t.observations}</Label>
            <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => handleInputChange("observacoes", e.target.value)}
                    className="pl-10"
                    placeholder={t.observations}
                />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t.emission}</Label>
              <Select value={formData.emissao} onValueChange={(v) => handleInputChange('emissao', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todas">{t.allEmissions}</SelectItem>
                  <SelectItem value="1ª Emissão">1ª Emissão</SelectItem>
                  <SelectItem value="2ª Emissão">2ª Emissão</SelectItem>
                  <SelectItem value="3ª Emissão">3ª Emissão</SelectItem>
                  <SelectItem value="4ª Emissão">4ª Emissão</SelectItem>
                  <SelectItem value="5ª Emissão">5ª Emissão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.status}</Label>
              <Select value={formData.status} onValueChange={(v) => handleInputChange('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">{t.allStatus}</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.discipline}</Label>
              <Select value={formData.disciplina} onValueChange={(v) => handleInputChange('disciplina', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="Todas">{t.allDisciplines}</SelectItem>
                    <SelectItem value="Arquitetura">Arquitetura</SelectItem>
                    <SelectItem value="Estrutura">Estrutura</SelectItem>
                    <SelectItem value="Civil">Civil</SelectItem>
                    <SelectItem value="Elétrica">Elétrica</SelectItem>
                    <SelectItem value="Hidráulica">Hidráulica</SelectItem>
                    <SelectItem value="Incêndio">Incêndio</SelectItem>
                    <SelectItem value="Climatização">Climatização</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t.cancel}
          </Button>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? t.generating : t.generate}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}