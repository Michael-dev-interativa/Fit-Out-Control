
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { RelatorioSemanal } from '@/api/entities';
import { Empreendimento } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, ArrowLeft, Eye, Edit, Trash2, CalendarClock, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const translations = {
  pt: {
    title: "Relatórios Semanais",
    back: "Voltar para o Empreendimento",
    newReport: "Novo Relatório Semanal",
    loading: "Carregando relatórios...",
    noReports: "Nenhum relatório semanal encontrado.",
    weekOf: "Semana de",
    to: "a",
    reportNumber: "Nº do Relatório",
    creationDate: "Data de Criação",
    actions: "Ações",
    deleteConfirm: "Tem certeza que deseja excluir este relatório?",
    instructions: "Instruções",
    instructionsTitle: "Instruções para Relatórios Semanais",
  },
};

export default function EmpreendimentoRelatoriosSemanais() {
    const navigate = useNavigate();
    const location = useLocation();
    const urlParams = new URLSearchParams(location.search);
    const empreendimentoId = urlParams.get('empreendimentoId');
    
    const [empreendimento, setEmpreendimento] = useState(null);
    const [relatorios, setRelatorios] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const t = translations.pt;

    useEffect(() => {
        if (!empreendimentoId) {
            toast.error("ID do empreendimento não encontrado.");
            navigate(createPageUrl('Empreendimentos')); 
            return;
        }

        const loadData = async () => {
            setLoading(true);
            try {
                const [empData, relatoriosData] = await Promise.all([
                    Empreendimento.get(empreendimentoId),
                    RelatorioSemanal.filter({ id_empreendimento: empreendimentoId }, "-created_date")
                ]);
                setEmpreendimento(empData);
                setRelatorios(relatoriosData);
            } catch (error) {
                console.error("Erro ao carregar dados:", error);
                toast.error("Falha ao carregar dados.");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [empreendimentoId, navigate]);

    const handleDelete = async (id) => {
        if (window.confirm(t.deleteConfirm)) {
            try {
                await RelatorioSemanal.delete(id);
                setRelatorios(relatorios.filter(r => r.id !== id));
                toast.success("Relatório excluído com sucesso.");
            } catch (error) {
                console.error("Erro ao excluir relatório:", error);
                toast.error("Falha ao excluir relatório.");
            }
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarClock/> {t.title}</h1>
                    <p className="text-gray-500">{empreendimento?.nome_empreendimento}</p>
                </div>
                <Button variant="outline" onClick={() => navigate(createPageUrl(`Empreendimento?empreendimentoId=${empreendimentoId}`))}>
                    <ArrowLeft className="w-4 h-4 mr-2"/>
                    {t.back}
                </Button>
            </div>

            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle>{`${relatorios.length} relatório(s) encontrado(s)`}</CardTitle>
                    <div className="flex items-center gap-2">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline">
                                    <HelpCircle className="w-4 h-4 mr-2" />
                                    {t.instructions}
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{t.instructionsTitle}</DialogTitle>
                                    <DialogDescription as="div" className="prose-sm max-w-none pt-4 text-sm text-gray-600">
                                        <p>Esta seção permite gerenciar todos os relatórios semanais de evolução da obra.</p>
                                        <ul className="list-disc pl-5 space-y-2 mt-4">
                                            <li><strong>Novo Relatório:</strong> Clique em "{t.newReport}" para iniciar o preenchimento de um novo relatório para a semana.</li>
                                            <li><strong>Visualizar:</strong> Use o ícone de olho (<Eye className="inline w-4 h-4 align-middle"/>) para gerar e visualizar o PDF do relatório.</li>
                                            <li><strong>Editar:</strong> Use o ícone de lápis (<Edit className="inline w-4 h-4 align-middle"/>) para corrigir ou atualizar informações de um relatório já salvo.</li>
                                            <li><strong>Excluir:</strong> Use o ícone de lixeira (<Trash2 className="inline w-4 h-4 align-middle"/>) para remover um relatório. <strong>Atenção:</strong> esta ação não pode ser desfeita.</li>
                                        </ul>
                                        <p className="mt-4">O objetivo é manter um registro claro e consistente do progresso da obra a cada semana.</p>
                                    </DialogDescription>
                                </DialogHeader>
                            </DialogContent>
                        </Dialog>
                        <Button onClick={() => navigate(createPageUrl(`NovoRelatorioSemanal?empreendimentoId=${empreendimentoId}`))}>
                            <Plus className="w-4 h-4 mr-2"/>
                            {t.newReport}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {relatorios.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t.weekOf}</TableHead>
                                    <TableHead className="text-center">{t.reportNumber}</TableHead>
                                    <TableHead className="text-center">{t.creationDate}</TableHead>
                                    <TableHead className="text-right">{t.actions}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {relatorios.map(relatorio => (
                                    <TableRow key={relatorio.id}>
                                        <TableCell>
                                            {format(new Date(relatorio.data_inicio_semana), 'dd/MM/yyyy')} {t.to} {format(new Date(relatorio.data_fim_semana), 'dd/MM/yyyy')}
                                        </TableCell>
                                        <TableCell className="text-center">{relatorio.numero_relatorio || '-'}</TableCell>
                                        <TableCell className="text-center">{format(new Date(relatorio.created_date), 'dd/MM/yyyy HH:mm')}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="icon" title="Visualizar" onClick={() => navigate(createPageUrl(`VisualizarRelatorioSemanal?relatorioId=${relatorio.id}&empreendimentoId=${empreendimentoId}`))}>
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Button variant="outline" size="icon" title="Editar" onClick={() => navigate(createPageUrl(`EditarRelatorioSemanal?relatorioId=${relatorio.id}&empreendimentoId=${empreendimentoId}`))}>
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button variant="destructive" size="icon" title="Excluir" onClick={() => handleDelete(relatorio.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            {t.noReports}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
