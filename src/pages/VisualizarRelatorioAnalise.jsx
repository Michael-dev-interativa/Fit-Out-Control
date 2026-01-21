
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { UnidadeEmpreendimento } from "@/api/entities";
import { Empreendimento } from "@/api/entities";
import { AP_unidade } from "@/api/entities";
import { useUnidadeData } from "@/components/hooks/useUnidadeData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Printer, Loader2, ArrowLeft } from "lucide-react";
import ReportLayout from '@/components/relatorios/ReportLayout';
import { createPageUrl } from '@/utils';
import { User } from '@/api/entities'; // Adicionar import

const translations = {
    pt: {
        title: "Relatório de Análise de Projetos",
        subtitle: "Detalhes do Empreendimento e Análises",
        back: "Voltar",
        print: "Imprimir / Exportar PDF",
        reportTitle: "Relatório de Análise de Projetos",
        project: "Empreendimento",
        unit: "Unidade",
        client: "Cliente",
        date: "Data de Emissão",
        noRecords: "Nenhum registro encontrado para esta disciplina.",
        noRecordsFoundOverall: "Nenhum registro encontrado para os filtros selecionados.",
        loadingReport: "Carregando relatório...",
        errorTitle: "Erro ao Carregar Relatório",
        currentUrl: "URL atual",
        urlParams: "Parâmetros da URL",
        essentialDataMissingTitle: "Dados Essenciais Não Encontrados",
        essentialDataMissingMessage: "Não foi possível carregar os dados da unidade ou empreendimento. Verifique os parâmetros da URL e se os IDs são válidos.",
        reportGeneratedBy: "Relatório gerado automaticamente pelo sistema FitOut - Interativa Engenharia",
        generationDate: "Data de geração"
    }
};

export default function VisualizarRelatorioAnalise({ language: initialLanguage = 'pt', theme: initialTheme = 'light' }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [theme, setTheme] = useState(initialTheme);
    const [language, setLanguage] = useState(initialLanguage);
    const t = translations[language];

    const urlParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const unidadeId = urlParams.get('unidadeId');
    const empreendimentoId = urlParams.get('empreendimentoId');
    const registrosAPIds = urlParams.get('registrosAPIds')?.split(',').filter(id => id);

    const {
        unidade,
        empreendimento,
        loading,
        error
    } = useUnidadeData(unidadeId, empreendimentoId);

    const [registrosAP, setRegistrosAP] = useState([]);
    const [loadingRegistros, setLoadingRegistros] = useState(true);
    const [reportError, setReportError] = useState(null);
    const [user, setUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);

    const isValidId = (id) => id && String(id).trim() !== '' && !['null', 'undefined'].includes(String(id).toLowerCase());

    useEffect(() => {
        const handleThemeChange = () => setTheme(localStorage.getItem('theme') || 'light');
        window.addEventListener('theme-change', handleThemeChange);
        handleThemeChange();
        return () => window.removeEventListener('theme-change', handleThemeChange);
    }, []);

    useEffect(() => {
        const checkUser = async () => {
            setLoadingUser(true);
            try {
                const currentUser = await User.me();
                setUser(currentUser);
            } catch (error) {
                // If User.me() fails (e.g., not logged in), user will be null
                setUser(null);
            } finally {
                setLoadingUser(false);
            }
        };
        checkUser();
    }, []);

    useEffect(() => {
        if (!isValidId(unidadeId) || !isValidId(empreendimentoId)) {
            console.error("IDs inválidos em VisualizarRelatorioAnalise, redirecionando...");
            // Only redirect if user is logged in. If not, it means it's a public link.
            if (!loadingUser && user) {
                navigate(createPageUrl('Empreendimentos'));
            }
        }
    }, [unidadeId, empreendimentoId, navigate, user, loadingUser]);

    useEffect(() => {
        if (error) {
            console.error("Redirecionando devido a erro na unidade/empreendimento:", error.message || error);
            // Only redirect if user is logged in. If not, it means it's a public link.
            if (!loadingUser && user) {
                if (typeof createPageUrl === 'function') {
                    navigate(createPageUrl('Empreendimentos'));
                } else {
                    navigate('/empreendimentos');
                }
            }
        }
    }, [error, navigate, user, loadingUser]);


    useEffect(() => {
        const fetchRegistrosAP = async () => {
            setLoadingRegistros(true);
            setReportError(null);
            if (!unidadeId) {
                setReportError("ID da unidade não fornecido na URL para buscar registros.");
                setLoadingRegistros(false);
                return;
            }
            if (loading || error) {
                setLoadingRegistros(false);
                return;
            }
            try {
                let fetchedRegistros = [];
                if (registrosAPIds && registrosAPIds.length > 0) {
                    const promises = registrosAPIds.map(id => AP_unidade.get(id));
                    fetchedRegistros = (await Promise.all(promises)).filter(r => r !== null);
                } else {
                    let filterQuery = { id_unidade: unidadeId };
                    if (urlParams.get('emissao') && urlParams.get('emissao') !== "Todas") {
                        filterQuery.emissao_ap = urlParams.get('emissao');
                    }
                    if (urlParams.get('status') && urlParams.get('status') !== "Todos") {
                        filterQuery.status = urlParams.get('status');
                    }
                    if (urlParams.get('disciplina') && urlParams.get('disciplina') !== "Todas") {
                        filterQuery.disciplina_ap = urlParams.get('disciplina');
                    }
                    fetchedRegistros = await AP_unidade.filter(filterQuery, "+disciplina_ap");
                }
                setRegistrosAP(fetchedRegistros);
            } catch (err) {
                console.error("Erro ao carregar registros AP:", err);
                setReportError("Erro ao carregar registros de análise: " + err.message);
            } finally {
                setLoadingRegistros(false);
            }
        };
        if (unidadeId && !loading && !error) {
            fetchRegistrosAP();
        } else if (!unidadeId) {
            setLoadingRegistros(false);
        }
    }, [unidadeId, registrosAPIds, loading, error, urlParams]);

    const handlePrint = () => {
        window.print();
    };

    const getStatusBadge = (status) => {
        let variant = "secondary";
        if (status === "Concluído") {
            variant = "default";
        } else if (status === "Pendente") {
            variant = "destructive";
        }
        return <Badge variant={variant}>{status}</Badge>;
    };

    const groupedRecords = registrosAP.reduce((acc, registro) => {
        const disciplina = registro.disciplina_ap || 'Geral';
        if (!acc[disciplina]) {
            acc[disciplina] = [];
        }
        acc[disciplina].push(registro);
        return acc;
    }, {});

    const overallLoading = loading || loadingRegistros || loadingUser;

    if (overallLoading) {
        return (
            <div className="p-6 flex flex-col justify-center items-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p>{t.loadingReport}</p>
            </div>
        );
    }

    if (error || reportError) {
        return (
            <div className="p-6 text-center">
                <h2 className="text-xl font-bold mb-4 text-red-600">{t.errorTitle}</h2>
                <p className="text-gray-600 mb-4">{error?.message || reportError?.message || String(error || reportError)}</p>
                <div className="mb-4 text-sm text-gray-500">
                    <p>{t.currentUrl}: {window.location.href}</p>
                    <p>{t.urlParams}: {JSON.stringify(Object.fromEntries(urlParams.entries()))}</p>
                </div>
                {user && <Button onClick={() => navigate(-1)}>{t.back}</Button>}
            </div>
        );
    }

    if (!unidade || !empreendimento) {
        return (
            <div className="p-6 text-center">
                <h2 className="text-xl font-bold mb-4">{t.essentialDataMissingTitle}</h2>
                <p className="text-gray-600 mb-4">{t.essentialDataMissingMessage}</p>
                {user && <Button onClick={() => navigate(-1)}>{t.back}</Button>}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {!loadingUser && (
                <div className="p-4 md:p-6 bg-white no-print">
                    <div className="flex items-center justify-between">
                        {user ? (
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                    if (isValidId(unidadeId) && isValidId(empreendimentoId)) {
                                        navigate(createPageUrl(`UnidadeAnalises?unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`));
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
                        <h1 className="text-xl font-bold">{t.title}</h1>
                        <Button onClick={handlePrint}><Printer className="w-4 h-4 mr-2" /> {t.print}</Button>
                    </div>
                </div>
            )}

            <ReportLayout title={t.reportTitle} subtitle={`${empreendimento.nome_empreendimento} - ${unidade.unidade_empreendimento}`}>
                <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-8 text-base border-y-2 border-gray-200 py-4">
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-gray-500">{t.project}:</p>
                        <p className="font-medium text-gray-800">{empreendimento?.nome_empreendimento || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-gray-500">{t.unit}:</p>
                        <p className="font-medium text-gray-800">{unidade?.unidade_empreendimento || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-gray-500">{t.client}:</p>
                        <p className="font-medium text-gray-800">{unidade?.cliente_unidade || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-gray-500">{t.date}:</p>
                        <p className="font-medium text-gray-800">{new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="space-y-8">
                    {Object.entries(groupedRecords).length === 0 ? (
                        <p className="text-center py-8 text-gray-500">{t.noRecordsFoundOverall}</p>
                    ) : (
                        Object.entries(groupedRecords).map(([disciplina, records]) => (
                            <div key={disciplina} className="break-inside-avoid-page">
                                <h3 className="text-lg font-semibold text-gray-800 mb-3 pt-4 border-t-2 border-gray-200 mt-6 first:mt-0 first:border-t-0 first:pt-0">{disciplina}</h3>
                                <div className="space-y-4">
                                    {records.length > 0 ? records.map(registro => (
                                        <div key={registro.id} className="mb-4 pb-4 border-b last:border-b-0">
                                            <div className="flex justify-between items-start">
                                                <p className="font-semibold text-base mb-2 break-words whitespace-normal hyphens-auto">{registro.item_ap}</p>
                                                {getStatusBadge(registro.status)}
                                            </div>
                                            <p className="text-sm text-gray-700 break-words whitespace-normal hyphens-auto"><strong className="font-medium">Descrição:</strong> {registro.descricao_ap}</p>
                                            {registro.comentario_ap && <p className="text-sm text-gray-700 mt-1 break-words whitespace-normal hyphens-auto"><strong className="font-medium">Comentário:</strong> {registro.comentario_ap}</p>}
                                            {registro.replica_ap && <p className="text-sm text-gray-700 mt-1 break-words whitespace-normal hyphens-auto"><strong className="font-medium">Réplica:</strong> {registro.replica_ap}</p>}
                                            {registro.treplica_ap && <p className="text-sm text-gray-700 mt-1 break-words whitespace-normal hyphens-auto"><strong className="font-medium">Tréplica:</strong> {registro.treplica_ap}</p>}
                                            {registro.imagem_ap && (
                                                <div className="mt-2">
                                                    <strong className="font-medium text-sm">Imagem:</strong>
                                                    <img
                                                        src={registro.imagem_ap}
                                                        alt="Imagem do registro"
                                                        className="mt-2 rounded-lg max-w-xs border"
                                                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/placeholder-image.png"; }}
                                                    />
                                                    {registro.comentario_im_ap && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 italic break-words whitespace-normal hyphens-auto">{registro.comentario_im_ap}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )) : <p className="text-sm text-gray-500">{t.noRecords}</p>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ReportLayout>
        </div>
    );
}
