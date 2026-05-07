import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Empreendimento, VistoriaTecnica } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, ArrowLeft, Trash2, Pencil, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '../lib/dateUtils';

const t = {
    title: "Vistoria Técnica",
    loading: "Carregando vistorias...",
    add: "Nova Vistoria Técnica",
    noRecords: "Nenhuma vistoria técnica encontrada.",
    back: "Voltar ao Empreendimento",
    delete: "Excluir",
    edit: "Editar",
    view: "Visualizar",
    confirmDeleteTitle: "Confirmar Exclusão",
    confirmDeleteMsg: "Tem certeza de que deseja excluir esta vistoria? Esta ação não pode ser desfeita.",
    cancel: "Cancelar",
    date: "Data",
    client: "Cliente",
    revision: "Revisão",
};

export default function EmpreendimentoVistoriaTecnica({ language: initialLanguage, theme: initialTheme }) {
    const navigate = useNavigate();
    const location = useLocation();
    const urlParams = new URLSearchParams(location.search);
    const empreendimentoId = urlParams.get('empreendimentoId');

    const [empreendimento, setEmpreendimento] = useState(null);
    const [vistorias, setVistorias] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [theme, setTheme] = useState(initialTheme || 'light');

    const isDark = theme === 'dark';

    const loadData = async () => {
        if (!empreendimentoId) return;
        setLoadingData(true);
        try {
            const [empreendimentoData, vistoriasData] = await Promise.all([
                Empreendimento.get(empreendimentoId),
                VistoriaTecnica.filter({ id_empreendimento: empreendimentoId }, "-data_vistoria")
            ]);
            setEmpreendimento(empreendimentoData);
            setVistorias(Array.isArray(vistoriasData) ? vistoriasData : []);
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [empreendimentoId]);

    const handleDelete = async (id) => {
        try {
            await VistoriaTecnica.delete(id);
            loadData();
        } catch (error) {
            console.error("Erro ao excluir vistoria:", error);
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
                    <Button variant="outline" onClick={() => navigate(createPageUrl(`Empreendimento?empreendimentoId=${empreendimentoId}`))}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {t.back}
                    </Button>
                    <Button onClick={() => navigate(createPageUrl(`NovaVistoriaTecnica?empreendimentoId=${empreendimentoId}`))}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t.add}
                    </Button>
                </div>
            </div>

            {loadingData ? (
                <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : vistorias.length === 0 ? (
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t.noRecords}</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {vistorias.map((vistoria) => (
                        <Card key={vistoria.id} className={isDark ? 'bg-gray-800' : ''}>
                            <CardHeader>
                                <CardTitle className={`${isDark ? 'text-white' : ''}`}>
                                    {vistoria.titulo_relatorio || 'Vistoria sem título'}
                                </CardTitle>
                                <p className="text-sm text-gray-500">
                                    {t.date}: {vistoria.data_vistoria ? format(parseLocalDate(vistoria.data_vistoria), "PPP", { locale: ptBR }) : '-'}
                                </p>
                            </CardHeader>
                            <CardContent>
                                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t.client}: {vistoria.cliente || '-'}</p>
                                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t.revision}: {vistoria.revisao || '-'}</p>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2">
                                <div className="flex items-center gap-2">
                                    <Link to={createPageUrl(`VisualizarVistoriaTecnica?vistoriaId=${vistoria.id}&empreendimentoId=${empreendimentoId}`)}>
                                        <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                                    </Link>
                                    <Link to={createPageUrl(`EditarVistoriaTecnica?vistoriaId=${vistoria.id}&empreendimentoId=${empreendimentoId}`)}>
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
                                            <AlertDialogAction onClick={() => handleDelete(vistoria.id)}>{t.delete}</AlertDialogAction>
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