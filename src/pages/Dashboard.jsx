
import React, { useState, useEffect } from "react";
import { Empreendimento } from "@/api/entities";
import { UnidadeEmpreendimento } from "@/api/entities";
import { RegistroUnidade } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Plus, TrendingUp, Users, FileText, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import StatsCards from "../components/dashboard/StatsCards";
import RecentActivity from "../components/dashboard/RecentActivity";
import RegistroGeralManager from "../components/dashboard/RegistroGeralManager";
import DisciplinaGeralManager from "../components/dashboard/DisciplinaGeralManager";

const StatsCardSkeleton = ({ theme }) => (
  <Card className={`relative overflow-hidden shadow-sm animate-pulse ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}`}>
    <CardContent className="p-6">
      <div className={`h-4 rounded w-24 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`} />
      <div className={`h-8 rounded w-16 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`} />
      <div className={`p-3 rounded-xl w-12 h-12 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`} />
      <div className={`h-3 rounded mt-4 w-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`} />
    </CardContent>
  </Card>
);

const translations = {
  pt: {
    dashboard: "Dashboard",
    overview: "Visão geral do sistema FitOut",
    projects: "Total de Empreendimentos",
    units: "Total de Unidades",
    activeRecords: "Registros Ativos (Recentes)",
    pending: "Pendentes (Recentes)",
    thisMonth: "este mês",
    newToday: "novos hoje",
    recentActivity: "Atividade Recente",
    quickActions: "Ações Rápidas",
    newProject: "Novo Empreendimento",
    newRecord: "Novo Registro",
    fullReport: "Relatório Geral",
    totalProjectsDesc: "Número total de projetos no sistema.",
    totalUnitsDesc: "Número total de unidades cadastradas.",
    recentRecordsDesc: "Registros criados nos últimos 30 dias.",
    recentPendingDesc: "Registros pendentes dos últimos 30 dias."
  },
  en: {
    dashboard: "Dashboard",
    overview: "FitOut system overview",
    projects: "Total Projects",
    units: "Total Units",
    activeRecords: "Active Records (Recent)",
    pending: "Pending (Recent)",
    thisMonth: "this month",
    newToday: "new today",
    recentActivity: "Recent Activity",
    quickActions: "Quick Actions",
    newProject: "New Project",
    newRecord: "New Record",
    fullReport: "Full Report",
    totalProjectsDesc: "Total number of projects in the system.",
    totalUnitsDesc: "Total number of registered units.",
    recentRecordsDesc: "Records created in the last 30 days.",
    recentPendingDesc: "Pending records from the last 30 days."
  }
};

export default function Dashboard({ language: initialLanguage, theme: initialTheme }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    empreendimentos: 0,
    unidades: 0,
    registros: 0,
    registrosPendentes: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [language, setLanguage] = useState(initialLanguage || 'pt');
  const [theme, setTheme] = useState(initialTheme || 'light');

  useEffect(() => {
    const handleLanguageChange = () => {
      const storedLang = localStorage.getItem('language') || 'pt';
      setLanguage(storedLang);
    };
    const handleThemeChange = () => {
      const storedTheme = localStorage.getItem('theme') || 'light';
      setTheme(storedTheme);
    };
    window.addEventListener('language-change', handleLanguageChange);
    window.addEventListener('theme-change', handleThemeChange);
    handleLanguageChange();
    handleThemeChange();
    return () => {
      window.removeEventListener('language-change', handleLanguageChange);
      window.removeEventListener('theme-change', handleThemeChange);
    };
  }, []);

  const t = translations[language];
  const isDark = theme === 'dark';

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      console.log("Carregando estatísticas...");
      
      // Para otimizar, não vamos mais carregar TODOS os registros.
      // Buscamos apenas os 5000 registros mais recentes para ter uma ideia.
      // O ideal seria ter um endpoint de contagem no backend.
      // Esta é uma otimização no lado do cliente.
      const [empreendimentos, unidades, registrosRecentes] = await Promise.all([
        Empreendimento.list("-created_date", 5000).catch(err => {
          console.error("Erro ao carregar empreendimentos:", err);
          return [];
        }),
        UnidadeEmpreendimento.list("-created_date", 5000).catch(err => {
          console.error("Erro ao carregar unidades:", err);
          return [];
        }),
        RegistroUnidade.filter({ status: "!Obsoleto" }, "-created_date", 1000).catch(err => {
          console.error("Erro ao carregar registros:", err);
          return [];
        })
      ]);

      console.log("Dados carregados:", {
        empreendimentos: empreendimentos.length,
        unidades: unidades.length,
        registros: registrosRecentes.length
      });

      const registrosPendentes = registrosRecentes.filter(r => r.status === "Pendente").length;

      setStats({
        empreendimentos: empreendimentos.length === 5000 ? "5000+" : empreendimentos.length,
        unidades: unidades.length === 5000 ? "5000+" : unidades.length,
        registros: registrosRecentes.length,
        registrosPendentes
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
      setStats({ empreendimentos: 'N/A', unidades: 'N/A', registros: 'N/A', registrosPendentes: 'N/A' });
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    <div className={`p-6 space-y-8 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.dashboard}</h1>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>{t.overview}</p>
        </div>
        <img 
          src={isDark 
            ? "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1a0999f3c_logo_Interativa_letra_branca_sem_fundo_gg.png"
            : "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f1e898ee3_logo_Interativa_versao_final_sem_fundo_0002.png"
          } 
          alt="Logo Interativa Engenharia" 
          className="h-48" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loadingStats ? (
          <>
            <StatsCardSkeleton theme={theme} />
            <StatsCardSkeleton theme={theme} />
            <StatsCardSkeleton theme={theme} />
            <StatsCardSkeleton theme={theme} />
          </>
        ) : (
          <>
            <StatsCards
              title={t.projects}
              value={stats.empreendimentos}
              icon={Building2}
              color="blue"
              trend={t.totalProjectsDesc}
              theme={theme}
            />
            <StatsCards
              title={t.units}
              value={stats.unidades}
              icon={Users}
              color="green"
              trend={t.totalUnitsDesc}
              theme={theme}
            />
            <StatsCards
              title={t.activeRecords}
              value={stats.registros}
              icon={Activity}
              color="purple"
              trend={t.recentRecordsDesc}
              theme={theme}
            />
            <StatsCards
              title={t.pending}
              value={stats.registrosPendentes}
              icon={TrendingUp}
              color="orange"
              trend={t.recentPendingDesc}
              theme={theme}
            />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className={`shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
          <CardHeader>
            <CardTitle className={isDark ? 'text-white' : ''}>{t.recentActivity}</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivity language={language} theme={theme} />
          </CardContent>
        </Card>

        <Card className={`shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
          <CardHeader>
            <CardTitle className={isDark ? 'text-white' : ''}>{t.quickActions}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className={`w-full justify-start h-12 ${isDark ? 'bg-blue-700 text-blue-100 border-blue-600 hover:bg-blue-600' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'}`}
              variant="outline"
              onClick={() => navigate(createPageUrl("Empreendimentos"))}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t.newProject}
            </Button>
            <Button 
              className={`w-full justify-start h-12 ${isDark ? 'bg-green-700 text-green-100 border-green-600 hover:bg-green-600' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}`}
              variant="outline"
            >
              <FileText className="w-4 h-4 mr-2" />
              {t.newRecord}
            </Button>
            <Button 
              className={`w-full justify-start h-12 ${isDark ? 'bg-purple-700 text-purple-100 border-purple-600 hover:bg-purple-600' : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'}`}
              variant="outline"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {t.fullReport}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Seções de Gerenciamento */}
      <div className="space-y-6">
        <RegistroGeralManager language={language} theme={theme} />
        <DisciplinaGeralManager language={language} theme={theme} />
      </div>
    </div>
  );
}
