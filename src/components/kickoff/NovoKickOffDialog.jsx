import React, { useState } from "react";
import { KO_unidade } from "@/api/entities";
import { DisciplinaGeral } from "@/api/entities";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Building2, Users, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";

const emissoesOptions = ["1ª Emissão", "2ª Emissão", "3ª Emissão", "4ª Emissão", "5ª Emissão"];
const statusOptions = ["Pendente", "Em Andamento", "Concluído"];

export default function NovoKickOffDialog({ open, onOpenChange, unidadeId, onSuccess }) {
  const [formData, setFormData] = useState({
    // Campos simplificados
    item_ko: "Reunião de Kick-Off", // Valor padrão
    emissao_ko: "1ª Emissão",
    status: "Pendente",
    disciplina_ko: "Geral", // Valor padrão
    
    // Campos da ATA
    data_reuniao: new Date(),
    hora_reuniao: "",
    participantes_interativa: "",
    participantes_condominio: "",
    participantes_locatario: "",
    os_numero: "",
    empreendimento_gerenciadora: "",
    torre_pavimento_conjunto: "",
    metros_quadrados: "",
    escopo_servicos_interativa: "",
    escopo_servicos_locatario: "",
    data_envio_projetos: null,
    data_inicio_atividades: null,
    data_previsao_ocupacao: null,
    particularidades: "",
    outras_informacoes: "",
    imagem_ko: "",
    comentario_im_ko: ""
  });
  
  const [disciplinas, setDisciplinas] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  React.useEffect(() => {
    if (open) {
      loadDisciplinas();
    }
  }, [open]);

  const loadDisciplinas = async () => {
    try {
      const data = await DisciplinaGeral.list("prefixo_disciplina");
      setDisciplinas(data);
      if (data.length > 0 && !formData.disciplina_ko) {
        setFormData(prev => ({ ...prev, disciplina_ko: data[0].descricao_disciplina }));
      }
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
    if (!unidadeId) return;

    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        id_unidade: unidadeId,
        data_inclusao_ko: new Date().toISOString(),
        data_reuniao: formData.data_reuniao.toISOString(),
        data_envio_projetos: formData.data_envio_projetos ? formData.data_envio_projetos.toISOString() : null,
        data_inicio_atividades: formData.data_inicio_atividades ? formData.data_inicio_atividades.toISOString() : null,
        data_previsao_ocupacao: formData.data_previsao_ocupacao ? formData.data_previsao_ocupacao.toISOString() : null
      };
      await KO_unidade.create(dataToSave);
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Erro ao criar novo kick off:", error);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      item_ko: "Reunião de Kick-Off",
      emissao_ko: "1ª Emissão",
      status: "Pendente",
      disciplina_ko: disciplinas.length > 0 ? disciplinas[0].descricao_disciplina : "Geral",
      data_reuniao: new Date(),
      hora_reuniao: "",
      participantes_interativa: "",
      participantes_condominio: "",
      participantes_locatario: "",
      os_numero: "",
      empreendimento_gerenciadora: "",
      torre_pavimento_conjunto: "",
      metros_quadrados: "",
      escopo_servicos_interativa: "",
      escopo_servicos_locatario: "",
      data_envio_projetos: null,
      data_inicio_atividades: null,
      data_previsao_ocupacao: null,
      particularidades: "",
      outras_informacoes: "",
      imagem_ko: "",
      comentario_im_ko: ""
    });
  };

  const isDark = theme === 'dark';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className={`sm:max-w-4xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-800' : ''}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
            <Building2 className="w-5 h-5" />
            ATA - REUNIÃO / FIT-OUT
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações da Reunião */}
          <Card className={isDark ? 'bg-gray-700' : ''}>
            <CardHeader>
              <CardTitle className={`text-lg flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
                <Clock className="w-4 h-4" />
                Informações da Reunião
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={isDark ? 'text-gray-300' : ''}>Data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={`w-full justify-start ${isDark ? 'bg-gray-600 border-gray-500' : ''}`}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(formData.data_reuniao, 'dd/MM/yyyy')}
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
                  <Label className={isDark ? 'text-gray-300' : ''}>Hora</Label>
                  <Input
                    type="time"
                    value={formData.hora_reuniao}
                    onChange={(e) => handleInputChange("hora_reuniao", e.target.value)}
                    className={isDark ? 'bg-gray-600 border-gray-500' : ''}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className={isDark ? 'text-gray-300' : ''}>Participantes (Interativa)</Label>
                  <Textarea
                    value={formData.participantes_interativa}
                    onChange={(e) => handleInputChange("participantes_interativa", e.target.value)}
                    placeholder="Nome dos participantes da Interativa"
                    className={`min-h-[60px] ${isDark ? 'bg-gray-600 border-gray-500' : ''}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label className={isDark ? 'text-gray-300' : ''}>Participantes (Condomínio)</Label>
                  <Textarea
                    value={formData.participantes_condominio}
                    onChange={(e) => handleInputChange("participantes_condominio", e.target.value)}
                    placeholder="Nome dos participantes do condomínio"
                    className={`min-h-[60px] ${isDark ? 'bg-gray-600 border-gray-500' : ''}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label className={isDark ? 'text-gray-300' : ''}>Participantes (Locatário)</Label>
                  <Textarea
                    value={formData.participantes_locatario}
                    onChange={(e) => handleInputChange("participantes_locatario", e.target.value)}
                    placeholder="Nome dos participantes do locatário"
                    className={`min-h-[60px] ${isDark ? 'bg-gray-600 border-gray-500' : ''}`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dados do Projeto */}
          <Card className={isDark ? 'bg-gray-700' : ''}>
            <CardHeader>
              <CardTitle className={`text-lg flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
                <Building2 className="w-4 h-4" />
                Dados do Projeto
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={isDark ? 'text-gray-300' : ''}>OS</Label>
                  <Input
                    value={formData.os_numero}
                    onChange={(e) => handleInputChange("os_numero", e.target.value)}
                    placeholder="Número da OS"
                    className={isDark ? 'bg-gray-600 border-gray-500' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={isDark ? 'text-gray-300' : ''}>Gerenciadora</Label>
                  <Input
                    value={formData.empreendimento_gerenciadora}
                    onChange={(e) => handleInputChange("empreendimento_gerenciadora", e.target.value)}
                    placeholder="Nome da Gerenciadora"
                    className={isDark ? 'bg-gray-600 border-gray-500' : ''}
                  />
                </div>
              
                <div className="space-y-2 md:col-span-2">
                  <Label className={isDark ? 'text-gray-300' : ''}>Empreendimento/Torre/Pavimento/Conjunto</Label>
                  <Input
                    value={formData.torre_pavimento_conjunto}
                    onChange={(e) => handleInputChange("torre_pavimento_conjunto", e.target.value)}
                    placeholder="Ex: Empreendimento X / Torre A / 5º andar"
                    className={isDark ? 'bg-gray-600 border-gray-500' : ''}
                  />
                </div>
                 <div className="space-y-2">
                  <Label className={isDark ? 'text-gray-300' : ''}>Metros Quadrados</Label>
                  <Input
                    value={formData.metros_quadrados}
                    onChange={(e) => handleInputChange("metros_quadrados", e.target.value)}
                    placeholder="Área em m²"
                    className={isDark ? 'bg-gray-600 border-gray-500' : ''}
                  />
                </div>
            </CardContent>
          </Card>

          {/* Escopo dos Serviços */}
          <Card className={isDark ? 'bg-gray-700' : ''}>
            <CardHeader>
              <CardTitle className={`text-lg ${isDark ? 'text-white' : ''}`}>Escopo dos Serviços</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : ''}>Escopo dos Serviços Interativa</Label>
                <Textarea
                  value={formData.escopo_servicos_interativa}
                  onChange={(e) => handleInputChange("escopo_servicos_interativa", e.target.value)}
                  placeholder="Descreva o escopo dos serviços da Interativa"
                  className={`min-h-[100px] ${isDark ? 'bg-gray-600 border-gray-500' : ''}`}
                />
              </div>

              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : ''}>Escopo dos Serviços Locatário</Label>
                <Textarea
                  value={formData.escopo_servicos_locatario}
                  onChange={(e) => handleInputChange("escopo_servicos_locatario", e.target.value)}
                  placeholder="Descreva o escopo dos serviços do locatário"
                  className={`min-h-[100px] ${isDark ? 'bg-gray-600 border-gray-500' : ''}`}
                />
              </div>
            </CardContent>
          </Card>

          {/* Cronograma */}
          <Card className={isDark ? 'bg-gray-700' : ''}>
            <CardHeader>
              <CardTitle className={`text-lg ${isDark ? 'text-white' : ''}`}>Cronograma</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                  <Label className={isDark ? 'text-gray-300' : ''}>Envio dos Projetos (Data)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={`w-full justify-start ${isDark ? 'bg-gray-600 border-gray-500' : ''}`}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.data_envio_projetos ? format(formData.data_envio_projetos, 'dd/MM/yyyy') : 'Selecionar data'}
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
                  <Label className={isDark ? 'text-gray-300' : ''}>Início das Atividades em Campo (Data)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={`w-full justify-start ${isDark ? 'bg-gray-600 border-gray-500' : ''}`}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.data_inicio_atividades ? format(formData.data_inicio_atividades, 'dd/MM/yyyy') : 'Selecionar data'}
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
                  <Label className={isDark ? 'text-gray-300' : ''}>Previsão de Ocupação (Data)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={`w-full justify-start ${isDark ? 'bg-gray-600 border-gray-500' : ''}`}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.data_previsao_ocupacao ? format(formData.data_previsao_ocupacao, 'dd/MM/yyyy') : 'Selecionar data'}
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
            </CardContent>
          </Card>

          {/* Informações Adicionais */}
          <Card className={isDark ? 'bg-gray-700' : ''}>
            <CardHeader>
              <CardTitle className={`text-lg ${isDark ? 'text-white' : ''}`}>Informações Adicionais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : ''}>Particularidades</Label>
                <Textarea
                  value={formData.particularidades}
                  onChange={(e) => handleInputChange("particularidades", e.target.value)}
                  placeholder="Descreva as particularidades do projeto"
                  className={`min-h-[100px] ${isDark ? 'bg-gray-600 border-gray-500' : ''}`}
                />
              </div>

              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : ''}>Outras Informações</Label>
                <Textarea
                  value={formData.outras_informacoes}
                  onChange={(e) => handleInputChange("outras_informacoes", e.target.value)}
                  placeholder="Outras informações relevantes"
                  className={`min-h-[100px] ${isDark ? 'bg-gray-600 border-gray-500' : ''}`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imagem_ko" className={isDark ? 'text-gray-300' : ''}>Anexar Imagem</Label>
                <Input 
                  id="imagem_ko" 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileUpload} 
                  disabled={uploading} 
                  className={`file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold ${isDark ? 'bg-gray-600 border-gray-500 file:bg-gray-500 file:text-white' : 'file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'}`} 
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
                      placeholder="Adicione um comentário para a imagem" 
                      className={isDark ? 'bg-gray-600 border-gray-500' : ''} 
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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
              "Salvar Kick Off"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}