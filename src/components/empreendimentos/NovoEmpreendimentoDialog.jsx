import React, { useState, useEffect } from "react";
import { Empreendimento } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import { addDays, format, differenceInDays } from 'date-fns';
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
import { Upload, Building2, Users, Calendar, Phone, HardHat, Layers, Home, X, Info, MapPin, FileText } from "lucide-react";

const t = {
  newProject: "Novo Empreendimento",
  projectName: "Nome do Empreendimento",
  client: "Cliente",
  osNumber: "Contrato (OS) Nº",
  projectAcronym: "Sigla da Obra (para QR Code)",
  contractStartDate: "Data de Início do Contrato",
  terminoObraPrevisto: "Término da Obra (Previsto)",
  contractEndDate: "Data de Término do Contrato",
  dataSemEntrega: "Data Sem Entrega",
  contractTermDays: "Prazo Contratual (dias)",
  valorContratual: "Valor Contratual",
  projectAddress: "Endereço do Empreendimento",
  coverFooterText: "Texto Rodapé da Capa do Relatório",
  propertyAge: "Idade do Imóvel (anos)",
  numberOfFloors: "Quantidade de Pavimentos",
  numberOfUnits: "Quantidade de Conjuntos",
  bmContact: "BM + Contato",
  maintainerContact: "Mantenedor + Contato",
  designersContact: "Projetistas + Contatos",
  projectParticularities: "Particularidades do Projeto",
  mainPhoto: "Foto Principal do Empreendimento",
  responsibleLogo: "Logo do Responsável (ex: CBRE, Cushman & Wakefield)",
  galleryPhotos: "Galeria de Fotos",
  addPhotoLegend: "Legenda da foto (opcional)",
  cancel: "Cancelar",
  createProject: "Criar Empreendimento",
  saving: "Salvando...",
  uploadedPhotos: "Fotos Adicionadas",
};

export default function NovoEmpreendimentoDialog({ open, onOpenChange, onSuccess }) {
  const [formData, setFormData] = useState({
    nome_empreendimento: "",
    cli_empreendimento: "",
    endereco_empreendimento: "",
    foto_empreendimento: "",
    fotos_empreendimento: [],
    logo_responsavel: "",
    idade_imovel: "",
    bm_contato: "",
    mantenedor_contato: "",
    projetistas_contatos: "",
    quantidade_pavimentos: "",
    quantidade_conjuntos: "",
    particularidades: "",
    texto_capa_rodape: "",
    os_number: "",
    sigla_obra: "", // New field
    data_inicio_contrato: "",
    termino_obra_previsto: "", // New field
    data_termino_contrato: "",
    data_sem_entrega: "", // New field
    valor_contratual: "", // New field
    prazo_contratual_dias: "",
  });
  const [uploading, setUploading] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (formData.data_inicio_contrato && formData.data_termino_contrato) {
      try {
        // Corrected: Parse dates as UTC to avoid timezone issues affecting differenceInDays.
        // Appending 'T00:00:00Z' ensures the Date objects are created at midnight UTC.
        const startDate = new Date(`${formData.data_inicio_contrato}T00:00:00Z`);
        const endDate = new Date(`${formData.data_termino_contrato}T00:00:00Z`);

        if (endDate >= startDate) {
          const diff = differenceInDays(endDate, startDate);
          if (String(diff) !== formData.prazo_contratual_dias) {
            setFormData(prev => ({ ...prev, prazo_contratual_dias: String(diff) }));
          }
        } else if (formData.prazo_contratual_dias !== "") {
          setFormData(prev => ({ ...prev, prazo_contratual_dias: "" }));
        }
      } catch (e) {
        console.error("Error calculating duration", e);
        if (formData.prazo_contratual_dias !== "") {
          setFormData(prev => ({ ...prev, prazo_contratual_dias: "" }));
        }
      }
    } else if (formData.prazo_contratual_dias !== "") {
      setFormData(prev => ({ ...prev, prazo_contratual_dias: "" }));
    }
  }, [formData.data_inicio_contrato, formData.data_termino_contrato, formData.prazo_contratual_dias]);


  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({ ...prev, foto_empreendimento: file_url }));
    } catch (error) {
      console.error("Erro ao fazer upload da foto principal:", error);
      // Optionally add a user-facing error message here
    }
    setUploading(false);
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingGallery(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const { file_url } = await UploadFile({ file });
        return { url: file_url, legenda: "" };
      });

      const newPhotos = await Promise.all(uploadPromises);
      setFormData(prev => ({
        ...prev,
        fotos_empreendimento: [...prev.fotos_empreendimento, ...newPhotos]
      }));
    } catch (error) {
      console.error("Erro ao fazer upload das fotos da galeria:", error);
      // Optionally add a user-facing error message here
    }
    setUploadingGallery(false);
    e.target.value = '';
  };

  const handleRemovePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      fotos_empreendimento: prev.fotos_empreendimento.filter((_, i) => i !== index)
    }));
  };

  const handlePhotoLegendChange = (index, legenda) => {
    setFormData(prev => ({
      ...prev,
      fotos_empreendimento: prev.fotos_empreendimento.map((foto, i) =>
        i === index ? { ...foto, legenda } : foto
      )
    }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({ ...prev, logo_responsavel: file_url }));
    } catch (error) {
      console.error("Erro ao fazer upload da logo:", error);
    }
    setUploadingLogo(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome_empreendimento || !formData.cli_empreendimento) return;

    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        idade_imovel: formData.idade_imovel ? parseInt(formData.idade_imovel) : null,
        quantidade_pavimentos: formData.quantidade_pavimentos ? parseInt(formData.quantidade_pavimentos) : null,
        quantidade_conjuntos: formData.quantidade_conjuntos ? parseInt(formData.quantidade_conjuntos) : null,
        prazo_contratual_dias: formData.prazo_contratual_dias ? parseInt(formData.prazo_contratual_dias) : null,
        // valor_contratual is kept as string or null
      };
      await Empreendimento.create(dataToSave);
      onSuccess();
      onOpenChange(false);
      setFormData({
        nome_empreendimento: "",
        cli_empreendimento: "",
        endereco_empreendimento: "",
        foto_empreendimento: "",
        fotos_empreendimento: [],
        logo_responsavel: "",
        idade_imovel: "",
        bm_contato: "",
        mantenedor_contato: "",
        projetistas_contatos: "",
        quantidade_pavimentos: "",
        quantidade_conjuntos: "",
        particularidades: "",
        texto_capa_rodape: "",
        os_number: "",
        sigla_obra: "", // Reset new field
        data_inicio_contrato: "",
        termino_obra_previsto: "", // Reset new field
        data_termino_contrato: "",
        data_sem_entrega: "", // Reset new field
        valor_contratual: "", // Reset new field
        prazo_contratual_dias: "",
      });
    } catch (error) {
      console.error("Erro ao criar empreendimento:", error);
      // Optionally add a user-facing error message here
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto md:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {t.newProject}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header/Basic Info section adjusted as per outline */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Informações Gerais</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">{t.projectName}</Label>
                <Input
                  id="nome"
                  value={formData.nome_empreendimento}
                  onChange={(e) => handleInputChange("nome_empreendimento", e.target.value)}
                  placeholder={t.projectName}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente">{t.client}</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="cliente"
                    value={formData.cli_empreendimento}
                    onChange={(e) => handleInputChange("cli_empreendimento", e.target.value)}
                    className="pl-10"
                    placeholder={t.client}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="os_number">{t.osNumber}</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="os_number"
                    value={formData.os_number}
                    onChange={(e) => handleInputChange("os_number", e.target.value)}
                    className="pl-10"
                    placeholder="Ex: 12345/2023"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sigla_obra">{t.projectAcronym}</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="sigla_obra"
                    value={formData.sigla_obra}
                    onChange={(e) => handleInputChange("sigla_obra", e.target.value)}
                    className="pl-10"
                    placeholder="Ex: ED_PAULISTA"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_inicio_contrato">{t.contractStartDate}</Label>
                <Input
                  id="data_inicio_contrato"
                  type="date"
                  value={formData.data_inicio_contrato}
                  onChange={(e) => handleInputChange("data_inicio_contrato", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="termino_obra_previsto">{t.terminoObraPrevisto}</Label>
                <Input
                  id="termino_obra_previsto"
                  type="date"
                  value={formData.termino_obra_previsto}
                  onChange={(e) => handleInputChange("termino_obra_previsto", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_termino_contrato">{t.contractEndDate}</Label>
                <Input
                  id="data_termino_contrato"
                  type="date"
                  value={formData.data_termino_contrato}
                  onChange={(e) => handleInputChange("data_termino_contrato", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_sem_entrega">{t.dataSemEntrega}</Label>
                <Input
                  id="data_sem_entrega"
                  type="date"
                  value={formData.data_sem_entrega}
                  onChange={(e) => handleInputChange("data_sem_entrega", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prazo_contratual_dias">{t.contractTermDays}</Label>
                <Input
                  id="prazo_contratual_dias"
                  type="number"
                  placeholder={t.contractTermDays}
                  value={formData.prazo_contratual_dias}
                  readOnly
                  className="bg-gray-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor_contratual">{t.valorContratual}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-3 w-4 h-4 text-gray-400">R$</span>
                  <Input
                    id="valor_contratual"
                    value={formData.valor_contratual}
                    onChange={(e) => handleInputChange("valor_contratual", e.target.value)}
                    className="pl-8"
                    placeholder="Ex: 100.000,00"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endereco">{t.projectAddress}</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="endereco"
                  value={formData.endereco_empreendimento}
                  onChange={(e) => handleInputChange("endereco_empreendimento", e.target.value)}
                  className="pl-10"
                  placeholder="Ex: Av. Paulista, 1000 - São Paulo, SP"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="texto_capa_rodape">{t.coverFooterText}</Label>
              <div className="relative">
                <Info className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Textarea
                  id="texto_capa_rodape"
                  value={formData.texto_capa_rodape}
                  onChange={(e) => handleInputChange("texto_capa_rodape", e.target.value)}
                  className="pl-10 min-h-[80px]"
                  placeholder="Ex: Confidencial, apenas para uso interno."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="idade">{t.propertyAge}</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="idade"
                  type="number"
                  min="0"
                  value={formData.idade_imovel}
                  onChange={(e) => handleInputChange("idade_imovel", e.target.value)}
                  className="pl-10"
                  placeholder="Ex: 15"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pavimentos">{t.numberOfFloors}</Label>
                <div className="relative">
                  <Layers className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="pavimentos"
                    type="number"
                    min="1"
                    value={formData.quantidade_pavimentos}
                    onChange={(e) => handleInputChange("quantidade_pavimentos", e.target.value)}
                    className="pl-10"
                    placeholder="Ex: 25"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="conjuntos">{t.numberOfUnits}</Label>
                <div className="relative">
                  <Home className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="conjuntos"
                    type="number"
                    min="1"
                    value={formData.quantidade_conjuntos}
                    onChange={(e) => handleInputChange("quantidade_conjuntos", e.target.value)}
                    className="pl-10"
                    placeholder="Ex: 200"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contatos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Contatos</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bm">{t.bmContact}</Label>
                <div className="relative">
                  <HardHat className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Textarea
                    id="bm"
                    value={formData.bm_contato}
                    onChange={(e) => handleInputChange("bm_contato", e.target.value)}
                    className="pl-10 min-h-[80px]"
                    placeholder="Nome do BM, telefone, email..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mantenedor">{t.maintainerContact}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Textarea
                    id="mantenedor"
                    value={formData.mantenedor_contato}
                    onChange={(e) => handleInputChange("mantenedor_contato", e.target.value)}
                    className="pl-10 min-h-[80px]"
                    placeholder="Nome da empresa mantenedora, contato, telefone..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="projetistas">{t.designersContact}</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Textarea
                    id="projetistas"
                    value={formData.projetistas_contatos}
                    onChange={(e) => handleInputChange("projetistas_contatos", e.target.value)}
                    className="pl-10 min-h-[100px]"
                    placeholder="Lista de projetistas por disciplina e seus contatos..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="particularidades">{t.projectParticularities}</Label>
                <div className="relative">
                  <Info className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Textarea
                    id="particularidades"
                    value={formData.particularidades}
                    onChange={(e) => handleInputChange("particularidades", e.target.value)}
                    className="pl-10 min-h-[100px]"
                    placeholder="Descreva aqui quaisquer detalhes, restrições ou informações importantes sobre o projeto..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Fotos Section - Renamed */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Fotos e Logos</h3>

            <div className="space-y-4">
              {/* Foto Principal */}
              <div className="space-y-2">
                <Label htmlFor="foto">{t.mainPhoto}</Label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="flex-1"
                  />
                  {uploading && (
                    <Button disabled size="icon">
                      <Upload className="w-4 h-4 animate-pulse" />
                    </Button>
                  )}
                </div>
                {formData.foto_empreendimento && (
                  <div className="mt-2">
                    <img
                      src={formData.foto_empreendimento}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                    />
                  </div>
                )}
              </div>

              {/* Logo do Responsável */}
              <div className="space-y-2">
                <Label htmlFor="logo">{t.responsibleLogo}</Label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="flex-1"
                  />
                  {uploadingLogo && (
                    <Button disabled size="icon">
                      <Upload className="w-4 h-4 animate-pulse" />
                    </Button>
                  )}
                </div>
                {formData.logo_responsavel && (
                  <div className="mt-2">
                    <img
                      src={formData.logo_responsavel}
                      alt="Logo Responsável"
                      className="h-20 object-contain rounded-lg border-2 border-gray-200 bg-white p-2"
                    />
                  </div>
                )}
              </div>

              {/* Galeria de Fotos */}
              <div className="space-y-2">
                <Label htmlFor="galeria">{t.galleryPhotos}</Label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    multiple // Allows multiple file selection
                    onChange={handleGalleryUpload}
                    disabled={uploadingGallery}
                    className="flex-1"
                  />
                  {uploadingGallery && (
                    <Button disabled size="icon">
                      <Upload className="w-4 h-4 animate-pulse" />
                    </Button>
                  )}
                </div>

                {formData.fotos_empreendimento.length > 0 && (
                  <div className="mt-4 space-y-4">
                    <h4 className="font-medium">{t.uploadedPhotos} ({formData.fotos_empreendimento.length})</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {formData.fotos_empreendimento.map((foto, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={foto.url}
                            alt={`Foto ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            onClick={() => handleRemovePhoto(index)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                          <div className="mt-2">
                            <Input
                              placeholder={t.addPhotoLegend}
                              value={foto.legenda}
                              onChange={(e) => handlePhotoLegendChange(index, e.target.value)}
                              className="text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t.cancel}
            </Button>
            <Button
              type="submit"
              disabled={saving || !formData.nome_empreendimento || !formData.cli_empreendimento}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? t.saving : t.createProject}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}