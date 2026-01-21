
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { DocumentosUnidade } from '@/api/entities';
import UnidadeHeader from '@/components/unidade/UnidadeHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Search } from 'lucide-react';
import NovoDocumentoDialog from '@/components/unidade/NovoDocumentoDialog';
import DocumentoCard from '@/components/unidade/DocumentoCard';
import { useUnidadeData } from '@/components/hooks/useUnidadeData';

const translations = {
  pt: {
    title: "Documentos da Unidade",
    newDocument: "Novo Documento",
    searchPlaceholder: "Buscar por nome ou tipo...",
    noDocuments: "Nenhum documento encontrado.",
    loadingUnitData: "Carregando dados da unidade...",
    errorLoadingUnit: "Erro ao carregar dados da unidade ou unidade não encontrada.",
    backToEnterprises: "Voltar para Empreendimentos",
    loadingDocuments: "Carregando documentos...",
  },
  en: {
    title: "Unit Documents",
    newDocument: "New Document",
    searchPlaceholder: "Search by name or type...",
    noDocuments: "No documents found.",
    loadingUnitData: "Loading unit data...",
    errorLoadingUnit: "Error loading unit data or unit not found.",
    backToEnterprises: "Back to Enterprises",
    loadingDocuments: "Loading documents...",
  },
};

export default function UnidadeDocumentos({ language = 'pt', theme = 'light' }) {
    const navigate = useNavigate();
    const urlParams = new URLSearchParams(window.location.search);
    const unidadeId = urlParams.get('id'); // Changed from 'unidadeId' to 'id'
    const empreendimentoId = urlParams.get('emp'); // Changed from 'empreendimentoId' to 'emp'

    // useUnidadeData now returns 'loading' and 'error' which are crucial for ID validation
    const { unidade, empreendimento, loading, error } = useUnidadeData(unidadeId, empreendimentoId);

    const [documentos, setDocumentos] = useState([]);
    const [loadingDocs, setLoadingDocs] = useState(true); // Renamed to avoid conflict with useUnidadeData's 'loading'
    const [searchTerm, setSearchTerm] = useState("");
    const [showNovoDialog, setShowNovoDialog] = useState(false); // Renamed for consistency

    const t = translations[language];
    const isDark = theme === 'dark';

    // Effect to handle errors from useUnidadeData (e.g., invalid IDs)
    useEffect(() => {
        if (error) {
            console.error("Redirecionando devido a erro:", error);
            // Redirect to a safe page, like the enterprises list
            navigate(createPageUrl('Empreendimentos'));
        }
    }, [error, navigate]);

    // Effect to fetch documents once unidadeId is available and unit data is loaded without error
    useEffect(() => {
        if (unidadeId && !loading && !error && unidade) {
            fetchDocumentos();
        }
    }, [unidadeId, loading, error, unidade]); // Added loading, error, and unidade as dependencies

    const fetchDocumentos = async () => {
        setLoadingDocs(true); // Use the new state variable
        try {
            const data = await DocumentosUnidade.filter({ id_unidade: unidadeId });
            setDocumentos(data);
        } catch (err) {
            console.error("Erro ao buscar documentos:", err);
        } finally {
            setLoadingDocs(false); // Use the new state variable
        }
    };

    const handleSuccess = () => {
        fetchDocumentos();
        setShowNovoDialog(false); // Use the new state variable
    };

    const handleDelete = async (docId) => {
        try {
            await DocumentosUnidade.delete(docId);
            fetchDocumentos();
        } catch (err) {
            console.error("Erro ao excluir documento:", err);
        }
    };

    const filteredDocumentos = documentos.filter(doc =>
        doc.nome_documento.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.tipo_documento.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getUnidadeStats = () => ({ total: documentos.length });

    // Render loading state for unit data
    if (loading) {
        return (
            <div className={`p-4 md:p-6 space-y-6 ${isDark ? 'bg-gray-900 text-gray-200' : 'text-gray-800'}`}>
                <p>{t.loadingUnitData}</p>
            </div>
        );
    }

    // Render error state if unit data could not be loaded (e.g., invalid ID, not found)
    if (error || !unidade) {
        return (
            <div className={`p-4 md:p-6 space-y-6 ${isDark ? 'bg-gray-900 text-gray-200' : 'text-gray-800'}`}>
                <p>{t.errorLoadingUnit}</p>
                <Button onClick={() => navigate(createPageUrl('Empreendimentos'))}>
                    {t.backToEnterprises}
                </Button>
            </div>
        );
    }

    return (
        <div className={`p-4 md:p-6 space-y-6 ${isDark ? 'bg-gray-900 text-gray-200' : 'bg-gray-50 text-gray-900'}`}>
            <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate(createPageUrl(`Unidade?id=${unidadeId}&emp=${empreendimentoId}`))}
                  className={`${isDark ? 'border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700' : ''}`}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>{t.title}</h1>
            </div>

            <UnidadeHeader
                unidade={unidade}
                empreendimento={empreendimento}
                stats={getUnidadeStats()}
                loading={loading} // This 'loading' refers to useUnidadeData's loading
                language={language}
                theme={theme}
            />

            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-1/3">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    <Input
                      placeholder={t.searchPlaceholder}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`pl-10 ${isDark ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder:text-gray-400 focus-visible:ring-offset-gray-900' : ''}`}
                    />
                </div>
                <Button onClick={() => setShowNovoDialog(true)} className={`${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}> {/* Use the new state variable */}
                    <Plus className="w-4 h-4 mr-2" />
                    {t.newDocument}
                </Button>
            </div>

            {loadingDocs ? ( // Use the new state variable for documents loading
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-700'}`}>{t.loadingDocuments}</p>
            ) : filteredDocumentos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredDocumentos.map(doc => (
                        <DocumentoCard key={doc.id} documento={doc} onDelete={handleDelete} isDark={isDark} />
                    ))}
                </div>
            ) : (
                <p className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t.noDocuments}</p>
            )}

            {unidade && ( // Ensure unidade data is available before rendering dialog
                <NovoDocumentoDialog
                    open={showNovoDialog} // Use the new state variable
                    onOpenChange={setShowNovoDialog} // Use the new state variable
                    unidade={unidade}
                    onSuccess={handleSuccess}
                    language={language}
                    theme={theme}
                />
            )}
        </div>
    );
}
