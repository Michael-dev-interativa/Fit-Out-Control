import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { RDO, Empreendimento } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getUploadUrl } from '@/api/config';
import SignatureField from '@/components/signature/SignatureField';
import SignatureDialog from '@/components/signature/SignatureDialog';

const translations = {
  pt: {
    backToList: "Voltar à Lista",
    newDocument: "Novo Documento",
    generalInfo: "Informações Gerais",
    documentType: "Tipo de Documento",
    reportNumber: "Número do Relatório",
    reportDate: "Data do Relatório",
    dayOfWeek: "Dia da Semana",
    workInfo: "Informações da Obra",
    workName: "Nome da Obra",
    workLocation: "Local da Obra",
    contractor: "Contratada",
    responsible: "Responsável",
    contractInfo: "Informações do Contrato",
    contract: "Contrato",
    contractualDeadline: "Prazo Contratual (dias)",
    elapsedTime: "Prazo Decorrido (dias)",
    remainingTime: "Prazo a Vencer (dias)",
    weatherCondition: "Condição Climática",
    morning: "Manhã",
    afternoon: "Tarde",
    weather: "Tempo",
    workCondition: "Condição",
    clear: "Claro",
    cloudy: "Nublado",
    rainy: "Chuvoso",
    workable: "Praticável",
    unworkable: "Impraticável",
    fieldTeams: "Equipes de Campo",
    juniorEngineer: "Engenheiro Pleno",
    seniorEngineer: "Engenheiro Sênior",
    administrative: "Administrativo",
    thirdParty: "Terceiros",
    activitiesPerformed: "Atividades Realizadas",
    addActivity: "Adicionar Atividade",
    occurrences: "Ocorrências",
    addOccurrence: "Adicionar Ocorrência",
    observations: "Observações",
    signatures: "Assinaturas",
    addSignature: "Adicionar Assinatura",
    signatureName: "Nome do Signatário",
    uploadSignature: "Enviar Assinatura",
    removeSignature: "Remover",
    status: "Status",
    save: "Salvar",
    saving: "Salvando...",
    draft: "Rascunho",
    underReview: "Em Análise",
    approved: "Aprovado",
    archived: "Arquivado"
  },
  en: {
    backToList: "Back to List",
    newDocument: "New Document",
    generalInfo: "General Information",
    documentType: "Document Type",
    reportNumber: "Report Number",
    reportDate: "Report Date",
    dayOfWeek: "Day of Week",
    workInfo: "Work Information",
    workName: "Work Name",
    workLocation: "Work Location",
    contractor: "Contractor",
    responsible: "Responsible",
    contractInfo: "Contract Information",
    contract: "Contract",
    contractualDeadline: "Contractual Deadline (days)",
    elapsedTime: "Elapsed Time (days)",
    remainingTime: "Remaining Time (days)",
    weatherCondition: "Weather Condition",
    morning: "Morning",
    afternoon: "Afternoon",
    weather: "Weather",
    workCondition: "Condition",
    clear: "Clear",
    cloudy: "Cloudy",
    rainy: "Rainy",
    workable: "Workable",
    unworkable: "Unworkable",
    fieldTeams: "Field Teams",
    juniorEngineer: "Junior Engineer",
    seniorEngineer: "Senior Engineer",
    administrative: "Administrative",
    thirdParty: "Third Party",
    activitiesPerformed: "Activities Performed",
    addActivity: "Add Activity",
    occurrences: "Occurrences",
    addOccurrence: "Add Occurrence",
    observations: "Observations",
    status: "Status",
    save: "Save",
    saving: "Saving...",
    draft: "Draft",
    underReview: "Under Review",
    approved: "Approved",
    archived: "Archived"
  }
};

export default function NovoListaDocumentos({ language: initialLanguage, theme: initialTheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const empreendimentoId = urlParams.get('empreendimentoId');

  const [empreendimento, setEmpreendimento] = useState(null);
  const [saving, setSaving] = useState(false);
  const [language, setLanguage] = useState(initialLanguage || 'pt');
  const [theme, setTheme] = useState(initialTheme || 'light');

  const [formData, setFormData] = useState({
    tipo_documento: 'Lista de Documentos',
    numero_relatorio: '',
    data_relatorio: new Date().toISOString().split('T')[0],
    dia_semana: '',
    obra_nome: '',
    obra_local: '',
    contratada: 'INTERATIVA ENGENHARIA',
    responsavel: '',
    contrato: '',
    prazo_contratual: '',
    prazo_decorrido: '',
    prazo_vencer: '',
    condicao_climatica: {
      manha_tempo: 'Claro',
      manha_condicao: 'Praticável',
      tarde_tempo: 'Claro',
      tarde_condicao: 'Praticável'
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
    if (empreendimentoId) {
      Empreendimento.get(empreendimentoId).then(setEmpreendimento);
    }
  }, [empreendimentoId]);

  // Auto-fill day of week when date changes
  useEffect(() => {
    if (formData.data_relatorio) {
      const date = new Date(formData.data_relatorio + 'T00:00:00');
      const days = ['Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado'];
      const dayName = days[date.getDay()];
      setFormData(prev => ({ ...prev, dia_semana: dayName }));
    }
  }, [formData.data_relatorio]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const dataToSave = {
        id_empreendimento: empreendimentoId,
        ...formData
      };

      await RDO.create(dataToSave);
      navigate(createPageUrl(`EmpreendimentoListaDocumentos?empreendimentoId=${empreendimentoId}`));
    } catch (error) {
      console.error("Erro ao salvar documento:", error);
    } finally {
      setSaving(false);
    }
  };

  const addActivity = () => {
    setFormData({
      ...formData,
      atividades_realizadas: [
        ...formData.atividades_realizadas,
        { numero: formData.atividades_realizadas.length + 1, descricao: '' }
      ]
    });
  };

  const addOccurrence = () => {
    setFormData({
      ...formData,
      ocorrencias: [
        ...formData.ocorrencias,
        { numero: formData.ocorrencias.length + 1, descricao: '' }
      ]
    });
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingPhoto(true);
    try {
      const uploadPromises = files.map(file =>
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);

      console.log('📸 Resultados do upload:', results);

      const newFotos = results.map(result => {
        console.log('🔗 Resultado do upload:', result);
        // Prefer file_url, mas se estiver ausente use file_path e converta com getUploadUrl
        const candidate = result.file_url || result.file_path || null;
        let finalUrl = null;
        if (candidate) {
          finalUrl = getUploadUrl(candidate) || candidate;
        }
        if (finalUrl && finalUrl.startsWith('blob:')) {
          console.error('❌ ERRO: URL de blob detectada! Upload pode ter falhado.', result);
        }
        return {
          url: finalUrl,
          legenda: ''
        };
      });

      setFormData(prev => ({
        ...prev,
        fotos: [...(prev.fotos || []), ...newFotos]
      }));
    } catch (error) {
      console.error("Erro ao fazer upload das fotos:", error);
      alert('Erro ao fazer upload das fotos. Verifique o console para mais detalhes.');
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

      const newAssinaturas = results.map(result => {
        const candidate = result.file_url || result.file_path || null;
        const url = candidate ? (getUploadUrl(candidate) || candidate) : null;
        return { url, nome: '' };
      });
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

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-6 space-y-6`}>
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl(`EmpreendimentoListaDocumentos?empreendimentoId=${empreendimentoId}`))}
          className={isDark ? 'text-white border-gray-600 hover:bg-gray-800' : ''}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.backToList}
        </Button>

        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? t.saving : t.save}
        </Button>
      </div>

      <Card className={isDark ? 'bg-gray-800' : ''}>
        <CardHeader>
          <CardTitle className={isDark ? 'text-white' : ''}>{t.newDocument}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Informações Gerais */}
          <div className="space-y-4">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : ''}`}>{t.generalInfo}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>{t.documentType}</Label>
                <Select value={formData.tipo_documento} onValueChange={(val) => setFormData({ ...formData, tipo_documento: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Relatório Diário de Obra (RDO)">Relatório Diário de Obra (RDO)</SelectItem>
                    <SelectItem value="Lista de Documentos">Lista de Documentos</SelectItem>
                    <SelectItem value="Relatório de Atividades">Relatório de Atividades</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t.reportNumber}</Label>
                <Input value={formData.numero_relatorio} onChange={(e) => setFormData({ ...formData, numero_relatorio: e.target.value })} />
              </div>
              <div>
                <Label>{t.reportDate}</Label>
                <Input type="date" value={formData.data_relatorio} onChange={(e) => setFormData({ ...formData, data_relatorio: e.target.value })} />
              </div>
              <div>
                <Label>{t.dayOfWeek}</Label>
                <Input type="text" value={formData.dia_semana} disabled className={isDark ? 'bg-gray-700' : ''} />
              </div>
            </div>
          </div>

          {/* Informações da Obra */}
          <div className="space-y-4">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : ''}`}>{t.workInfo}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t.workName}</Label>
                <Input value={formData.obra_nome} onChange={(e) => setFormData({ ...formData, obra_nome: e.target.value })} />
              </div>
              <div>
                <Label>{t.workLocation}</Label>
                <Input value={formData.obra_local} onChange={(e) => setFormData({ ...formData, obra_local: e.target.value })} />
              </div>
              <div>
                <Label>{t.contractor}</Label>
                <Input value={formData.contratada} onChange={(e) => setFormData({ ...formData, contratada: e.target.value })} />
              </div>
              <div>
                <Label>{t.responsible}</Label>
                <Input value={formData.responsavel} onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Informações do Contrato */}
          <div className="space-y-4">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : ''}`}>{t.contractInfo}</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>{t.contract}</Label>
                <Input value={formData.contrato} onChange={(e) => setFormData({ ...formData, contrato: e.target.value })} />
              </div>
              <div>
                <Label>{t.contractualDeadline}</Label>
                <Input type="number" value={formData.prazo_contratual} onChange={(e) => setFormData({ ...formData, prazo_contratual: e.target.value })} />
              </div>
              <div>
                <Label>{t.elapsedTime}</Label>
                <Input type="number" value={formData.prazo_decorrido} onChange={(e) => setFormData({ ...formData, prazo_decorrido: e.target.value })} />
              </div>
              <div>
                <Label>{t.remainingTime}</Label>
                <Input type="number" value={formData.prazo_vencer} onChange={(e) => setFormData({ ...formData, prazo_vencer: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Condição Climática */}
          <div className="space-y-4">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : ''}`}>{t.weatherCondition}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label className="font-semibold">{t.morning}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">{t.weather}</Label>
                    <Select
                      value={formData.condicao_climatica.manha_tempo}
                      onValueChange={(val) => setFormData({
                        ...formData,
                        condicao_climatica: { ...formData.condicao_climatica, manha_tempo: val }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Claro">{t.clear}</SelectItem>
                        <SelectItem value="Nublado">{t.cloudy}</SelectItem>
                        <SelectItem value="Chuvoso">{t.rainy}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">{t.workCondition}</Label>
                    <Select
                      value={formData.condicao_climatica.manha_condicao}
                      onValueChange={(val) => setFormData({
                        ...formData,
                        condicao_climatica: { ...formData.condicao_climatica, manha_condicao: val }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Praticável">{t.workable}</SelectItem>
                        <SelectItem value="Impraticável">{t.unworkable}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <Label className="font-semibold">{t.afternoon}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">{t.weather}</Label>
                    <Select
                      value={formData.condicao_climatica.tarde_tempo}
                      onValueChange={(val) => setFormData({
                        ...formData,
                        condicao_climatica: { ...formData.condicao_climatica, tarde_tempo: val }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Claro">{t.clear}</SelectItem>
                        <SelectItem value="Nublado">{t.cloudy}</SelectItem>
                        <SelectItem value="Chuvoso">{t.rainy}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">{t.workCondition}</Label>
                    <Select
                      value={formData.condicao_climatica.tarde_condicao}
                      onValueChange={(val) => setFormData({
                        ...formData,
                        condicao_climatica: { ...formData.condicao_climatica, tarde_condicao: val }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Praticável">{t.workable}</SelectItem>
                        <SelectItem value="Impraticável">{t.unworkable}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Equipe de Campo / Mão de Obra */}
          <div className="space-y-4">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : ''}`}>{t.fieldTeams}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>{t.juniorEngineer}</Label>
                <Input
                  type="number"
                  value={formData.equipes_campo.engenheiro_pleno}
                  onChange={(e) => setFormData({
                    ...formData,
                    equipes_campo: { ...formData.equipes_campo, engenheiro_pleno: parseInt(e.target.value) || 0 }
                  })}
                />
              </div>
              <div>
                <Label>{t.seniorEngineer}</Label>
                <Input
                  type="number"
                  value={formData.equipes_campo.engenheiro_senior}
                  onChange={(e) => setFormData({
                    ...formData,
                    equipes_campo: { ...formData.equipes_campo, engenheiro_senior: parseInt(e.target.value) || 0 }
                  })}
                />
              </div>
              <div>
                <Label>{t.administrative}</Label>
                <Input
                  type="number"
                  value={formData.equipes_campo.administrativo}
                  onChange={(e) => setFormData({
                    ...formData,
                    equipes_campo: { ...formData.equipes_campo, administrativo: parseInt(e.target.value) || 0 }
                  })}
                />
              </div>
              <div>
                <Label>{t.thirdParty}</Label>
                <Input
                  type="number"
                  value={formData.equipes_campo.terceiros}
                  onChange={(e) => setFormData({
                    ...formData,
                    equipes_campo: { ...formData.equipes_campo, terceiros: parseInt(e.target.value) || 0 }
                  })}
                />
              </div>
            </div>
          </div>

          {/* Atividades Realizadas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : ''}`}>{t.activitiesPerformed}</h3>
              <Button variant="outline" size="sm" onClick={addActivity}>
                {t.addActivity}
              </Button>
            </div>
            {formData.atividades_realizadas.map((ativ, idx) => (
              <div key={idx} className="flex gap-2">
                <Input value={ativ.numero} disabled className="w-16" />
                <Textarea
                  value={ativ.descricao}
                  onChange={(e) => {
                    const newAtividades = [...formData.atividades_realizadas];
                    newAtividades[idx].descricao = e.target.value;
                    setFormData({ ...formData, atividades_realizadas: newAtividades });
                  }}
                  placeholder="Descrição da atividade"
                />
              </div>
            ))}
          </div>

          {/* Ocorrências */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : ''}`}>{t.occurrences}</h3>
              <Button variant="outline" size="sm" onClick={addOccurrence}>
                {t.addOccurrence}
              </Button>
            </div>
            {formData.ocorrencias.map((ocor, idx) => (
              <div key={idx} className="flex gap-2">
                <Input value={ocor.numero} disabled className="w-16" />
                <Textarea
                  value={ocor.descricao}
                  onChange={(e) => {
                    const newOcorrencias = [...formData.ocorrencias];
                    newOcorrencias[idx].descricao = e.target.value;
                    setFormData({ ...formData, ocorrencias: newOcorrencias });
                  }}
                  placeholder="Descrição da ocorrência"
                />
              </div>
            ))}
          </div>

          {/* Registros Fotográficos */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : ''}`}>Registros Fotográficos</h3>
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
                    Adicionar Foto
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
              {formData.fotos?.map((foto, index) => {
                // Função inline para garantir conversão de URL
                const convertImageUrl = (url) => {
                  if (!url) return null;
                  console.log('[NovoRDO-INLINE] URL Original:', url);

                  // Se já é URL completa
                  if (url.startsWith('http://') || url.startsWith('https://')) {
                    console.log('[NovoRDO-INLINE] → Já é URL completa');
                    return url;
                  }

                  // Se é path relativo da API
                  if (url.startsWith('/api/')) {
                    const backendBase = 'https://fit-out-backend.onrender.com';
                    const fullUrl = `${backendBase}${url}`;
                    console.log('[NovoRDO-INLINE] → Convertido para:', fullUrl);
                    return fullUrl;
                  }

                  console.log('[NovoRDO-INLINE] → Usando getUploadUrl');
                  return getUploadUrl(url);
                };

                const imageUrl = convertImageUrl(foto.url) || foto.url;
                console.log(`[NovoRDO] Foto ${index}:`, { original: foto.url, final: imageUrl });

                return (
                  <div key={index} className={`border rounded-lg p-3 ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>
                    <img
                      src={imageUrl}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-48 object-cover rounded mb-2"
                    />
                    <Input
                      value={foto.legenda}
                      onChange={(e) => updateFotoLegenda(index, e.target.value)}
                      placeholder="Legenda da Foto"
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
                );
              })}
            </div>
          </div>

          {/* Observações */}
          <div>
            <Label>{t.observations}</Label>
            <Textarea value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} rows={4} />
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
            <Label>{t.status}</Label>
            <Select value={formData.status_documento} onValueChange={(val) => setFormData({ ...formData, status_documento: val })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Rascunho">{t.draft}</SelectItem>
                <SelectItem value="Em Análise">{t.underReview}</SelectItem>
                <SelectItem value="Aprovado">{t.approved}</SelectItem>
                <SelectItem value="Arquivado">{t.archived}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}