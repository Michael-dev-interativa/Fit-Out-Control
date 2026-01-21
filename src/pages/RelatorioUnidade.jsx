import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import UnidadeHeader from '../components/unidade/UnidadeHeader';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users, ClipboardList, Building2, Loader2, AlertTriangle } from 'lucide-react';
import { useUnidadeData } from '@/components/hooks/useUnidadeData';

const translations = {
  pt: {
    title: "Relatórios da Unidade",
    generateReport: "Gerar Relatório",
    kickOff: "Kick-Off",
    projectAnalysis: "Análise de Projetos",
    workInspection: "Vistoria de Obras",
    kickOffReport: "Gerar Relatório de Kick-Off",
    analysisReport: "Gerar Relatório de Análise",
    inspectionReport: "Gerar Relatório de Vistoria",
    errorTitle: "Erro ao Carregar Dados",
    backToProjects: "Voltar aos Empreendimentos",
  },
  en: {
    title: "Unit Reports",
    generateReport: "Generate Report",
    kickOff: "Kick-Off",
    projectAnalysis: "Project Analysis",
    workInspection: "Work Inspection",
    kickOffReport: "Generate Kick-Off Report",
    analysisReport: "Generate Analysis Report",
    inspectionReport: "Generate Inspection Report",
    errorTitle: "Error Loading Data",
    backToProjects: "Back to Projects",
  },
};

export default function RelatorioUnidade({ language = 'pt', theme = 'light' }) {
    const navigate = useNavigate();
    const urlParams = new URLSearchParams(window.location.search);
    const unidadeId = urlParams.get('unidadeId');
    const empreendimentoId = urlParams.get('empreendimentoId');
    
    const { unidade, empreendimento, loading, error } = useUnidadeData(unidadeId, empreendimentoId);
    
    const t = translations[language];
    const isDark = theme === 'dark';

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    if (error) {
        return (
          <div className="flex flex-col items-center justify-center h-screen p-8 text-center bg-gray-50">
            <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-red-600 mb-4">{t.errorTitle}</h2>
            <p className="text-gray-700 mb-6 max-w-md">{error.message}</p>
            <Button onClick={() => navigate(createPageUrl('Empreendimentos'))}>
              <ArrowLeft className="mr-2 h-4 w-4" /> {t.backToProjects}
            </Button>
          </div>
        );
    }

    return (
        <div className={`p-4 md:p-6 space-y-6 ${isDark ? 'bg-gray-900' : ''}`}>
            <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate(createPageUrl(`Unidade?unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`))}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <h1 className="text-2xl font-bold">{t.title}</h1>
            </div>

            <UnidadeHeader 
                unidade={unidade} 
                empreendimento={empreendimento} 
                loading={loading} 
                language={language} 
                theme={theme}
                hideStats={true}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <Users className="w-6 h-6 text-blue-500"/>
                            <CardTitle>{t.kickOff}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full" onClick={() => navigate(createPageUrl(`RelatorioKickOff?unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`))}>
                            {t.kickOffReport}
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <ClipboardList className="w-6 h-6 text-green-500"/>
                            <CardTitle>{t.projectAnalysis}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full" onClick={() => navigate(createPageUrl(`RelatorioAnalise?unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`))}>
                            {t.analysisReport}
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <Building2 className="w-6 h-6 text-purple-500"/>
                            <CardTitle>{t.workInspection}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                         <Button className="w-full" onClick={() => navigate(createPageUrl(`VisualizarRelatorioVistoria?unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`))}>
                            {t.inspectionReport}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}