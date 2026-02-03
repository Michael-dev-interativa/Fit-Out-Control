import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { RDO, Empreendimento } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

const translations = {
  pt: {
    backToList: "Voltar à Lista",
    newRDO: "Novo RDO",
    reportNumber: "Número do Relatório",
    date: "Data do Relatório",
    dayOfWeek: "Dia da Semana",
    documentType: "Tipo de Documento",
    workName: "Nome da Obra",
    workLocation: "Local da Obra",
    contractor: "Contratada",
    responsible: "Responsável",
    contract: "Contrato",
    contractualDeadline: "Prazo Contratual",
    elapsedTime: "Prazo Decorrido",
    remainingTime: "Prazo a Vencer",
    observations: "Observações",
    status: "Status",
    save: "Salvar",
    saving: "Salvando...",
    required: "Campo obrigatório",
  },
  en: {
    backToList: "Back to List",
    newRDO: "New RDO",
    reportNumber: "Report Number",
    date: "Report Date",
    dayOfWeek: "Day of Week",
    documentType: "Document Type",
    workName: "Work Name",
    workLocation: "Work Location",
    contractor: "Contractor",
    responsible: "Responsible",
    contract: "Contract",
    contractualDeadline: "Contractual Deadline",
    elapsedTime: "Elapsed Time",
    remainingTime: "Remaining Time",
    observations: "Observations",
    status: "Status",
    save: "Save",
    saving: "Saving...",
    required: "Required field",
  }
};

const diasSemana = [
  "Domingo", "Segunda-Feira", "Terça-Feira", "Quarta-Feira",
  "Quinta-Feira", "Sexta-Feira", "Sábado"
];

export default function NovoRDO({ language: initialLanguage, theme: initialTheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const empreendimentoId = urlParams.get('empreendimentoId');

  const [empreendimento, setEmpreendimento] = useState(null);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState(initialLanguage || 'pt');
  const [theme, setTheme] = useState(initialTheme || 'light');

  const [formData, setFormData] = useState({
    id_empreendimento: empreendimentoId,
    tipo_documento: 'RDO',
    numero_relatorio: '',
    data_relatorio: new Date().toISOString().split('T')[0],
    dia_semana: diasSemana[new Date().getDay()],
    obra_nome: '',
    obra_local: '',
    contratada: '',
    responsavel: '',
    contrato: '',
    prazo_contratual: '',
    prazo_decorrido: '',
    prazo_vencer: '',
    observacoes: '',
    status_documento: 'Rascunho',
    condicao_climatica: [],
    equipes_campo: [],
    atividades_realizadas: [],
    ocorrencias: [],
    fotos: [],
    assinaturas: {}
  });

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
      loadEmpreendimento();
    }
  }, [empreendimentoId]);

  const loadEmpreendimento = async () => {
    try {
      const empData = await Empreendimento.get(empreendimentoId);
      setEmpreendimento(empData);
      setFormData(prev => ({
        ...prev,
        obra_nome: empData.nome_empreendimento || '',
        obra_local: empData.endereco_empreendimento || ''
      }));
    } catch (error) {
      console.error("Erro ao carregar empreendimento:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Atualizar dia da semana quando data mudar
    if (name === 'data_relatorio' && value) {
      const date = new Date(value + 'T00:00:00');
      setFormData(prev => ({
        ...prev,
        dia_semana: diasSemana[date.getDay()]
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await RDO.create(formData);
      navigate(createPageUrl(`EmpreendimentoListaDocumentos?empreendimentoId=${empreendimentoId}`));
    } catch (error) {
      console.error("Erro ao criar RDO:", error);
      alert("Erro ao criar RDO. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl(`EmpreendimentoListaDocumentos?empreendimentoId=${empreendimentoId}`))}
            className={isDark ? 'text-white border-gray-600 hover:bg-gray-800' : ''}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.backToList}
          </Button>
        </div>

        <Card className={isDark ? 'bg-gray-800' : ''}>
          <CardHeader>
            <CardTitle className={isDark ? 'text-white' : ''}>{t.newRDO}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero_relatorio" className={isDark ? 'text-gray-300' : ''}>
                    {t.reportNumber} *
                  </Label>
                  <Input
                    id="numero_relatorio"
                    name="numero_relatorio"
                    value={formData.numero_relatorio}
                    onChange={handleChange}
                    required
                    className={isDark ? 'bg-gray-700 text-white border-gray-600' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_relatorio" className={isDark ? 'text-gray-300' : ''}>
                    {t.date} *
                  </Label>
                  <Input
                    id="data_relatorio"
                    name="data_relatorio"
                    type="date"
                    value={formData.data_relatorio}
                    onChange={handleChange}
                    required
                    className={isDark ? 'bg-gray-700 text-white border-gray-600' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dia_semana" className={isDark ? 'text-gray-300' : ''}>
                    {t.dayOfWeek}
                  </Label>
                  <Input
                    id="dia_semana"
                    name="dia_semana"
                    value={formData.dia_semana}
                    readOnly
                    className={isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-100'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status_documento" className={isDark ? 'text-gray-300' : ''}>
                    {t.status}
                  </Label>
                  <select
                    id="status_documento"
                    name="status_documento"
                    value={formData.status_documento}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 rounded-md border ${isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white border-gray-300'}`}
                  >
                    <option value="Rascunho">Rascunho</option>
                    <option value="Em Revisão">Em Revisão</option>
                    <option value="Aprovado">Aprovado</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="obra_nome" className={isDark ? 'text-gray-300' : ''}>
                    {t.workName}
                  </Label>
                  <Input
                    id="obra_nome"
                    name="obra_nome"
                    value={formData.obra_nome}
                    onChange={handleChange}
                    className={isDark ? 'bg-gray-700 text-white border-gray-600' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="obra_local" className={isDark ? 'text-gray-300' : ''}>
                    {t.workLocation}
                  </Label>
                  <Input
                    id="obra_local"
                    name="obra_local"
                    value={formData.obra_local}
                    onChange={handleChange}
                    className={isDark ? 'bg-gray-700 text-white border-gray-600' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contratada" className={isDark ? 'text-gray-300' : ''}>
                    {t.contractor}
                  </Label>
                  <Input
                    id="contratada"
                    name="contratada"
                    value={formData.contratada}
                    onChange={handleChange}
                    className={isDark ? 'bg-gray-700 text-white border-gray-600' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsavel" className={isDark ? 'text-gray-300' : ''}>
                    {t.responsible}
                  </Label>
                  <Input
                    id="responsavel"
                    name="responsavel"
                    value={formData.responsavel}
                    onChange={handleChange}
                    className={isDark ? 'bg-gray-700 text-white border-gray-600' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contrato" className={isDark ? 'text-gray-300' : ''}>
                    {t.contract}
                  </Label>
                  <Input
                    id="contrato"
                    name="contrato"
                    value={formData.contrato}
                    onChange={handleChange}
                    className={isDark ? 'bg-gray-700 text-white border-gray-600' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prazo_contratual" className={isDark ? 'text-gray-300' : ''}>
                    {t.contractualDeadline}
                  </Label>
                  <Input
                    id="prazo_contratual"
                    name="prazo_contratual"
                    value={formData.prazo_contratual}
                    onChange={handleChange}
                    placeholder="Ex: 365 dias"
                    className={isDark ? 'bg-gray-700 text-white border-gray-600' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prazo_decorrido" className={isDark ? 'text-gray-300' : ''}>
                    {t.elapsedTime}
                  </Label>
                  <Input
                    id="prazo_decorrido"
                    name="prazo_decorrido"
                    value={formData.prazo_decorrido}
                    onChange={handleChange}
                    placeholder="Ex: 45 dias"
                    className={isDark ? 'bg-gray-700 text-white border-gray-600' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prazo_vencer" className={isDark ? 'text-gray-300' : ''}>
                    {t.remainingTime}
                  </Label>
                  <Input
                    id="prazo_vencer"
                    name="prazo_vencer"
                    value={formData.prazo_vencer}
                    onChange={handleChange}
                    placeholder="Ex: 320 dias"
                    className={isDark ? 'bg-gray-700 text-white border-gray-600' : ''}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes" className={isDark ? 'text-gray-300' : ''}>
                  {t.observations}
                </Label>
                <Textarea
                  id="observacoes"
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleChange}
                  rows={4}
                  className={isDark ? 'bg-gray-700 text-white border-gray-600' : ''}
                />
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(createPageUrl(`EmpreendimentoListaDocumentos?empreendimentoId=${empreendimentoId}`))}
                  className={isDark ? 'text-white border-gray-600 hover:bg-gray-800' : ''}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
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
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
