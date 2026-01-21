import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Empreendimento } from '@/api/entities';
import { UnidadeEmpreendimento } from '@/api/entities';
import { KO_unidade } from '@/api/entities';
import { AP_unidade } from '@/api/entities';
import { VO_unidade } from '@/api/entities';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  ArrowLeft,
  Loader2,
  Building,
  Layers,
  FileText,
  Edit,
  AlertTriangle,
  Zap,
  BookOpen,
  Image,
  AlertCircle,
  ClipboardCheck, // Added ClipboardCheck icon
  Beaker, // Added Beaker icon
  ClipboardList, // ADDED
  CalendarClock, // Added CalendarClock icon
  ClipboardPlus // Added new icon
} from 'lucide-react';
import UnidadeCard from '../components/empreendimento/UnidadeCard';
import NovaUnidadeDialog from '../components/empreendimento/NovaUnidadeDialog';
import GaleriaFotosDialog from '../components/empreendimento/GaleriaFotosDialog';
import ManuaisGeraisDialog from '../components/empreendimento/ManuaisGeraisDialog';
import ProjetosOriginaisDialog from '../components/empreendimento/ProjetosOriginaisDialog';

// Import new components
import InfoGeral from '../components/empreendimento/InfoGeral';
import TabelaContatos from '../components/empreendimento/TabelaContatos';
import TabelaInformacoesTecnicas from '../components/empreendimento/TabelaInformacoesTecnicas';
import ParticularidadesDialog from "../components/empreendimento/ParticularidadesDialog";

const translations = {
  pt: {
    backToProjects: "Voltar aos Empreendimentos",
    projectDetails: "Detalhes do Empreendimento",
    units: "Unidades",
    searchUnits: "Buscar unidades...",
    newUnit: "Nova Unidade",
    noUnits: "Nenhuma unidade encontrada.",
    addFirstUnit: "Adicione a primeira unidade para este empreendimento.",
    noResults: "Nenhum resultado encontrado para sua busca.",
    loading: "Carregando dados do empreendimento...",
    projectNotFound: "Empreendimento não encontrado",
    projectNotFoundMessage: "O empreendimento que você está procurando não existe ou foi removido.",
    invalidIdErrorTitle: "ID do Empreendimento Inválido",
    invalidIdErrorMessage: "A página não pôde ser carregada porque o ID do empreendimento está ausente ou é inválido.",
    registrations: "Registros",
    pending: "Pendentes",
    inProgress: "Em Andamento",
    completed: "Concluídos",
    quickAccess: "Acesso Rápido",
    quickActions: "Ações Rápidas",
    originalProjects: "Projetos Originais",
    generalManuals: "Manuais Gerais",
    photoGallery: "Galeria de Fotos",
    generalInfo: "Informações Gerais",
    contacts: "Contatos",
    technicalInfo: "Informações Técnicas",
    addUnit: 'Adicionar Unidade/Pavimento',
    viewFloors: 'Visualizar Pavimentos',
    hideFloors: 'Ocultar Pavimentos',
    editProject: 'Editar Empreendimento',
    unitsTitle: 'Pavimentos do Empreendimento',
    particularities: "Particularidades",
    dailyReport: "Diário de Obra", // Added new translation
    sampleApproval: "Aprovação de Amostras", // Added new translation
    terminalityInspection: "Vistoria de Terminalidade", // ADDED
    weeklyReport: "Relatório Semanal", // Added new translation
    firstServicesReport: "Relatório de 1º Serviços", // Added new translation
  },
  en: {
    backToProjects: "Back to Projects",
    projectDetails: "Project Details",
    units: "Units",
    searchUnits: "Search units...",
    newUnit: "New Unit",
    noUnits: "No floors registered for this project.",
    addFirstUnit: "Add the first unit for this project.",
    noResults: "No results found for your search.",
    loading: "Loading project data...",
    projectNotFound: "Project not found",
    projectNotFoundMessage: "The project you are looking for does not exist or has been removed.",
    invalidIdErrorTitle: "Invalid Project ID",
    invalidIdErrorMessage: "The page could not be loaded because the project ID is missing or invalid.",
    registrations: "Registrations",
    pending: "Pending",
    inProgress: "In Progress",
    completed: "Completed",
    quickAccess: "Quick Access",
    quickActions: "Quick Actions",
    originalProjects: "Original Projects",
    generalManuals: "General Manuals",
    photoGallery: "Photo Gallery",
    generalInfo: "General Information",
    contacts: "Contacts",
    technicalInfo: "Technical Information",
    addUnit: 'Add Unit/Floor',
    viewFloors: 'View Floors',
    hideFloors: 'Hide Floors',
    editProject: 'Edit Project',
    unitsTitle: 'Project Floors',
    particularities: "Particularities",
    dailyReport: "Daily Report", // Added new translation
    sampleApproval: "Sample Approval", // Added new translation
    terminalityInspection: "Terminality Inspection", // ADDED
    weeklyReport: "Weekly Report", // Added new translation
    firstServicesReport: "First Services Report", // Added new translation
  },
};

export default function EmpreendimentoPage({ language: initialLanguage, theme: initialTheme }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Validação de ID compatível com banco: aceita inteiros positivos e strings não vazias
  const isValidId = (id) => {
    if (id === null || id === undefined) return false;
    const cleanId = String(id).trim();
    if (!cleanId || cleanId === '-' || cleanId === 'null' || cleanId === 'undefined' || cleanId === 'NaN') return false;
    // Aceita IDs numéricos positivos (ex.: "1", "2")
    if (/^\d+$/.test(cleanId)) {
      return Number(cleanId) > 0;
    }
    // Para IDs não numéricos (UUID/ULID), exige pelo menos 8 caracteres
    return cleanId.length >= 8;
  };

  const getEmpreendimentoId = () => {
    const urlParams = new URLSearchParams(location.search);
    const id = urlParams.get('empreendimentoId');

    // Log para debug
    console.log("ID extraído da URL:", id);

    if (!isValidId(id)) {
      // Redirecionar imediatamente para a lista de empreendimentos
      setTimeout(() => {
        navigate(createPageUrl("Empreendimentos"), { replace: true });
      }, 100);
      return null;
    }

    return id;
  };

  const empreendimentoId = getEmpreendimentoId();

  const [empreendimento, setEmpreendimento] = useState(null);
  const [unidades, setUnidades] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUnidade, setEditingUnidade] = useState(null);
  const [language, setLanguage] = useState(initialLanguage || 'pt');
  const [theme, setTheme] = useState(initialTheme || 'light');

  // Renamed dialog states to align with outline pattern (remove "Dialog" suffix)
  const [showUnidades, setShowUnidades] = useState(false);
  const [showNovaUnidade, setShowNovaUnidade] = useState(false);
  const [showGaleria, setShowGaleria] = useState(false);
  const [showManuais, setShowManuais] = useState(false);
  const [showProjetos, setShowProjetos] = useState(false);
  const [showParticularidades, setShowParticularidades] = useState(false);

  const t = translations[language];
  const isDark = theme === 'dark';

  // Debug logging com mais detalhes
  console.log("EmpreendimentoPage - Parâmetros da URL:", {
    empreendimentoId: empreendimentoId,
    urlCompleta: location.search,
    todosParametros: Object.fromEntries(new URLSearchParams(location.search).entries())
  });

  useEffect(() => {
    // Theme and language listeners
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

  const loadEmpreendimentoData = async () => {
    // PRIMEIRA VERIFICAÇÃO: Se o ID já foi identificado como inválido, não fazer nada
    if (!empreendimentoId) {
      console.error("EmpreendimentoPage - loadEmpreendimentoData chamado com ID inválido:", empreendimentoId);
      setLoading(false);
      return; // Não redirecionar aqui pois já foi feito no getEmpreendimentoId
    }

    try {
      setLoading(true);
      setError(null); // Reset error state on new load attempt
      console.log("EmpreendimentoPage - Carregando dados para empreendimento com ID:", empreendimentoId);

      // Fetch empreendimento and unidades in parallel
      const [empData, unidadesData] = await Promise.all([
        Empreendimento.get(empreendimentoId),
        UnidadeEmpreendimento.filter({ id_empreendimento: empreendimentoId }, "-created_date")
      ]);

      if (!empData) {
        console.error("EmpreendimentoPage - Empreendimento não encontrado para ID:", empreendimentoId);
        // Only navigate if an explicit error is not already set, otherwise let the error message display.
        if (!error) navigate(createPageUrl("Empreendimentos"), { replace: true });
        return;
      }

      setEmpreendimento(empData);
      const units = unidadesData || [];
      setUnidades(units);
      console.log("EmpreendimentoPage - Unidades carregadas:", units.length, "unidades para empreendimento:", empreendimentoId);

      // Debug each unit
      units.forEach((unidade, index) => {
        console.log(`EmpreendimentoPage - Unidade ${index}:`, {
          id: unidade.id,
          nome: unidade.unidade_empreendimento,
          cliente: unidade.cliente_unidade
        });
      });

      // Load records for the units if any exist
      if (units.length > 0) {
        const validUnidadeIds = units
          .map(u => String(u.id))
          .filter(id => isValidId(id));

        console.log("EmpreendimentoPage - IDs válidos das unidades para registros:", validUnidadeIds);

        if (validUnidadeIds.length > 0) {
          const [koData, apData, voData] = await Promise.all([
            KO_unidade.filter({ id_unidade: ['in', validUnidadeIds], status: ['!in', ['Editado', 'Excluído', 'Obsoleto']] }).catch(() => []),
            AP_unidade.filter({ id_unidade: ['in', validUnidadeIds], status: ['!in', ['Editado', 'Excluído', 'Obsoleto']] }).catch(() => []),
            VO_unidade.filter({ id_unidade: ['in', validUnidadeIds], status: ['!in', ['Editado', 'Excluído', 'Obsoleto']] }).catch(() => [])
          ]);
          setRegistros([...koData, ...apData, ...voData]);
        } else {
          setRegistros([]);
        }
      } else {
        setRegistros([]);
      }

    } catch (error) {
      console.error("EmpreendimentoPage - Erro ao carregar dados iniciais:", error);
      setEmpreendimento(null);
      setRegistros([]);
      setError(error); // Set error state
      // Só redirecionar se for um erro crítico e não houver empreendimento para mostrar
      if ((error.message?.includes('404') || error.message?.includes('not found')) && !empreendimento) {
        navigate(createPageUrl("Empreendimentos"), { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Só carregar dados se temos um ID válido
    if (empreendimentoId) {
      loadEmpreendimentoData();
    }
  }, [empreendimentoId, navigate]);

  const unidadeStats = useMemo(() => {
    const statsMap = {};
    unidades.forEach(unidade => {
      const registrosDaUnidade = registros.filter(r => r.id_unidade === unidade.id);
      statsMap[unidade.id] = {
        pendente: registrosDaUnidade.filter(r => r.status === 'Pendente').length,
        andamento: registrosDaUnidade.filter(r => r.status === 'Em Andamento').length,
        concluido: registrosDaUnidade.filter(r => r.status === 'Concluido').length,
        total: registrosDaUnidade.length,
      };
    });
    return statsMap;
  }, [unidades, registros]);

  // Renderização de erro se o ID for inválido
  if (!empreendimentoId) {
    return (
      <div className={`flex flex-col items-center justify-center h-screen p-8 text-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className={`text-2xl font-bold ${isDark ? 'text-red-400' : 'text-red-600'} mb-4`}>{t.invalidIdErrorTitle}</h2>
        <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} mb-6 max-w-md`}>
          {t.invalidIdErrorMessage}
        </p>
        <Button onClick={() => navigate(createPageUrl('Empreendimentos'))}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t.backToProjects}
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen p-6">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
        <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t.loading}</p>
      </div>
    );
  }

  // Handle case where empreendimento is null AFTER loading finishes (e.g., not found)
  if (!empreendimento && !loading) {
    return (
      <div className="text-center p-6">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t.projectNotFound}</p>
        <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} mb-4`}>
          {t.projectNotFoundMessage} {error ? `(${error.message})` : ''}
        </p>
        <Button onClick={() => navigate(createPageUrl('Empreendimentos'), { replace: true })} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.backToProjects}
        </Button>
      </div>
    );
  }

  console.log("EmpreendimentoPage - Renderizando com:", {
    empreendimentoId: empreendimentoId,
    quantidadeUnidades: unidades.length,
    empreendimento: empreendimento?.nome_empreendimento
  });

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-2 md:p-4 space-y-4`}>
      <Button variant="outline" onClick={() => navigate(createPageUrl('Empreendimentos'))} className={`${isDark ? 'text-white border-gray-600 hover:bg-gray-800' : ''}`}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t.backToProjects}
      </Button>

      <div className="w-full max-w-full mx-auto">
        <div className="grid grid-cols-1 gap-4">
          <div className="w-full space-y-4">
            <InfoGeral empreendimento={empreendimento} theme={theme} />

            <TabelaContatos contatos={empreendimento.contatos_proprietario} theme={theme} />

            {empreendimento.foto_empreendimento && (
              <div className="w-full">
                <img
                  src={empreendimento.foto_empreendimento}
                  alt={`Foto de ${empreendimento.nome_empreendimento}`}
                  className="rounded-lg shadow-lg w-full h-auto min-h-[400px] max-h-[600px] object-cover"
                />
              </div>
            )}

            {/* Quick Actions - Responsivo */}
            <Card className={isDark ? 'bg-gray-800' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className={`flex items-center gap-2 text-lg ${isDark ? 'text-white' : ''}`}>
                  <Zap className="w-5 h-5" />
                  {t.quickActions}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Adjusted grid layout for more items */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                    onClick={() => setShowProjetos(true)}
                  >
                    <FileText className="w-5 h-5" />
                    <span className="text-center leading-tight">{t.originalProjects}</span>
                  </Button>
                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                    onClick={() => setShowManuais(true)}
                  >
                    <BookOpen className="w-5 h-5" />
                    <span className="text-center leading-tight">{t.generalManuals}</span>
                  </Button>
                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                    onClick={() => setShowGaleria(true)}
                  >
                    <Image className="w-5 h-5" />
                    <span className="text-center leading-tight">{t.photoGallery}</span>
                  </Button>
                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                    onClick={() => setShowParticularidades(true)}
                  >
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-center leading-tight">{t.particularities}</span>
                  </Button>
                  {/* New Button for Daily Report */}
                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                    onClick={() => navigate(createPageUrl(`EmpreendimentoDiariosObra?empreendimentoId=${empreendimentoId}`))}
                  >
                    <ClipboardCheck className="w-5 h-5" />
                    <span className="text-center leading-tight">{t.dailyReport}</span>
                  </Button>
                  {/* New Button for Sample Approval */}
                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                    onClick={() => navigate(createPageUrl(`EmpreendimentoAmostras?empreendimentoId=${empreendimentoId}`))}
                  >
                    <Beaker className="w-5 h-5" />
                    <span className="text-center leading-tight">{t.sampleApproval}</span>
                  </Button>
                  {/* New Button for Terminality Inspection */}
                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                    onClick={() => navigate(createPageUrl(`EmpreendimentoVistoriasTerminalidade?empreendimentoId=${empreendimentoId}`))}
                  >
                    <ClipboardList className="w-5 h-5" />
                    <span className="text-center leading-tight">{t.terminalityInspection}</span>
                  </Button>
                  {/* New Button for First Services Report */}
                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                    onClick={() => navigate(createPageUrl(`EmpreendimentoPrimeirosServicos?empreendimentoId=${empreendimentoId}`))}
                  >
                    <ClipboardPlus className="w-5 h-5" />
                    <span className="text-center leading-tight">{t.firstServicesReport}</span>
                  </Button>
                  {/* New Button for Weekly Report */}
                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                    onClick={() => navigate(createPageUrl(`EmpreendimentoRelatoriosSemanais?empreendimentoId=${empreendimentoId}`))}
                  >
                    <CalendarClock className="w-5 h-5" />
                    <span className="text-center leading-tight">{t.weeklyReport}</span>
                  </Button>
                  {/* New Button for Hydrant Inspection */}
                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                    onClick={() => navigate(createPageUrl(`EmpreendimentoInspecaoHidrantes?empreendimentoId=${empreendimentoId}`))}
                  >
                    <ClipboardList className="w-5 h-5" />
                    <span className="text-center leading-tight">Inspeção de Hidrantes</span>
                  </Button>
                  {/* New Button for Sprinklers Inspection */}
                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                    onClick={() => navigate(createPageUrl(`EmpreendimentoInspecaoSprinklers?empreendimentoId=${empreendimentoId}`))}
                  >
                    <ClipboardList className="w-5 h-5" />
                    <span className="text-center leading-tight">Inspeção de Sprinklers</span>
                  </Button>
                  {/* New Button for Fire Alarm Inspection */}
                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                    onClick={() => navigate(createPageUrl(`EmpreendimentoInspecaoAlarme?empreendimentoId=${empreendimentoId}`))}
                  >
                    <ClipboardList className="w-5 h-5" />
                    <span className="text-center leading-tight">Inspeção de Alarme</span>
                  </Button>
                  {/* New Button for Air Conditioning Inspection */}
                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                    onClick={() => navigate(createPageUrl(`EmpreendimentoInspecaoArCondicionado?empreendimentoId=${empreendimentoId}`))}
                  >
                    <ClipboardList className="w-5 h-5" />
                    <span className="text-center leading-tight">Inspeção de Ar Condicionado</span>
                  </Button>
                  {/* New Button for Access Control Inspection */}
                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                    onClick={() => navigate(createPageUrl(`EmpreendimentoInspecaoControleAcesso?empreendimentoId=${empreendimentoId}`))}
                  >
                    <ClipboardList className="w-5 h-5" />
                    <span className="text-center leading-tight">Inspeção de Controle de Acesso</span>
                  </Button>
                  {/* New Button for CFTV Inspection */}
                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                    onClick={() => navigate(createPageUrl(`EmpreendimentoInspecaoCFTV?empreendimentoId=${empreendimentoId}`))}
                  >
                    <ClipboardList className="w-5 h-5" />
                    <span className="text-center leading-tight">Inspeção de CFTV</span>
                  </Button>
                  {/* New Button for SDAI Central Inspection */}
                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                    onClick={() => navigate(createPageUrl(`EmpreendimentoInspecaoSDAI?empreendimentoId=${empreendimentoId}`))}
                  >
                    <ClipboardList className="w-5 h-5" />
                    <span className="text-center leading-tight">Inspeção de Central SDAI</span>
                  </Button>
                  {/* New Button for Electrical Inspection */}
                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                    onClick={() => navigate(createPageUrl(`EmpreendimentoInspecaoEletrica?empreendimentoId=${empreendimentoId}`))}
                  >
                    <ClipboardList className="w-5 h-5" />
                    <span className="text-center leading-tight">Inspeção Elétrica</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Unidades - Responsivo */}
            <Card className={`${isDark ? 'bg-gray-800' : ''}`}>
              <CardHeader className="pb-3">
                <CardTitle className={`flex items-center gap-2 text-lg ${isDark ? 'text-white' : ''}`}>
                  <Building className="w-5 h-5" />
                  {t.unitsTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Button variant="outline" onClick={() => setShowUnidades(!showUnidades)} className="h-10 text-sm">
                  <Layers className="w-4 h-4 mr-2" />
                  {showUnidades ? t.hideFloors : t.viewFloors}
                </Button>
                <Button variant="outline" onClick={() => setShowNovaUnidade(true)} className="h-10 text-sm">
                  <Building className="w-4 h-4 mr-2" />
                  {t.addUnit}
                </Button>
                <Button variant="outline" onClick={() => navigate(createPageUrl(`EditarEmpreendimento?empreendimentoId=${empreendimentoId}`))} className="h-10 text-sm">
                  <Edit className="w-4 h-4 mr-2" />
                  {t.editProject}
                </Button>
              </CardContent>
            </Card>

            {showUnidades && (
              <Card className={`${isDark ? 'bg-gray-800' : ''}`}>
                <CardHeader className="pb-3">
                  <CardTitle className={`text-lg ${isDark ? 'text-white' : ''}`}>{t.unitsTitle}</CardTitle>
                </CardHeader>
                <CardContent>
                  {unidades.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {unidades.map(unidade => {
                        console.log("EmpreendimentoPage - Renderizando UnidadeCard:", {
                          unidadeId: unidade.id,
                          empreendimentoId: empreendimentoId,
                          stats: unidadeStats[unidade.id]
                        });
                        return (
                          <UnidadeCard
                            key={unidade.id}
                            unidade={unidade}
                            stats={unidadeStats[unidade.id]}
                            empreendimentoId={empreendimentoId}
                            language={language}
                            theme={theme}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-center py-4`}>{t.noUnits}</p>
                  )}
                </CardContent>
              </Card>
            )}

            <TabelaInformacoesTecnicas informacoes={empreendimento.informacoes_tecnicas} theme={theme} />
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <NovaUnidadeDialog
        open={showNovaUnidade}
        onOpenChange={setShowNovaUnidade}
        id_empreendimento={empreendimento?.id}
        onSuccess={loadEmpreendimentoData}
        language={language}
        theme={theme}
      />
      <GaleriaFotosDialog
        open={showGaleria}
        onOpenChange={setShowGaleria}
        empreendimento={empreendimento}
        fotos={empreendimento?.fotos_empreendimento || []}
        nomeEmpreendimento={empreendimento?.nome_empreendimento}
        language={language}
        theme={theme}
      />
      <ManuaisGeraisDialog
        open={showManuais}
        onOpenChange={setShowManuais}
        empreendimentoId={empreendimento?.id}
        language={language}
        theme={theme}
      />
      <ProjetosOriginaisDialog
        open={showProjetos}
        onOpenChange={setShowProjetos}
        empreendimentoId={empreendimento?.id}
        language={language}
        theme={theme}
      />
      <ParticularidadesDialog
        open={showParticularidades}
        onOpenChange={setShowParticularidades}
        empreendimento={empreendimento}
        language={language}
        theme={theme}
      />
    </div>
  );
}