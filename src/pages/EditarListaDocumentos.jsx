import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { RDO, Empreendimento } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import SignatureField from '@/components/signature/SignatureField';
import SignatureDialog from '@/components/signature/SignatureDialog';

// Função para compressão de imagem
const compressImage = async (file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => resolve(blob),
          'image/jpeg',
          quality
        );
      };
    };
  });
};

const translations = {
  pt: {
    backToList: "Voltar à Lista",
    editDocument: "Editar Documento",
    save: "Salvar",
    saving: "Salvando...",
    generalInfo: "Informações Gerais",
    documentType: "Tipo de Documento",
    reportNumber: "Número do Relatório",
    fileName: "Nome do Arquivo",
    reportDate: "Data do Relatório",
    dayOfWeek: "Dia da Semana",
    workDetails: "Detalhes da Obra",
    workName: "Nome da Obra",
    location: "Local",
    contractor: "Contratada",
    responsible: "Responsável",
    contract: "Contrato",
    contractualDeadline: "Prazo Contratual (dias)",
    elapsedTime: "Prazo Decorrido (dias)",
    remainingTime: "Prazo a Vencer (dias)",
    weatherCondition: "Condição Climática",
    morning: "Manhã",
    afternoon: "Tarde",
    weather: "Tempo",
    condition: "Condição",
    fieldTeams: "Equipe de Campo",
    juniorEngineer: "Engenheiro Pleno",
    seniorEngineer: "Engenheiro Sênior",
    administrative: "Administrativo",
    thirdParty: "Terceiros",
    activitiesPerformed: "Atividades Realizadas",
    addActivity: "Adicionar Atividade",
    occurrences: "Ocorrências",
    addOccurrence: "Adicionar Ocorrência",
    photographicRecords: "Registros Fotográficos",
    addPhoto: "Adicionar Foto",
    photoCaption: "Legenda da Foto",
    uploadPhoto: "Fazer Upload",
    observations: "Observações",
    signatures: "Assinaturas",
    addSignature: "Adicionar Assinatura",
    signatureName: "Nome do Signatário",
    removeSignature: "Remover",
    status: "Status do Documento",
    loading: "Carregando documento..."
  },
  en: {
    backToList: "Back to List",
    editDocument: "Edit Document",
    save: "Save",
    saving: "Saving...",
    generalInfo: "General Information",
    documentType: "Document Type",
    reportNumber: "Report Number",
    reportDate: "Report Date",
    dayOfWeek: "Day of Week",
    workDetails: "Work Details",
    workName: "Work Name",
    location: "Location",
    contractor: "Contractor",
    responsible: "Responsible",
    contract: "Contract",
    contractualDeadline: "Contractual Deadline (days)",
    elapsedTime: "Elapsed Time (days)",
    remainingTime: "Remaining Time (days)",
    weatherCondition: "Weather Condition",
    morning: "Morning",
    afternoon: "Afternoon",
    weather: "Weather",
    condition: "Condition",
    fieldTeams: "Field Teams",
    juniorEngineer: "Junior Engineer",
    seniorEngineer: "Senior Engineer",
    administrative: "Administrative",
    thirdParty: "Third Party",
    activitiesPerformed: "Activities Performed",
    addActivity: "Add Activity",
    occurrences: "Occurrences",
    addOccurrence: "Add Occurrence",
    photographicRecords: "Photographic Records",
    addPhoto: "Add Photo",
    photoCaption: "Photo Caption",
    uploadPhoto: "Upload",
    observations: "Observations",
    status: "Document Status",
    loading: "Loading document..."
  }
};

export default function EditarListaDocumentos({ language: initialLanguage, theme: initialTheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const documentoId = urlParams.get('documentoId');

  const [empreendimento, setEmpreendimento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [language, setLanguage] = useState(initialLanguage || 'pt');
  const [theme, setTheme] = useState(initialTheme || 'light');

  const [formData, setFormData] = useState({
    tipo_documento: 'Lista de Documentos',
    numero_relatorio: '',
    nome_arquivo: '',
    data_relatorio: '',
    dia_semana: '',
    obra_nome: '',
    obra_local: '',
    contratada: '',
    responsavel: '',
    contrato: '',
    prazo_contratual: '',
    prazo_decorrido: '',
    prazo_vencer: '',
    condicao_climatica: {
      manha_tempo: '',
      manha_condicao: '',
      tarde_tempo: '',
      tarde_condicao: ''
    },
    equipes_campo: {
      engenheiro_pleno: 0,
      engenheiro_senior: 0,
      administrativo: 0,
      terceiros: 0
    },
    atividades_realizadas: [],
    ocorrencias: [],
    fotos: [],
    assinaturas: [],
    observacoes: '',
    status_documento: 'Rascunho'
  });

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [signatureEditIndex, setSignatureEditIndex] = useState(null);

  const t = translations[language];
  const isDark = theme === 'dark';

  useEffect(() => {
    const handleLanguageChange = () => setLanguage(localStorage.getItem('language') || 'pt');
    const handleThemeChange = () => setTheme(localStorage.getItem('theme') || 'light');
    window.addEventListener('language-change', handleLanguageChange);
    window.addEventListener('theme-change', handleThemeChange);
    handleLanguageChange();
    handleThemeChange();
    return () => {
      window.removeEventListener('language-change', handleLanguageChange);
      window.removeEventListener('theme-change', handleThemeChange);
    };
  }, []);

  useEffect(() => {
    if (documentoId) {
      loadData();
    }
  }, [documentoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const docData = await RDO.get(documentoId);

      if (docData.id_empreendimento) {
        const empData = await Empreendimento.get(docData.id_empreendimento);
        setEmpreendimento(empData);

        // Auto-preencher campos do empreendimento (mantém numero_relatorio do usuário)
        docData.obra_nome = empData.nome_empreendimento || docData.obra_nome;
        docData.obra_local = empData.endereco_empreendimento || docData.obra_local;
        docData.contrato = empData.os_number || docData.contrato;
        docData.prazo_contratual = empData.prazo_contratual_dias || docData.prazo_contratual;

        // Calcular prazos automaticamente
        if (empData.data_inicio_contrato && docData.data_relatorio) {
          const dataInicio = new Date(empData.data_inicio_contrato + 'T00:00:00');
          const dataRelatorio = new Date(docData.data_relatorio + 'T00:00:00');
          const prazoDecorrido = Math.floor((dataRelatorio - dataInicio) / (1000 * 60 * 60 * 24));
          docData.prazo_decorrido = prazoDecorrido > 0 ? prazoDecorrido : 0;
        }

        if (empData.data_termino_contrato && docData.data_relatorio) {
          const dataTermino = new Date(empData.data_termino_contrato + 'T00:00:00');
          const dataRelatorio = new Date(docData.data_relatorio + 'T00:00:00');
          const prazoVencer = Math.floor((dataTermino - dataRelatorio) / (1000 * 60 * 60 * 24));
          docData.prazo_vencer = prazoVencer > 0 ? prazoVencer : 0;
        }
      }

      setFormData(docData);
    } catch (error) {
      console.error("Erro ao carregar documento:", error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fill day of week when date changes
  useEffect(() => {
    if (formData.data_relatorio) {
      const date = new Date(formData.data_relatorio + 'T00:00:00');
      const days = ['Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado'];
      const dayName = days[date.getDay()];
      setFormData(prev => ({ ...prev, dia_semana: dayName }));
    }
  }, [formData.data_relatorio]);

  // Calcular prazos automaticamente quando a data muda
  useEffect(() => {
    if (empreendimento && formData.data_relatorio) {
      // Calcular prazo decorrido
      if (empreendimento.data_inicio_contrato) {
        const dataInicio = new Date(empreendimento.data_inicio_contrato + 'T00:00:00');
        const dataRelatorio = new Date(formData.data_relatorio + 'T00:00:00');
        const prazoDecorrido = Math.floor((dataRelatorio - dataInicio) / (1000 * 60 * 60 * 24));
        setFormData(prev => ({ ...prev, prazo_decorrido: prazoDecorrido > 0 ? prazoDecorrido : 0 }));
      }

      // Calcular prazo a vencer
      if (empreendimento.data_termino_contrato) {
        const dataTermino = new Date(empreendimento.data_termino_contrato + 'T00:00:00');
        const dataRelatorio = new Date(formData.data_relatorio + 'T00:00:00');
        const prazoVencer = Math.floor((dataTermino - dataRelatorio) / (1000 * 60 * 60 * 24));
        setFormData(prev => ({ ...prev, prazo_vencer: prazoVencer > 0 ? prazoVencer : 0 }));
      }
    }
  }, [formData.data_relatorio, empreendimento]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        prazo_contratual: String(formData.prazo_contratual || ''),
        prazo_decorrido: String(formData.prazo_decorrido || ''),
        prazo_vencer: String(formData.prazo_vencer || '')
      };
      await RDO.update(documentoId, dataToSave);
      navigate(createPageUrl(`EmpreendimentoListaDocumentos?empreendimentoId=${formData.id_empreendimento}`));
    } catch (error) {
      console.error("Erro ao salvar documento:", error);
    } finally {
      setSaving(false);
    }
  };

  const addAtividade = () => {
    setFormData(prev => ({
      ...prev,
      atividades_realizadas: [
        ...(prev.atividades_realizadas || []),
        { numero: (prev.atividades_realizadas?.length || 0) + 1, descricao: '' }
      ]
    }));
  };

  const removeAtividade = (index) => {
    setFormData(prev => ({
      ...prev,
      atividades_realizadas: prev.atividades_realizadas.filter((_, i) => i !== index)
    }));
  };

  const updateAtividade = (index, descricao) => {
    setFormData(prev => ({
      ...prev,
      atividades_realizadas: prev.atividades_realizadas.map((ativ, i) =>
        i === index ? { ...ativ, descricao } : ativ
      )
    }));
  };

  const addOcorrencia = () => {
    setFormData(prev => ({
      ...prev,
      ocorrencias: [
        ...(prev.ocorrencias || []),
        { numero: (prev.ocorrencias?.length || 0) + 1, descricao: '' }
      ]
    }));
  };

  const removeOcorrencia = (index) => {
    setFormData(prev => ({
      ...prev,
      ocorrencias: prev.ocorrencias.filter((_, i) => i !== index)
    }));
  };

  const updateOcorrencia = (index, descricao) => {
    setFormData(prev => ({
      ...prev,
      ocorrencias: prev.ocorrencias.map((ocor, i) =>
        i === index ? { ...ocor, descricao } : ocor
      )
    }));
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingPhoto(true);
    try {
      const uploadPromises = files.map(async (file) => {
        try {
          // Comprimir imagem antes do upload
          const compressedBlob = await compressImage(file, 1200, 1200, 0.8);
          const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
          console.log(`Imagem comprimida: ${file.name}, Tamanho original: ${(file.size / 1024).toFixed(2)}KB, Comprimido: ${(compressedFile.size / 1024).toFixed(2)}KB`);
          return base44.integrations.Core.UploadFile({ file: compressedFile });
        } catch (err) {
          console.error(`Erro ao comprimir ${file.name}:`, err);
          // Se falhar a compressão, envia o arquivo original
          return base44.integrations.Core.UploadFile({ file });
        }
      });
      const results = await Promise.all(uploadPromises);

      const newFotos = results.map(result => ({ url: result.file_url, legenda: '' }));
      setFormData(prev => ({
        ...prev,
        fotos: [...(prev.fotos || []), ...newFotos]
      }));
    } catch (error) {
      console.error("Erro ao fazer upload das fotos:", error);
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const removeFoto = (index) => {
    setFormData(prev => ({
      ...prev,
      fotos: prev.fotos.filter((_, i) => i !== index)
    }));
  };

  const updateFotoLegenda = (index, legenda) => {
    setFormData(prev => ({
      ...prev,
      fotos: prev.fotos.map((foto, i) =>
        i === index ? { ...foto, legenda } : foto
      )
    }));
  };

  const handleSignatureUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingPhoto(true);
    try {
      const uploadPromises = files.map(file =>
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);

      const newAssinaturas = results.map(result => ({ url: result.file_url, nome: '' }));
      setFormData(prev => ({
        ...prev,
        assinaturas: [...(prev.assinaturas || []), ...newAssinaturas]
      }));
    } catch (error) {
      console.error("Erro ao fazer upload das assinaturas:", error);
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const removeAssinatura = (index) => {
    setFormData(prev => ({
      ...prev,
      assinaturas: prev.assinaturas.filter((_, i) => i !== index)
    }));
  };

  const updateAssinaturaNome = (index, nome) => {
    setFormData(prev => ({
      ...prev,
      assinaturas: prev.assinaturas.map((ass, i) =>
        i === index ? { ...ass, nome } : ass
      )
    }));
  };

  const addAssinatura = () => {
    setFormData(prev => ({
      ...prev,
      assinaturas: [...(prev.assinaturas || []), { parte: '', nome: '', assinatura_imagem: '' }]
    }));
  };

  const updateAssinatura = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      assinaturas: prev.assinaturas.map((ass, i) =>
        i === index ? { ...ass, [field]: value } : ass
      )
    }));
  };

  const handleSignatureEdit = (index) => {
    setSignatureEditIndex(index);
    setSignatureDialogOpen(true);
  };

  const handleSignatureSave = (signatureImage) => {
    if (signatureEditIndex !== null) {
      updateAssinatura(signatureEditIndex, 'assinatura_imagem', signatureImage);
    }
    setSignatureDialogOpen(false);
    setSignatureEditIndex(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className={`ml-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t.loading}</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-6 space-y-6`}>
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl(`EmpreendimentoListaDocumentos?empreendimentoId=${formData.id_empreendimento}`))}
          className={isDark ? 'text-white border-gray-600 hover:bg-gray-800' : ''}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.backToList}
        </Button>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t.saving}
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {t.save}
            </>
          )}
        </Button>
      </div>

      <Card className={isDark ? 'bg-gray-800' : ''}>
        <CardHeader>
          <CardTitle className={isDark ? 'text-white' : ''}>{t.editDocument}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Informações Gerais */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : ''}`}>{t.generalInfo}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className={isDark ? 'text-gray-300' : ''}>{t.reportNumber}</Label>
                <Input
                  value={formData.numero_relatorio}
                  onChange={(e) => setFormData({ ...formData, numero_relatorio: e.target.value })}
                  className={isDark ? 'bg-gray-700 text-white' : ''}
                />
              </div>
              <div>
                <Label className={isDark ? 'text-gray-300' : ''}>{t.fileName}</Label>
                <Input
                  value={formData.nome_arquivo}
                  onChange={(e) => setFormData({ ...formData, nome_arquivo: e.target.value })}
                  placeholder="Ex: RDO-001"
                  className={isDark ? 'bg-gray-700 text-white' : ''}
                />
              </div>
              <div>
                <Label className={isDark ? 'text-gray-300' : ''}>{t.reportDate}</Label>
                <Input
                  type="date"
                  value={formData.data_relatorio}
                  onChange={(e) => setFormData({ ...formData, data_relatorio: e.target.value })}
                  className={isDark ? 'bg-gray-700 text-white' : ''}
                />
              </div>
              <div>
                <Label className={isDark ? 'text-gray-300' : ''}>{t.dayOfWeek}</Label>
                <Input
                  type="text"
                  value={formData.dia_semana}
                  disabled
                  className={isDark ? 'bg-gray-700 text-white' : ''}
                />
              </div>
            </div>
          </div>

          {/* Detalhes da Obra */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : ''}`}>{t.workDetails}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className={isDark ? 'text-gray-300' : ''}>{t.workName}</Label>
                <Input
                  value={formData.obra_nome}
                  onChange={(e) => setFormData({ ...formData, obra_nome: e.target.value })}
                  disabled
                  className={isDark ? 'bg-gray-700 text-white' : 'bg-gray-100'}
                />
              </div>
              <div>
                <Label className={isDark ? 'text-gray-300' : ''}>{t.location}</Label>
                <Input
                  value={formData.obra_local}
                  onChange={(e) => setFormData({ ...formData, obra_local: e.target.value })}
                  disabled
                  className={isDark ? 'bg-gray-700 text-white' : 'bg-gray-100'}
                />
              </div>
              <div>
                <Label className={isDark ? 'text-gray-300' : ''}>{t.contractor}</Label>
                <Input
                  value={formData.contratada}
                  onChange={(e) => setFormData({ ...formData, contratada: e.target.value })}
                  className={isDark ? 'bg-gray-700 text-white' : ''}
                />
              </div>
              <div>
                <Label className={isDark ? 'text-gray-300' : ''}>{t.responsible}</Label>
                <Input
                  value={formData.responsavel}
                  onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                  className={isDark ? 'bg-gray-700 text-white' : ''}
                />
              </div>
            </div>
          </div>

          {/* Informações do Contrato */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : ''}`}>{t.contractInfo}</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className={isDark ? 'text-gray-300' : ''}>{t.contract}</Label>
                <Input
                  value={formData.contrato}
                  onChange={(e) => setFormData({ ...formData, contrato: e.target.value })}
                  disabled
                  className={isDark ? 'bg-gray-700 text-white' : 'bg-gray-100'}
                />
              </div>
              <div>
                <Label className={isDark ? 'text-gray-300' : ''}>{t.contractualDeadline}</Label>
                <Input
                  type="number"
                  value={formData.prazo_contratual}
                  onChange={(e) => setFormData({ ...formData, prazo_contratual: e.target.value })}
                  disabled
                  className={isDark ? 'bg-gray-700 text-white' : 'bg-gray-100'}
                />
              </div>
              <div>
                <Label className={isDark ? 'text-gray-300' : ''}>{t.elapsedTime}</Label>
                <Input
                  type="number"
                  value={formData.prazo_decorrido}
                  onChange={(e) => setFormData({ ...formData, prazo_decorrido: e.target.value })}
                  disabled
                  className={isDark ? 'bg-gray-700 text-white' : 'bg-gray-100'}
                />
              </div>
              <div>
                <Label className={isDark ? 'text-gray-300' : ''}>{t.remainingTime}</Label>
                <Input
                  type="number"
                  value={formData.prazo_vencer}
                  onChange={(e) => setFormData({ ...formData, prazo_vencer: e.target.value })}
                  disabled
                  className={isDark ? 'bg-gray-700 text-white' : 'bg-gray-100'}
                />
              </div>
            </div>
          </div>

          {/* Condição Climática */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : ''}`}>{t.weatherCondition}</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-3 gap-4">
                <div></div>
                <div>
                  <Label className={isDark ? 'text-gray-300' : ''}>{t.weather}</Label>
                </div>
                <div>
                  <Label className={isDark ? 'text-gray-300' : ''}>{t.condition}</Label>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className={isDark ? 'text-gray-300' : ''}>{t.morning}</Label>
                </div>
                <div>
                  <Select
                    value={formData.condicao_climatica?.manha_tempo || ''}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      condicao_climatica: { ...formData.condicao_climatica, manha_tempo: value }
                    })}
                  >
                    <SelectTrigger className={isDark ? 'bg-gray-700 text-white' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Claro">Claro</SelectItem>
                      <SelectItem value="Nublado">Nublado</SelectItem>
                      <SelectItem value="Chuvoso">Chuvoso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select
                    value={formData.condicao_climatica?.manha_condicao || ''}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      condicao_climatica: { ...formData.condicao_climatica, manha_condicao: value }
                    })}
                  >
                    <SelectTrigger className={isDark ? 'bg-gray-700 text-white' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Praticável">Praticável</SelectItem>
                      <SelectItem value="Impraticável">Impraticável</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className={isDark ? 'text-gray-300' : ''}>{t.afternoon}</Label>
                </div>
                <div>
                  <Select
                    value={formData.condicao_climatica?.tarde_tempo || ''}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      condicao_climatica: { ...formData.condicao_climatica, tarde_tempo: value }
                    })}
                  >
                    <SelectTrigger className={isDark ? 'bg-gray-700 text-white' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Claro">Claro</SelectItem>
                      <SelectItem value="Nublado">Nublado</SelectItem>
                      <SelectItem value="Chuvoso">Chuvoso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select
                    value={formData.condicao_climatica?.tarde_condicao || ''}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      condicao_climatica: { ...formData.condicao_climatica, tarde_condicao: value }
                    })}
                  >
                    <SelectTrigger className={isDark ? 'bg-gray-700 text-white' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Praticável">Praticável</SelectItem>
                      <SelectItem value="Impraticável">Impraticável</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Equipe de Campo */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : ''}`}>{t.fieldTeams}</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className={isDark ? 'text-gray-300' : ''}>{t.juniorEngineer}</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.equipes_campo?.engenheiro_pleno || 0}
                  onChange={(e) => setFormData({
                    ...formData,
                    equipes_campo: { ...formData.equipes_campo, engenheiro_pleno: parseInt(e.target.value) || 0 }
                  })}
                  className={isDark ? 'bg-gray-700 text-white' : ''}
                />
              </div>
              <div>
                <Label className={isDark ? 'text-gray-300' : ''}>{t.seniorEngineer}</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.equipes_campo?.engenheiro_senior || 0}
                  onChange={(e) => setFormData({
                    ...formData,
                    equipes_campo: { ...formData.equipes_campo, engenheiro_senior: parseInt(e.target.value) || 0 }
                  })}
                  className={isDark ? 'bg-gray-700 text-white' : ''}
                />
              </div>
              <div>
                <Label className={isDark ? 'text-gray-300' : ''}>{t.administrative}</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.equipes_campo?.administrativo || 0}
                  onChange={(e) => setFormData({
                    ...formData,
                    equipes_campo: { ...formData.equipes_campo, administrativo: parseInt(e.target.value) || 0 }
                  })}
                  className={isDark ? 'bg-gray-700 text-white' : ''}
                />
              </div>
              <div>
                <Label className={isDark ? 'text-gray-300' : ''}>{t.thirdParty}</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.equipes_campo?.terceiros || 0}
                  onChange={(e) => setFormData({
                    ...formData,
                    equipes_campo: { ...formData.equipes_campo, terceiros: parseInt(e.target.value) || 0 }
                  })}
                  className={isDark ? 'bg-gray-700 text-white' : ''}
                />
              </div>
            </div>
          </div>

          {/* Atividades Realizadas */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : ''}`}>{t.activitiesPerformed}</h3>
              <Button variant="outline" size="sm" onClick={addAtividade}>
                <Plus className="w-4 h-4 mr-2" />
                {t.addActivity}
              </Button>
            </div>
            <div className="space-y-2">
              {formData.atividades_realizadas?.map((ativ, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={ativ.numero}
                    disabled
                    className={`w-20 ${isDark ? 'bg-gray-700 text-white' : ''}`}
                  />
                  <Input
                    value={ativ.descricao}
                    onChange={(e) => updateAtividade(index, e.target.value)}
                    placeholder="Descrição da atividade"
                    className={isDark ? 'bg-gray-700 text-white' : ''}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removeAtividade(index)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Ocorrências */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : ''}`}>{t.occurrences}</h3>
              <Button variant="outline" size="sm" onClick={addOcorrencia}>
                <Plus className="w-4 h-4 mr-2" />
                {t.addOccurrence}
              </Button>
            </div>
            <div className="space-y-2">
              {formData.ocorrencias?.map((ocor, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={ocor.numero}
                    disabled
                    className={`w-20 ${isDark ? 'bg-gray-700 text-white' : ''}`}
                  />
                  <Input
                    value={ocor.descricao}
                    onChange={(e) => updateOcorrencia(index, e.target.value)}
                    placeholder="Descrição da ocorrência"
                    className={isDark ? 'bg-gray-700 text-white' : ''}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removeOcorrencia(index)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Registros Fotográficos */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : ''}`}>{t.photographicRecords}</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('photo-upload').click()}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {t.addPhoto}
                  </>
                )}
              </Button>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.fotos?.map((foto, index) => (
                <div key={index} className={`border rounded-lg p-3 ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>
                  <img
                    src={foto.url}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-48 object-cover rounded mb-2"
                  />
                  <Input
                    value={foto.legenda}
                    onChange={(e) => updateFotoLegenda(index, e.target.value)}
                    placeholder={t.photoCaption}
                    className={`mb-2 ${isDark ? 'bg-gray-700 text-white' : ''}`}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeFoto(index)}
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2 text-red-600" />
                    Remover
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div>
            <Label className={isDark ? 'text-gray-300' : ''}>{t.observations}</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={4}
              className={isDark ? 'bg-gray-700 text-white' : ''}
            />
          </div>

          {/* Assinaturas */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : ''}`}>{t.signatures}</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAssinatura}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t.addSignature}
              </Button>
            </div>
            <div className="space-y-3">
              {formData.assinaturas?.map((ass, index) => (
                <SignatureField
                  key={index}
                  assinatura={ass}
                  index={index}
                  onEdit={handleSignatureEdit}
                  onRemove={(idx) => removeAssinatura(idx)}
                  onChange={updateAssinatura}
                />
              ))}
            </div>
            <SignatureDialog
              open={signatureDialogOpen}
              onOpenChange={setSignatureDialogOpen}
              onSave={handleSignatureSave}
            />
          </div>

          {/* Status */}
          <div>
            <Label className={isDark ? 'text-gray-300' : ''}>{t.status}</Label>
            <Select
              value={formData.status_documento}
              onValueChange={(value) => setFormData({ ...formData, status_documento: value })}
            >
              <SelectTrigger className={isDark ? 'bg-gray-700 text-white' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Rascunho">Rascunho</SelectItem>
                <SelectItem value="Em Análise">Em Análise</SelectItem>
                <SelectItem value="Aprovado">Aprovado</SelectItem>
                <SelectItem value="Arquivado">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}