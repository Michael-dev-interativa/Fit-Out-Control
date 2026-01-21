import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Empreendimento } from '@/api/entities';
import { AprovacaoAmostra } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, FileText, ArrowLeft, Trash2, Edit, Building, Beaker } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const translations = {
  pt: {
    title: "Aprovação de Amostras",
    loading: "Carregando amostras...",
    newReport: "Nova Aprovação",
    noReports: "Nenhuma aprovação de amostra encontrada.",
    addFirst: "Crie a primeira aprovação para este empreendimento.",
    backToProject: "Voltar ao Empreendimento",
    delete: "Excluir",
    edit: "Editar",
    view: "Visualizar",
    confirmDeleteTitle: "Confirmar Exclusão",
    confirmDeleteMsg: "Tem certeza de que deseja excluir este registro de aprovação? Esta ação não pode ser desfeita.",
    cancel: "Cancelar",
  },
};

export default function EmpreendimentoAmostras({ language: initialLanguage, theme: initialTheme }) {
    const navigate = useNavigate();
    const location = useLocation();
    const urlParams = new URLSearchParams(location.search);
    const empreendimentoId = urlParams.get('empreendimentoId');
    
    const [empreendimento, setEmpreendimento] = useState(null);
    const [aprovacoes, setAprovacoes] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [language, setLanguage] = useState(initialLanguage || 'pt');
    const [theme, setTheme] = useState(initialTheme || 'light');
    
    const t = translations[language];
    const isDark = theme === 'dark';

    const loadData = async () => {
        if (!empreendimentoId) return;
        setLoadingData(true);
        try {
            const [empreendimentoData, aprovacoesData] = await Promise.all([
                Empreendimento.get(empreendimentoId),
                AprovacaoAmostra.filter({ id_empreendimento: empreendimentoId }, "-data_relatorio")
            ]);
            setEmpreendimento(empreendimentoData);
            setAprovacoes(aprovacoesData);
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [empreendimentoId]);
    
    const handleDelete = async (id) => {
        try {
            await AprovacaoAmostra.delete(id);
            loadData();
        } catch (error) {
            console.error("Failed to delete report:", error);
        }
    };

    if (loadingData) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className={`p-4 md:p-6 space-y-6 ${isDark ? 'bg-gray-900 text-white' : ''}`}>
            {empreendimento && (
                 <Card className={isDark ? 'bg-gray-800' : ''}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Building className="w-6 h-6" /> {empreendimento.nome_empreendimento}
                        </CardTitle>
                    </CardHeader>
                 </Card>
            )}
            
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">{t.title}</h2>
                <Link to={createPageUrl(`NovaAprovacaoAmostra?empreendimentoId=${empreendimentoId}`)}>
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        {t.newReport}
                    </Button>
                </Link>
            </div>

            {aprovacoes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {aprovacoes.map(aprovacao => (
                        <Card key={aprovacao.id} className={`shadow-md ${isDark ? 'bg-gray-800' : ''}`}>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <Beaker className="w-5 h-5" /> {aprovacao.assunto_amostra || 'Amostra sem assunto'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-gray-400">{aprovacao.cliente}</p>
                                <p className="text-sm text-gray-500">{format(new Date(aprovacao.data_relatorio), "PPP", { locale: ptBR })}</p>
                                <div className="flex justify-between items-center gap-2">
                                     <Link to={createPageUrl(`VisualizarAprovacaoAmostra?relatorioId=${aprovacao.id}`)} className="flex-1">
                                        <Button variant="outline" className="w-full">{t.view}</Button>
                                     </Link>
                                     <Link to={createPageUrl(`EditarAprovacaoAmostra?relatorioId=${aprovacao.id}&empreendimentoId=${empreendimentoId}`)}>
                                        <Button variant="outline" size="icon"><Edit className="w-4 h-4" /></Button>
                                     </Link>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="icon"><Trash2 className="w-4 h-4" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>{t.confirmDeleteTitle}</AlertDialogTitle>
                                                <AlertDialogDescription>{t.confirmDeleteMsg}</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(aprovacao.id)}>{t.delete}</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium">{t.noReports}</h3>
                    <p className="mt-1 text-sm text-gray-500">{t.addFirst}</p>
                </div>
            )}
             <div className="mt-6">
                <Button variant="outline" onClick={() => navigate(createPageUrl(`Empreendimento?empreendimentoId=${empreendimentoId}`))}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t.backToProject}
                </Button>
            </div>
        </div>
    );
}