
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useUnidadeData } from '../components/hooks/useUnidadeData';
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Loader2, 
  ClipboardList, 
  BookOpen, 
  Users, 
  AlertTriangle
} from 'lucide-react'; // Removed ClipboardCheck as it's no longer needed for Daily Report here
import UnidadeHeader from '../components/unidade/UnidadeHeader';

const translations = {
  pt: {
    errorTitle: "Erro ao Carregar Dados",
    backToProjects: "Voltar aos Empreendimentos",
    loadingData: "Carregando dados da unidade...",
    kickOff: "Kick-Off",
    projectAnalysis: "Análise de Projetos",
    workInspection: "Vistoria de Obras",
    // dailyReport: "Diário de Obra", // Removed as Diário de Obra is moved to Empreendimento level
    backToProject: "Voltar ao Empreendimento",
  },
  en: {
    errorTitle: "Error Loading Data",
    backToProjects: "Back to Projects",
    loadingData: "Loading unit data...",
    kickOff: "Kick-Off",
    projectAnalysis: "Project Analysis",    
    workInspection: "Work Inspection",
    // dailyReport: "Daily Work Report", // Removed as Daily Work Report is moved to Empreendimento level
    backToProject: "Back to Project",
  }
};

export default function Unidade(props) {
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const unidadeId = urlParams.get('unidadeId');
  const empreendimentoId = urlParams.get('empreendimentoId');
  
  // Hooks devem ser chamados no nível superior do componente
  const { unidade, empreendimento, loading, error } = useUnidadeData(unidadeId, empreendimentoId);
  const [language, setLanguage] = useState(props.language || 'pt');
  const [theme, setTheme] = useState(props.theme || 'light');
  
  const isDark = theme === 'dark';
  const t = translations[language];

  useEffect(() => {
    const handleLanguageChange = () => setLanguage(localStorage.getItem('language') || 'pt');
    const handleThemeChange = () => setTheme(localStorage.getItem('theme') || 'light');
    window.addEventListener('language-change', handleLanguageChange);
    window.addEventListener('theme-change', handleThemeChange);
    return () => {
      window.removeEventListener('language-change', handleLanguageChange);
      window.removeEventListener('theme-change', handleThemeChange);
    };
  }, []);

  // Renderização condicional APÓS a chamada de todos os hooks
  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center h-screen p-6">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t.loadingData}</p>
        </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-8 text-center bg-gray-50 dark:bg-gray-900">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-red-600 dark:text-red-500 mb-4">{t.errorTitle}</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-6 max-w-md">
          {error?.message || `Ocorreu um erro ao carregar os dados. Verifique o ID da unidade e do empreendimento.`}
        </p>
        <Button onClick={() => navigate(createPageUrl("Empreendimentos"))}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t.backToProjects}
        </Button>
      </div>
    );
  }

  if (!unidade || !empreendimento) {
    return null; // Não renderiza se os dados estiverem faltando após o carregamento
  }

  const menuItems = [
    {
      label: t.kickOff,
      icon: Users,
      action: () => navigate(createPageUrl(`RelatorioKickOff?unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`)),
    },
    {
      label: t.projectAnalysis,
      icon: BookOpen,
      action: () => navigate(createPageUrl(`UnidadeAnalises?unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`)),
    },
    {
      label: t.workInspection,
      icon: ClipboardList,
      action: () => navigate(createPageUrl(`IniciarVistoria?unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`)),
    },
    // Removed Diário de Obra item as it's moved to Empreendimento level
    // {
    //   label: t.dailyReport,
    //   icon: ClipboardCheck, 
    //   action: () => navigate(createPageUrl(`UnidadeDiariosObra?unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`)),
    // }
  ];

  return (
    <div className={`p-4 md:p-6 space-y-6 ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50'}`}>
        <UnidadeHeader 
            unidade={unidade} 
            empreendimento={empreendimento} 
            loading={loading}
            language={language}
            theme={theme}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {menuItems.map(item => (
                 <Button 
                    key={item.label}
                    variant="outline"
                    className={`h-24 text-lg justify-start p-6 ${isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : ''}`}
                    onClick={item.action}
                >
                    <item.icon className="w-6 h-6 mr-4"/>
                    {item.label}
                </Button>
            ))}
        </div>

        <div className="mt-6">
            <Button variant="outline" onClick={() => navigate(createPageUrl(`Empreendimento?empreendimentoId=${empreendimentoId}`))}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t.backToProject}
            </Button>
        </div>
    </div>
  );
}
