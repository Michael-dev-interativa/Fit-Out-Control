import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Empreendimento } from '@/api/entities';
import { InspecaoSprinklers } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, ArrowLeft, Trash2, Pencil, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const t = {
    title: "Inspeção de Sprinklers",
    loading: "Carregando inspeções...",
    add: "Nova Inspeção",
    noRecords: "Nenhuma inspeção encontrada.",
    back: "Voltar ao Empreendimento",
    delete: "Excluir",
    edit: "Editar",
    view: "Visualizar",
    confirmDeleteTitle: "Confirmar Exclusão",
    confirmDeleteMsg: "Tem certeza de que deseja excluir esta inspeção? Esta ação não pode ser desfeita.",
    cancel: "Cancelar",
    date: "Data",
    client: "Cliente",
    revision: "Revisão",
};

export default function EmpreendimentoInspecaoSprinklers({ language: initialLanguage, theme: initialTheme }) {
    const navigate = useNavigate();
    const location = useLocation();
    const urlParams = new URLSearchParams(location.search);
    const empreendimentoId = urlParams.get('empreendimentoId');
    
    const [empreendimento, setEmpreendimento] = useState(null);
    const [inspecoes, setInspecoes] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [theme, setTheme] = useState(initialTheme || 'light');
    
    const isDark = theme === 'dark';

    const loadData = async () => {
        if (!empreendimentoId) return;
        setLoadingData(true);
        try {
            const [empreendimentoData, inspecoesData] = await Promise.all([
                Empreendimento.get(empreendimentoId),
                InspecaoSprinklers.filter({ id_empreendimento: empreendimentoId }, "-data_inspecao")
            ]);
            setEmpreendimento(empreendimentoData);
            setInspecoes(inspecoesData);
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
            await InspecaoSprinklers.delete(id);
            loadData();
        } catch (error) {
            console.error("Failed to delete report:", error);
        }
    };

    if (loadingData) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className={`p-6 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.title}</h1>
                    <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>{empreendimento?.nome_empreendimento}</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => navigate(createPageUrl(`Empreendimento?empreendimentoId=${empreendimentoId}`))}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {t.back}
                    </Button>
                    <Button onClick={() => navigate(createPageUrl(`NovaInspecaoSprinklers?empreendimentoId=${empreendimentoId}`))}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t.add}
                    </Button>
                </div>
            </div>
            
            {loadingData ? (
                <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : inspecoes.length === 0 ? (
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t.noRecords}</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {inspecoes.map((inspecao) => (
                        <Card key={inspecao.id} className={isDark ? 'bg-gray-800' : ''}>
                            <CardHeader>
                                <CardTitle className={`flex justify-between items-center ${isDark ? 'text-white' : ''}`}>
                                  {inspecao.titulo_relatorio || 'Inspeção sem título'}
                                </CardTitle>
                                <p className="text-sm text-gray-500">{t.date}: {format(new Date(inspecao.data_inspecao), "PPP", { locale: ptBR })}</p>
                            </CardHeader>
                            <CardContent>
                                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t.client}: {inspecao.cliente}</p>
                                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t.revision}: {inspecao.revisao || '-'}</p>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2">
                                <div className="flex items-center gap-2">
                                    <Link to={createPageUrl(`VisualizarInspecaoSprinklers?relatorioId=${inspecao.id}`)}>
                                        <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                                    </Link>
                                    <Link to={createPageUrl(`EditarInspecaoSprinklers?inspecaoId=${inspecao.id}`)}>
                                        <Button variant="ghost" size="icon"><Pencil className="w-4 h-4" /></Button>
                                    </Link>
                                </div>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="icon">
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className={isDark ? 'bg-gray-800 text-white' : ''}>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>{t.confirmDeleteTitle}</AlertDialogTitle>
                                            <AlertDialogDescription>{t.confirmDeleteMsg}</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(inspecao.id)}>{t.delete}</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}