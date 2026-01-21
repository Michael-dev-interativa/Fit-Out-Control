
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { KO_unidade } from '@/api/entities';
import { Empreendimento } from '@/api/entities';
import { UnidadeEmpreendimento } from '@/api/entities';
import { User } from '@/api/entities'; // Adicionar import
import { format } from 'date-fns';
import { useUnidadeData } from '@/components/hooks/useUnidadeData';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import ReportLayout from '@/components/relatorios/ReportLayout';
import { createPageUrl } from '@/utils';

// Translations object with placeholder values
const translations = {
    pt: {
        title: "Visualizar Relatório de Kick-Off",
        subtitle: "Detalhes do Registro de Kick-Off",
        back: "Voltar",
        print: "Imprimir",
        reportTitle: "ATA - REUNIÃO / FIT-OUT",
        project: "Empreendimento",
        unit: "Unidade",
        client: "Cliente",
        date: "Data de Emissão",
        osNumber: "OS",
        meetingDetails: "Detalhes da Reunião",
        meetingDate: "Data da Reunião",
        meetingTime: "Hora da Reunião",
        participants: "Participantes",
        interativaScope: "Escopo (Interativa)",
        tenantScope: "Escopo (Locatário)",
        interativaParticipants: "Participantes (Interativa)",
        condoParticipants: "Participantes (Condomínio)",
        tenantParticipants: "Participantes (Locatário)",
        projectData: "Dados do Projeto",
        manager: "Gerenciadora",
        buildingDetails: "Empreendimento/Torre/Pavimento/Conjunto",
        squareMeters: "Metros Quadrados",
        scopeOfServices: "Escopo dos Serviços",
        timeline: "Cronograma",
        sendProjects: "Envio dos projetos",
        startActivities: "Início das atividades",
        occupancyForecast: "Previsão de ocupação",
        additionalInfo: "Informações Adicionais",
        particularities: "Particularidades",
        otherInfo: "Outras Informações",
        noRecordSelected: "Nenhum registro de Kick-Off selecionado.",
        loadingMessage: "Carregando relatório...",
        errorMessage: "Erro ao carregar o relatório",
        noDataFoundTitle: "Dados Incompletos ou Não Encontrados",
        noDataFoundMessage: "Não foi possível gerar o relatório. Verifique se os dados estão completos ou se os IDs fornecidos são válidos.",
        invalidIdRedirect: "IDs inválidos em VisualizarRelatorioKickOff, redirecionando..."
    },
};

export default function VisualizarRelatorioKickOff() {
    const navigate = useNavigate();
    const location = useLocation();
    const urlParams = new URLSearchParams(location.search);

    const unidadeId = urlParams.get('unidadeId');
    const empreendimentoId = urlParams.get('empreendimentoId');
    const kickOffId = urlParams.get('kickOffId');

    const {
        unidade,
        empreendimento,
        loading,
        error
    } = useUnidadeData(unidadeId, empreendimentoId);

    const [kickOff, setKickOff] = useState(null);
    const [loadingKickOff, setLoadingKickOff] = useState(true);

    const [registrosKO, setRegistrosKO] = useState([]);
    const [loadingRegistros, setLoadingRegistros] = useState(false);
    const [reportError, setReportError] = useState(null);
    const [user, setUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);
    const [language] = useState(localStorage.getItem('language') || 'pt');

    const t = translations[language];

    const isValidId = (id) => id && String(id).trim() !== '' && !['null', 'undefined'].includes(String(id).toLowerCase());

    // The useEffect for theme (document.documentElement.classList.toggle('dark', isDark)) is removed
    // as theme is no longer passed as a prop nor is 'isDark' derived from it.
    // The component will now rely on global CSS for dark mode via Tailwind's dark: utility classes
    // or default to light theme for main backgrounds as specified by the outline.

    useEffect(() => {
        const checkUser = async () => {
            setLoadingUser(true);
            try {
                const currentUser = await User.me();
                setUser(currentUser);
            } catch (error) {
                // If User.me() fails (e.g., not logged in, token expired), set user to null
                setUser(null);
            } finally {
                setLoadingUser(false);
            }
        };
        checkUser();
    }, []);

    useEffect(() => {
        if (!isValidId(unidadeId) || !isValidId(empreendimentoId)) {
            console.error(t.invalidIdRedirect);
            navigate(createPageUrl('Empreendimentos'));
        }
    }, [unidadeId, empreendimentoId, navigate, t]);

    useEffect(() => {
        if (kickOffId) {
            setLoadingKickOff(true);
            KO_unidade.get(kickOffId)
                .then(data => {
                    setKickOff(data);
                    if (!data) {
                        console.warn(`Kick-Off record with ID ${kickOffId} not found.`);
                        setReportError(new Error(t.noDataFoundMessage));
                    }
                })
                .catch(err => {
                    console.error("Erro ao carregar registro de Kick-Off:", err);
                    setKickOff(null);
                    setReportError(new Error(t.errorMessage));
                })
                .finally(() => setLoadingKickOff(false));
        } else {
            setKickOff(null);
            setLoadingKickOff(false);
            setReportError(new Error(t.noRecordSelected));
        }
    }, [kickOffId, t]);

    // This effect block was implied in the outline but no specific logic was provided for it.
    // Given the component displays a single report, and no 'registrosKOIds' or 'fetchRegistrosKO' function is defined,
    // this block remains a placeholder if there were future plans for 'registrosKO' data.
    useEffect(() => {
        // Placeholder for fetchRegistrosKO effect if it were to be implemented
        // For now, loadingRegistros remains false and registrosKO remains empty
    }, [unidadeId, loading, error]); // Removed 'registrosKOIds' as it's not defined

    const handlePrint = () => {
        window.print();
    };

    const overallLoading = loading || loadingKickOff || loadingRegistros || loadingUser;

    if (overallLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-lg font-semibold text-gray-700 flex items-center">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t.loadingMessage}
                </div>
            </div>
        );
    }

    if (error || reportError || !kickOff || !unidade || !empreendimento) {
        const title = error || reportError ? t.errorMessage : t.noDataFoundTitle;
        const message = (error && error.message) || (reportError && reportError.message) || t.noDataFoundMessage;
        const textColor = error || reportError ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400';

        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="p-8 bg-white shadow-lg rounded-lg text-center">
                    <p className={`text-xl font-semibold ${textColor} mb-4`}>
                        {title}
                    </p>
                    <p className="text-gray-700 mb-6">
                        {message}
                    </p>
                    <Button onClick={() => navigate(createPageUrl('Empreendimentos'))}>
                        {t.back}
                    </Button>
                </div>
            </div>
        );
    }

    // Helper components for better formatting
    const InfoItem = ({ label, value }) => (
        <div className="flex flex-col">
            <span className="font-semibold text-gray-600 text-xs uppercase">{label}:</span>
            <p className="text-gray-800 font-medium text-sm">{value || 'N/A'}</p>
        </div>
    );

    const InfoBlock = ({ label, value }) => (
        <div className="flex flex-col">
            <span className="font-semibold text-gray-600 text-xs uppercase mb-1">{label}:</span>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-md print:border-gray-300 print:bg-white">
                {/* Applied text break correction classes: break-words and hyphens-auto */}
                <p className="text-gray-800 whitespace-pre-wrap break-words hyphens-auto text-sm">{value || 'N/A'}</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-100">
            {!loadingUser && (
                <div className="p-4 md:p-6 bg-white no-print shadow-md">
                    <div className="flex items-center justify-between">
                        {user ? (
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                    if (isValidId(unidadeId) && isValidId(empreendimentoId)) {
                                        navigate(createPageUrl(`UnidadeKickOff?unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`));
                                    } else {
                                        navigate(createPageUrl('Empreendimentos'));
                                    }
                                }}
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        ) : (
                            <div></div> // Placeholder para manter o espaçamento
                        )}
                        <h1 className="text-xl font-bold text-gray-800">{t.title}</h1>
                        <Button onClick={handlePrint}>
                            <Printer className="w-4 h-4 mr-2" />
                            {t.print}
                        </Button>
                    </div>
                </div>
            )}

            <ReportLayout
                title={t.reportTitle}
                subtitle={`${empreendimento.nome_empreendimento} - ${unidade.unidade_empreendimento}`}
            >
                <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-8 text-base border-y-2 border-gray-200 py-4 print:border-gray-300">
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-gray-500">{t.project}:</p>
                        <p className="font-medium text-gray-800">{empreendimento?.nome_empreendimento || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-gray-500">{t.unit}:</p>
                        <p className="font-medium text-gray-800">{unidade?.unidade_empreendimento || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-gray-500">{t.osNumber}:</p>
                        <p className="font-medium text-gray-800">{kickOff?.os_numero || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-gray-500">{t.client}:</p>
                        <p className="font-medium text-gray-800">{unidade?.cliente_unidade || 'N/A'}</p>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Meeting Details */}
                    <div className="break-inside-avoid-page">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3 pt-4 border-t-2 border-gray-200 mt-6 first:mt-0 first:border-t-0 first:pt-0 print:border-gray-300">{t.meetingDetails}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <InfoItem label={t.meetingDate} value={kickOff?.data_reuniao ? format(new Date(kickOff.data_reuniao), 'dd/MM/yyyy') : 'N/A'} />
                            <InfoItem label={t.meetingTime} value={kickOff?.hora_reuniao || 'N/A'} />
                        </div>
                    </div>

                    {/* Participants */}
                    <div className="break-inside-avoid-page">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3 pt-4 border-t-2 border-gray-200 print:border-gray-300">{t.participants}</h3>
                        <div className="space-y-4">
                            <InfoBlock label={t.interativaParticipants} value={kickOff?.participantes_interativa} />
                            <InfoBlock label={t.condoParticipants} value={kickOff?.participantes_condominio} />
                            <InfoBlock label={t.tenantParticipants} value={kickOff?.participantes_locatario} />
                        </div>
                    </div>

                    {/* Project Data */}
                    <div className="break-inside-avoid-page">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3 pt-4 border-t-2 border-gray-200 print:border-gray-300">{t.projectData}</h3>
                        <div className="space-y-4">
                            <InfoBlock label={t.manager} value={kickOff?.empreendimento_gerenciadora} />
                            <InfoBlock label={t.buildingDetails} value={kickOff?.torre_pavimento_conjunto} />
                            <InfoBlock label={t.squareMeters} value={kickOff?.metros_quadrados ? `${kickOff.metros_quadrados} m²` : 'N/A'} />
                        </div>
                    </div>

                    {/* Scope of Services */}
                    <div className="break-inside-avoid-page">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3 pt-4 border-t-2 border-gray-200 print:border-gray-300">{t.scopeOfServices}</h3>
                        <div className="space-y-4">
                            <InfoBlock label={t.interativaScope} value={kickOff?.escopo_servicos_interativa} />
                            <InfoBlock label={t.tenantScope} value={kickOff?.escopo_servicos_locatario} />
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="break-inside-avoid-page">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3 pt-4 border-t-2 border-gray-200 print:border-gray-300">{t.timeline}</h3>
                        <div className="space-y-4">
                            <InfoBlock label={t.sendProjects} value={kickOff?.data_envio_projetos ? format(new Date(kickOff.data_envio_projetos), 'dd/MM/yyyy') : 'N/A'} />
                            <InfoBlock label={t.startActivities} value={kickOff?.data_inicio_atividades ? format(new Date(kickOff.data_inicio_atividades), 'dd/MM/yyyy') : 'N/A'} />
                            <InfoBlock label={t.occupancyForecast} value={kickOff?.data_previsao_ocupacao ? format(new Date(kickOff.data_previsao_ocupacao), 'dd/MM/yyyy') : 'N/A'} />
                        </div>
                    </div>

                    {/* Additional Information */}
                    <div className="break-inside-avoid-page">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3 pt-4 border-t-2 border-gray-200 print:border-gray-300">{t.additionalInfo}</h3>
                        <div className="space-y-4">
                            <InfoBlock label={t.particularities} value={kickOff?.particularidades} />
                            <InfoBlock label={t.otherInfo} value={kickOff?.outras_informacoes} />
                        </div>
                    </div>
                </div>
            </ReportLayout>
        </div>
    );
}
