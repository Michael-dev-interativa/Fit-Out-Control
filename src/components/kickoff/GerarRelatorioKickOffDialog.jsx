import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function GerarRelatorioKickOffDialog({ 
  open, 
  onOpenChange, 
  registros, 
  unidade,
  empreendimento,
  language = 'pt' 
}) {
  const navigate = useNavigate();
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setSelectedRecords([]);
      setSelectAll(false);
    }
  }, [open]);

  const handleSelectRecord = (registro) => {
    setSelectedRecords(prev => 
      prev.some(r => r.id === registro.id)
        ? prev.filter(r => r.id !== registro.id)
        : [...prev, registro]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(registros);
    }
    setSelectAll(!selectAll);
  };

  const handleGenerateReport = () => {
    if (selectedRecords.length === 0) {
      alert("Selecione ao menos um registro para gerar o relatório.");
      return;
    }
    
    if (!unidade?.id) {
      alert("Erro: ID da unidade não encontrado.");
      return;
    }
    
    // Usar o empreendimento da unidade se não tiver empreendimento direto
    const empId = empreendimento?.id || unidade?.id_empreendimento;
    
    if (!empId) {
      alert("Erro: ID do empreendimento não encontrado.");
      return;
    }
    
    const registroIds = selectedRecords.map(r => r.id).join(',');
    const url = createPageUrl(`VisualizarRelatorioKickOff?unidade=${unidade.id}&emp=${empId}&ids=${registroIds}`);
    
    console.log('Navegando para:', url);
    navigate(url);
    onOpenChange(false);
  };

  const t = {
    pt: {
      title: "Gerar Relatório de Kick-Off",
      description: "Selecione os registros que devem constar no relatório. Será gerada uma ata única com as informações do primeiro registro selecionado.",
      selectAll: "Selecionar Todos",
      generate: "Gerar Relatório",
      cancel: "Cancelar",
      noRecords: "Nenhum registro de Kick-Off disponível."
    },
    en: {
      title: "Generate Kick-Off Report",
      description: "Select the records to be included in the report. A single meeting minute will be generated with the information from the first selected record.",
      selectAll: "Select All",
      generate: "Generate Report",
      cancel: "Cancel",
      noRecords: "No Kick-Off records available."
    }
  }[language];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        {registros && registros.length > 0 ? (
          <>
            <div className="flex items-center space-x-2 my-4">
              <Checkbox id="select-all" checked={selectAll} onCheckedChange={handleSelectAll} />
              <label htmlFor="select-all" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {t.selectAll}
              </label>
            </div>
            <ScrollArea className="h-60 w-full rounded-md border p-4">
              <div className="space-y-4">
                {registros.map(registro => (
                  <div key={registro.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`record-${registro.id}`}
                      checked={selectedRecords.some(r => r.id === registro.id)}
                      onCheckedChange={() => handleSelectRecord(registro)}
                    />
                    <label htmlFor={`record-${registro.id}`} className="text-sm flex-1">
                      <p className="font-semibold">{registro.item_ko || 'Kick-Off'}</p>
                      <p className="text-xs text-gray-500">{registro.disciplina_ko} - {registro.emissao_ko}</p>
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <p className="text-sm text-center text-gray-500 py-8">{t.noRecords}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.cancel}</Button>
          <Button onClick={handleGenerateReport} disabled={selectedRecords.length === 0}>
            {t.generate}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}