import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useUnidadeData } from '@/components/hooks/useUnidadeData';
import { AP_unidade } from '@/api/entities';
import UnidadeHeader from '../components/unidade/UnidadeHeader';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, FileWarning } from 'lucide-react';
import AnaliseCard from '../components/analises/AnaliseCard';

const translations = {
  pt: {
    title: "Análise de Projetos",
    loading: "Carregando registros...",
    newAnalysis: "Nova Análise",
    noAnalysis: "Nenhum registro de Análise de Projeto encontrado.",
    addFirst: "Comece adicionando o primeiro registro.",
  },
  en: {
    title: "Project Analysis",
    loading: "Loading records...",
    newAnalysis: "New Analysis",
    noAnalysis: "No Project Analysis records found.",
    addFirst: "Start by adding the first record.",
  },
};

export default function UnidadeAnalises({ language: initialLanguage, theme: initialTheme }) {
    const navigate = useNavigate();
    const location = useLocation();
    const urlParams = new URLSearchParams(location.search);
    const unidadeId = urlParams.get('unidadeId');
    const empreendimentoId = urlParams.get('empreendimentoId');
    
    const { unidade, empreendimento, loading: loadingCore, error: coreError } = useUnidadeData(unidadeId, empreendimentoId);
    
    const [apRecords, setApRecords] = useState([]);
    const [loadingRecords, setLoadingRecords] = useState(true);
    const [language, setLanguage] = useState(initialLanguage || 'pt');
    const [theme, setTheme] = useState(initialTheme || 'light');
    
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
        if(coreError) {
            console.error("Redirecting due to error in useUnidadeData:", coreError);
            navigate(createPageUrl("Empreendimentos"));
        }
    }, [coreError, navigate]);

    useEffect(() => {
        if (unidade) {
            setLoadingRecords(true);
            AP_unidade.filter({ id_unidade: unidadeId, status: ['!in', ['Editado', 'Excluído', 'Obsoleto']] }, "-created_date")
              .then(setApRecords)
              .catch(err => console.error("Failed to fetch AP records:", err))
              .finally(() => setLoadingRecords(false));
        }
    }, [unidade, unidadeId]);

    const onUpdate = () => {
        setLoadingRecords(true);
        AP_unidade.filter({ id_unidade: unidadeId, status: ['!in', ['Editado', 'Excluído', 'Obsoleto']] }, "-created_date")
          .then(setApRecords)
          .finally(() => setLoadingRecords(false));
    };

    if (loadingCore) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className={`p-4 md:p-6 space-y-6 ${isDark ? 'bg-gray-900 text-white' : ''}`}>
            {unidade && empreendimento && (
                 <UnidadeHeader 
                    unidade={unidade} 
                    empreendimento={empreendimento} 
                    loading={loadingCore} 
                    language={language} 
                    theme={theme}
                    showBackButton={true}
                    backToUrl={createPageUrl(`Unidade?unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`)}
                />
            )}
            
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">{t.title}</h2>
                <Link to={createPageUrl(`NovaEmissaoAnalise?unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`)}>
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        {t.newAnalysis}
                    </Button>
                </Link>
            </div>

            {loadingRecords ? (
                <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
            ) : apRecords.length > 0 ? (
                <div className="space-y-4">
                    {apRecords.map(record => (
                        <AnaliseCard 
                            key={record.id}
                            analise={record}
                            empreendimentoId={empreendimentoId}
                            onUpdate={onUpdate}
                            language={language}
                            theme={theme}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <FileWarning className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium">{t.noAnalysis}</h3>
                    <p className="mt-1 text-sm text-gray-500">{t.addFirst}</p>
                </div>
            )}
        </div>
    );
}