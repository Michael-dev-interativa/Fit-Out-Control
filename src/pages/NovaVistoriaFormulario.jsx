
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { FormularioVistoria } from '@/api/entities';
import { Vistoria } from '@/api/entities/Vistoria'; // Import Vistoria entity for creating inspection records
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, FileText, Loader2, AlertTriangle, Play } from 'lucide-react'; // Added Play icon
import { useUnidadeData } from '@/components/hooks/useUnidadeData';
import UnidadeHeader from '../components/unidade/UnidadeHeader';
import { Textarea } from "@/components/ui/textarea"; // New import for Textarea
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'; // New imports for Select component
import { Label } from '@/components/ui/label'; // New import for Label

const translations = {
  pt: {
    // Original translations, some are now unused but kept for completeness
    title: "Nova Vistoria - Selecionar Formulário",
    subtitle: "Escolha o formulário que será usado para esta vistoria",
    searchPlaceholder: "Buscar formulários...",
    selectForm: "Selecionar",
    noFormsFound: "Nenhum formulário encontrado",
    noActiveFormsAvailable: "Não há formulários ativos disponíveis.",
    sections: "seções",
    questions: "perguntas",
    active: "Ativo",
    inactive: "Inativo",
    backToInspections: "Voltar para Vistorias",
    errorTitle: "Erro ao Carregar Dados",
    backToProjects: "Voltar aos Empreendimentos",

    // New translations for the updated form
    newInspectionForm: "Nova Vistoria",
    formSubtitle: "Preencha os detalhes para iniciar uma nova vistoria.",
    formToUse: "Formulário a Ser Usado",
    selectFormPlaceholder: "Selecione o formulário",
    responsiblePartiesTitle: "Participantes da Vistoria",
    responsiblePartiesPlaceholder: "Insira os nomes dos participantes separados por vírgula",
    osPropostaTitle: "Ordem de Serviço / Proposta",
    osPropostaPlaceholder: "Texto da Ordem de Serviço ou Proposta",
    escopoConsultoriaTitle: "Escopo da Consultoria",
    escopoConsultoriaPlaceholder: "Detalhamento do escopo da consultoria",
    startInspection: "Iniciar Vistoria",
    submitting: "Iniciando...",
    noActiveFormsAvailableDropdown: "Nenhum formulário ativo encontrado.", // For dropdown
  },
  en: {
    // Original translations
    title: "New Inspection - Select Form",
    subtitle: "Choose the form that will be used for this inspection",
    searchPlaceholder: "Search forms...",
    selectForm: "Select",
    noFormsFound: "No forms found",
    noActiveFormsAvailable: "No active forms available.",
    sections: "sections",
    questions: "questions",
    active: "Active",
    inactive: "Inactive",
    backToInspections: "Back to Inspections",
    errorTitle: "Error Loading Data",
    backToProjects: "Back to Projects",

    // New translations
    newInspectionForm: "New Inspection",
    formSubtitle: "Fill in the details to start a new inspection.",
    formToUse: "Form to Use",
    selectFormPlaceholder: "Select the form",
    responsiblePartiesTitle: "Inspection Participants",
    responsiblePartiesPlaceholder: "Enter participant names separated by commas",
    osPropostaTitle: "Service Order / Proposal",
    osPropostaPlaceholder: "Service Order or Proposal text",
    escopoConsultoriaTitle: "Consultancy Scope",
    escopoConsultoriaPlaceholder: "Detailed consultancy scope",
    startInspection: "Start Inspection",
    submitting: "Starting...",
    noActiveFormsAvailableDropdown: "No active forms found.",
  }
};

export default function NovaVistoriaFormulario({ language: propLanguage = 'pt', theme: propTheme = 'light' }) {
  const navigate = useNavigate();
  const location = useLocation();

  // State variables from original file
  const [formularios, setFormularios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState(propLanguage);
  const [theme, setTheme] = useState(propTheme);

  // New state variables for the form fields
  const [participantes, setParticipantes] = useState('');
  const [formularioSelecionado, setFormularioSelecionado] = useState(''); // To store the ID of the selected form
  const [textoOsProposta, setTextoOsProposta] = useState('Adequação do Sistema de Ar Condicionado');
  const [textoEscopoConsultoria, setTextoEscopoConsultoria] = useState('• Análises de projetos\n• 2 vistorias de acompanhamento durante a Obra\n• 1 Vistoria Final/Comissionamento');
  const [isSubmitting, setIsSubmitting] = useState(false); // To manage submit button loading state
  const [users, setUsers] = useState([]); // Declared in outline, but not used in the provided UI structure.

  const urlParams = new URLSearchParams(location.search);
  const unidadeId = urlParams.get('unidadeId');
  const empreendimentoId = urlParams.get('empreendimentoId');

  // Call useUnidadeData unconditionally with the raw IDs
  const { unidade, empreendimento, loading: loadingUnidade, error: errorUnidade } = useUnidadeData(unidadeId, empreendimentoId);

  const t = translations[language];
  const isDark = theme === 'dark';

  // ID validation
  const isValidId = (id) => id != null && String(id).trim() !== '' && !['null', 'undefined'].includes(String(id).trim().toLowerCase());
  const hasValidIds = isValidId(unidadeId) && isValidId(empreendimentoId);

  useEffect(() => {
    // Only attempt to load forms if both IDs are valid.
    if (hasValidIds) {
      loadFormularios();
    } else {
      setLoading(false); // If IDs are invalid, no forms will be loaded, so set loading to false.
    }
  }, [unidadeId, empreendimentoId, hasValidIds]);

  const loadFormularios = async () => {
    try {
      setLoading(true);
      const data = await FormularioVistoria.list('-created_date');
      // Filter only active forms
      const formulariosAtivos = data.filter(form => form.status_formulario === 'Ativo');
      setFormularios(formulariosAtivos);
      // Pre-select the first active form if available
      if (formulariosAtivos.length > 0) {
        setFormularioSelecionado(formulariosAtivos[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar formulários:', error);
      // Optionally handle form loading error state if needed
    } finally {
      setLoading(false);
    }
  };

  // The previous search functionality (searchTerm, filteredFormularios, filterFormularios)
  // and the form selection UI (grid of cards, handleSelectFormulario) have been replaced
  // by a single form with a dropdown for form selection.

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!hasValidIds) {
      console.error('IDs inválidos para a criação da vistoria.');
      alert('Erro: Identificadores de unidade ou empreendimento ausentes/inválidos.');
      setIsSubmitting(false);
      return;
    }

    if (!formularioSelecionado) {
      alert('Por favor, selecione um formulário para a vistoria.');
      setIsSubmitting(false);
      return;
    }

    try {
      const novaVistoriaData = {
        unidade_id: unidadeId,
        empreendimento_id: empreendimentoId,
        participantes: participantes,
        id_formulario: formularioSelecionado, // Use the ID of the selected form
        texto_os_proposta: textoOsProposta,
        texto_escopo_consultoria: textoEscopoConsultoria,
        status_vistoria: 'Em Andamento',
        respostas: {}, // Initialize with an empty responses object
      };

      // Assuming Vistoria.create method exists and returns the created Vistoria object with its ID
      const newVistoria = await Vistoria.create(novaVistoriaData);

      if (newVistoria && newVistoria.id) {
        // Navigate to the inspection filling page with the new vistoria ID
        navigate(createPageUrl(`PreencherVistoria?vistoriaId=${newVistoria.id}&unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`));
      } else {
        console.error('Vistoria criada, mas o ID não foi retornado.', newVistoria);
        alert('Vistoria iniciada, mas não foi possível navegar para a página de preenchimento. Por favor, acesse a vistoria pela lista de vistorias.');
        // Navigate back to the inspection list or unit details
        navigate(createPageUrl(`IniciarVistoria?unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`));
      }
    } catch (error) {
      console.error('Erro ao iniciar nova vistoria:', error);
      alert('Erro ao iniciar nova vistoria. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Renderization logic
  if (!hasValidIds) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-8 text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-red-600 mb-4">IDs Ausentes na URL</h2>
        <p className="text-gray-700 mb-6 max-w-md">
          Os identificadores da unidade ou empreendimento estão ausentes na URL.
          <br />
          Unidade: '{unidadeId}' | Empreendimento: '{empreendimentoId}'
        </p>
        <Button onClick={() => navigate(createPageUrl("Empreendimentos"))}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t.backToProjects}
        </Button>
      </div>
    );
  }

  // Combine loading states for initial full-page loader
  if (loadingUnidade || loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
        <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          Carregando dados da unidade e formulários disponíveis...
        </p>
      </div>
    );
  }

  // Handle specific error from useUnidadeData after IDs are confirmed valid and not in loading state
  if (errorUnidade) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-8 text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-red-600 mb-4">{t.errorTitle}</h2>
        <p className="text-gray-700 mb-6 max-w-md">
          {errorUnidade.message}
        </p>
        <Button onClick={() => navigate(createPageUrl("Empreendimentos"))}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t.backToProjects}
        </Button>
      </div>
    );
  }

  return (
    <div className={`p-4 md:p-6 space-y-6 ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50'}`}>
      <UnidadeHeader
        unidade={unidade}
        empreendimento={empreendimento}
        language={language}
        theme={theme}
      />

      {/* Main card containing the form for creating a new inspection */}
      <Card className={isDark ? 'bg-gray-800 border-gray-700 text-gray-100' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t.newInspectionForm}
          </CardTitle>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t.formSubtitle}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Formulario a Ser Usado (Select Input) */}
            <div className="space-y-2">
              <Label htmlFor="form_id" className="font-semibold">{t.formToUse}</Label>
              <Select
                value={formularioSelecionado}
                onValueChange={setFormularioSelecionado}
                disabled={formularios.length === 0}
              >
                <SelectTrigger className={`${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}>
                  <SelectValue placeholder={t.selectFormPlaceholder} />
                </SelectTrigger>
                <SelectContent className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}>
                  {formularios.length > 0 ? (
                    formularios.map((form) => (
                      <SelectItem key={form.id} value={form.id}>
                        {form.nome_formulario}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-forms" disabled>
                      {t.noActiveFormsAvailableDropdown}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Participantes da Vistoria */}
            <div className="space-y-2">
              <Label htmlFor="participantes" className="font-semibold">{t.responsiblePartiesTitle}</Label>
              <Input
                id="participantes"
                value={participantes}
                onChange={(e) => setParticipantes(e.target.value)}
                className={isDark ? "bg-gray-700 border-gray-600 text-white" : ""}
                placeholder={t.responsiblePartiesPlaceholder}
              />
            </div>

            {/* Ordem de Serviço / Proposta */}
            <div className="space-y-2">
              <Label htmlFor="os_proposta" className="font-semibold">{t.osPropostaTitle}</Label>
              <Input
                id="os_proposta"
                value={textoOsProposta}
                onChange={(e) => setTextoOsProposta(e.target.value)}
                className={isDark ? "bg-gray-700 border-gray-600 text-white" : ""}
                placeholder={t.osPropostaPlaceholder}
              />
            </div>

            {/* Escopo da Consultoria */}
            <div className="space-y-2">
              <Label htmlFor="escopo_consultoria" className="font-semibold">{t.escopoConsultoriaTitle}</Label>
              <Textarea
                id="escopo_consultoria"
                value={textoEscopoConsultoria}
                onChange={(e) => setTextoEscopoConsultoria(e.target.value)}
                className={`${isDark ? "bg-gray-700 border-gray-600 text-white" : ""} min-h-[120px]`}
                placeholder={t.escopoConsultoriaPlaceholder}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button type="submit" disabled={isSubmitting || !formularioSelecionado} className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.submitting}
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    {t.startInspection}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Back button */}
      <div className="mt-6">
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl(`IniciarVistoria?unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`))}
          className={isDark ? 'text-gray-100 border-gray-700 hover:bg-gray-700' : ''}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.backToInspections}
        </Button>
      </div>
    </div>
  );
}
