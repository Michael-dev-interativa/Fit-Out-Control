import React, { useState, useEffect } from "react";
import { KO_unidade } from "@/api/entities";
import { DisciplinaGeral } from "@/api/entities";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";

const statusOptions = ["Pendente", "Em Andamento", "Concluído"];
const emissaoOptions = ["1ª Emissão", "2ª Emissão", "3ª Emissão", "4ª Emissão", "5ª Emissão"];

// Função auxiliar para converter string de data para objeto Date de forma segura
const safeParseDate = (dateString) => {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    // Verificar se a data é válida
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch (error) {
    console.warn("Erro ao converter data:", dateString, error);
    return null;
  }
};

export default function EditarKickOffDialog({ open, onOpenChange, kickOff, onSuccess }) {
  const [formData, setFormData] = useState({});
  const [disciplinas, setDisciplinas] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    if (open) {
      loadDisciplinas();
    }
  }, [open]);

  useEffect(() => {
    if (kickOff) {
      setFormData({
        item_ko: kickOff.item_ko || "",
        descricao_ko: kickOff.descricao_ko || "",
        comentario_ko: kickOff.comentario_ko || "",
        imagem_ko: kickOff.imagem_ko || "",
        comentario_im_ko: kickOff.comentario_im_ko || "",
        replica_ko: kickOff.replica_ko || "",
        treplica_ko: kickOff.treplica_ko || "",
        status: kickOff.status || "Pendente",
        emissao_ko: kickOff.emissao_ko || "1ª Emissão",
        disciplina_ko: kickOff.disciplina_ko || "",
        // Campos da ATA com tratamento seguro de datas
        data_reuniao: safeParseDate(kickOff.data_reuniao) || new Date(),
        hora_reuniao: kickOff.hora_reuniao || "",
        participantes_interativa: kickOff.participantes_interativa || "",
        participantes_condominio: kickOff.participantes_condominio || "",
        participantes_locatario: kickOff.participantes_locatario || "",
        os_numero: kickOff.os_numero || "",
        empreendimento_gerenciadora: kickOff.empreendimento_gerenciadora || "",
        torre_pavimento_conjunto: kickOff.torre_pavimento_conjunto || "",
        metros_quadrados: kickOff.metros_quadrados || "",
        escopo_servicos_interativa: kickOff.escopo_servicos_interativa || "",
        escopo_servicos_locatario: kickOff.escopo_servicos_locatario || "",
        data_envio_projetos: safeParseDate(kickOff.data_envio_projetos),
        data_inicio_atividades: safeParseDate(kickOff.data_inicio_atividades),
        data_previsao_ocupacao: safeParseDate(kickOff.data_previsao_ocupacao),
        particularidades: kickOff.particularidades || "",
        outras_informacoes: kickOff.outras_informacoes || "",
      });
    }
  }, [kickOff]);

  const loadDisciplinas = async () => {
    try {
      const data = await DisciplinaGeral.list("prefixo_disciplina");
      setDisciplinas(data);
    } catch (error) {
      console.error("Erro ao carregar disciplinas:", error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (field, date) => {
    setFormData(prev => ({ ...prev, [field]: date }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      handleInputChange("imagem_ko", file_url);
    } catch (error) {
      console.error("Erro no upload do arquivo:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!kickOff) return;

    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        // Converter datas para ISO string de forma segura
        data_reuniao: formData.data_reuniao ? formData.data_reuniao.toISOString() : null,
        data_envio_projetos: formData.data_envio_projetos ? formData.data_envio_projetos.toISOString() : null,
        data_inicio_atividades: formData.data_inicio_atividades ? formData.data_inicio_atividades.toISOString() : null,
        data_previsao_ocupacao: formData.data_previsao_ocupacao ? formData.data_previsao_ocupacao.toISOString() : null
      };
      
      await KO_unidade.update(kickOff.id, dataToSave);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar kick off:", error);
    } finally {
      setSaving(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-4xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-800' : ''}`}>
        <DialogHeader>
          <DialogTitle className={isDark ? 'text-white' : ''}>Editar Kick Off</DialogTitle>
          <DialogDescription>
            Edite as informações do registro de Kick-Off
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item_ko" className={isDark ? 'text-gray-300' : ''}>Item</Label>
              <Input
                id="item_ko"
                value={formData.item_ko}
                onChange={(e) => handleInputChange("item_ko", e.target.value)}
                className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
              />
            </div>
            
            <div className="space-y-2">
              <Label className={isDark ? 'text-gray-300' : ''}>Status</Label>
              <Select value={formData.status} onValueChange={(v) => handleInputChange("status", v)}>
                <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className={isDark ? 'text-gray-300' : ''}>Emissão</Label>
              <Select value={formData.emissao_ko} onValueChange={(v) => handleInputChange("emissao_ko", v)}>
                <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {emissaoOptions.map(emissao => (
                    <SelectItem key={emissao} value={emissao}>{emissao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className={isDark ? 'text-gray-300' : ''}>Disciplina</Label>
              <Select value={formData.disciplina_ko} onValueChange={(v) => handleInputChange("disciplina_ko", v)}>
                <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}>
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
            <Label htmlFor="descricao_ko" className={isDark ? 'text-gray-300' : ''}>Descrição</Label>
            <Textarea
              id="descricao_ko"
              value={formData.descricao_ko}
              onChange={(e) => handleInputChange("descricao_ko", e.target.value)}
              className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comentario_ko" className={isDark ? 'text-gray-300' : ''}>Comentário</Label>
            <Textarea
              id="comentario_ko"
              value={formData.comentario_ko}
              onChange={(e) => handleInputChange("comentario_ko", e.target.value)}
              className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="replica_ko" className={isDark ? 'text-gray-300' : ''}>Réplica</Label>
            <Textarea
              id="replica_ko"
              value={formData.replica_ko}
              onChange={(e) => handleInputChange("replica_ko", e.target.value)}
              className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="treplica_ko" className={isDark ? 'text-gray-300' : ''}>Tréplica</Label>
            <Textarea
              id="treplica_ko"
              value={formData.treplica_ko}
              onChange={(e) => handleInputChange("treplica_ko", e.target.value)}
              className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
            />
          </div>

          {/* Seção de dados da ATA */}
          <div className="border-t pt-4">
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : ''}`}>Dados da Reunião</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : ''}>Data da Reunião</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={`w-full justify-start ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.data_reuniao ? format(formData.data_reuniao, 'dd/MM/yyyy') : 'Selecionar data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.data_reuniao}
                      onSelect={(date) => handleDateChange("data_reuniao", date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : ''}>Hora da Reunião</Label>
                <Input
                  type="time"
                  value={formData.hora_reuniao}
                  onChange={(e) => handleInputChange("hora_reuniao", e.target.value)}
                  className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>
            </div>

            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : ''}>Participantes (Interativa)</Label>
                <Textarea
                  value={formData.participantes_interativa}
                  onChange={(e) => handleInputChange("participantes_interativa", e.target.value)}
                  className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : ''}>Participantes (Condomínio)</Label>
                <Textarea
                  value={formData.participantes_condominio}
                  onChange={(e) => handleInputChange("participantes_condominio", e.target.value)}
                  className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : ''}>Participantes (Locatário)</Label>
                <Textarea
                  value={formData.participantes_locatario}
                  onChange={(e) => handleInputChange("participantes_locatario", e.target.value)}
                  className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : ''}>OS</Label>
                <Input
                  value={formData.os_numero}
                  onChange={(e) => handleInputChange("os_numero", e.target.value)}
                  className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>
              
              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : ''}>Gerenciadora</Label>
                <Input
                  value={formData.empreendimento_gerenciadora}
                  onChange={(e) => handleInputChange("empreendimento_gerenciadora", e.target.value)}
                  className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>
            </div>

            {/* Campos de datas opcionais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : ''}>Envio de Projetos</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={`w-full justify-start ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.data_envio_projetos ? format(formData.data_envio_projetos, 'dd/MM/yyyy') : 'Selecionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.data_envio_projetos}
                      onSelect={(date) => handleDateChange("data_envio_projetos", date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : ''}>Início das Atividades</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={`w-full justify-start ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.data_inicio_atividades ? format(formData.data_inicio_atividades, 'dd/MM/yyyy') : 'Selecionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.data_inicio_atividades}
                      onSelect={(date) => handleDateChange("data_inicio_atividades", date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : ''}>Previsão de Ocupação</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={`w-full justify-start ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.data_previsao_ocupacao ? format(formData.data_previsao_ocupacao, 'dd/MM/yyyy') : 'Selecionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.data_previsao_ocupacao}
                      onSelect={(date) => handleDateChange("data_previsao_ocupacao", date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="imagem_ko" className={isDark ? 'text-gray-300' : ''}>Imagem</Label>
            <Input
              type="file"
              onChange={handleFileUpload}
              disabled={uploading}
              className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
            />
            {uploading && (
              <div className="flex items-center text-sm text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fazendo upload...
              </div>
            )}
            {formData.imagem_ko && (
              <div className="mt-2 space-y-2">
                <img src={formData.imagem_ko} alt="Preview" className="rounded-lg max-h-48 w-auto"/>
                <Label htmlFor="comentario_im_ko" className={isDark ? 'text-gray-300' : ''}>Comentário da Imagem</Label>
                <Textarea
                  id="comentario_im_ko"
                  value={formData.comentario_im_ko}
                  onChange={(e) => handleInputChange("comentario_im_ko", e.target.value)}
                  className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>
            )}
          </div>
        </form>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || uploading}>
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
      </DialogContent>
    </Dialog>
  );
}