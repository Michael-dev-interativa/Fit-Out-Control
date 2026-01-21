
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { RespostaVistoria } from '@/api/entities';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, HardHat, Loader2 } from 'lucide-react';
import { useUnidadeData } from '../components/hooks/useUnidadeData';
import UnidadeHeader from '../components/unidade/UnidadeHeader';
import VistoriaCard from '../components/vistoria/VistoriaCard'; // New component

const translations = {
  pt: {
    title: "Vistorias de Obras",
    loading: "Carregando vistorias...",
    newInspection: "Nova Vistoria de Obra",
    noInspections: "Nenhuma vistoria de obra encontrada para esta unidade.",
  },
  en: {
    title: "Work Inspections",
    loading: "Loading inspections...",
    newInspection: "New Work Inspection",
    noInspections: "No work inspections found for this unit.",
  },
};

export default function UnidadeVistoria({ language = 'pt', theme = 'light' }) {
    const navigate = useNavigate();
    const location = useLocation();
    const urlParams = new URLSearchParams(location.search);
    const unidadeId = urlParams.get('unidadeId');
    const empreendimentoId = urlParams.get('empreendimentoId');
    
    const { unidade, empreendimento, loading: loadingCore, error: coreError } = useUnidadeData(unidadeId, empreendimentoId);
    const [vistorias, setVistorias] = useState([]);
    const [loadingVistorias, setLoadingVistorias] = useState(true);

    const t = translations[language];
    const isDark = theme === 'dark';

    useEffect(() => {
        if (coreError) {
            console.error("Erro ao carregar dados da unidade, redirecionando:", coreError);
            navigate(createPageUrl('Empreendimentos'));
        }
    }, [coreError, navigate]);

    useEffect(() => {
        if (unidadeId) {
            const fetchVistorias = async () => {
                setLoadingVistorias(true);
                try {
                    const data = await RespostaVistoria.filter({ id_unidade: unidadeId }, "-created_date");
                    setVistorias(data);
                } catch (error) {
                    console.error("Erro ao carregar vistorias de obras:", error);
                    setVistorias([]);
                } finally {
                    setLoadingVistorias(false);
                }
            };
            fetchVistorias();
        }
    }, [unidadeId]);

    const loading = loadingCore || loadingVistorias;

    return (
        <div className={`p-4 md:p-6 space-y-6 ${isDark ? 'bg-gray-900' : ''}`}>
            <div className="flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate(createPageUrl(`Unidade?unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`))}
                  className={isDark ? 'text-white border-gray-600 hover:bg-gray-800' : ''}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>{t.title}</h1>
                <Button onClick={() => navigate(createPageUrl(`NovaVistoriaFormulario?unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`))}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t.newInspection}
                </Button>
            </div>

            <UnidadeHeader 
                unidade={unidade} 
                empreendimento={empreendimento} 
                loading={loadingCore} 
                language={language} 
                theme={theme}
                hideStats={true}
            />

            {loading ? (
                <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-500" />
                    <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t.loading}</p>
                </div>
            ) : vistorias.length === 0 ? (
                <Card className={`text-center py-12 ${isDark ? 'bg-gray-800' : ''}`}>
                    <CardContent>
                        <HardHat className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t.noInspections}</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6">
                    {vistorias.map((vistoria) => (
                        <VistoriaCard 
                            key={vistoria.id} 
                            vistoria={vistoria} 
                            unidadeId={unidadeId}
                            empreendimentoId={empreendimentoId}
                            language={language} 
                            theme={theme} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
