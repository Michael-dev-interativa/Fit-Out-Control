
import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { KO_unidade } from '@/api/entities';
import { UnidadeEmpreendimento } from '@/api/entities';
import { Empreendimento } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Printer } from 'lucide-react';
import { format } from 'date-fns';

export default function RelatorioKickOff() {
    const navigate = useNavigate();
    const [registros, setRegistros] = useState([]);
    const [unidade, setUnidade] = useState(null);
    const [empreendimento, setEmpreendimento] = useState(null);
    const [loading, setLoading] = useState(true);

    const urlParams = new URLSearchParams(window.location.search);
    const unidadeId = urlParams.get('unidade');
    const empreendimentoId = urlParams.get('emp');
    const registroIdsString = urlParams.get('ids'); // Storing the raw string to parse later

    useEffect(() => {
        if (unidadeId && empreendimentoId && registroIdsString) { // Check if the string exists
            loadData();
        }
    }, [unidadeId, empreendimentoId, registroIdsString]); // Dependency updated to registroIdsString

    const loadData = async () => {
        setLoading(true);
        try {
            const registroIds = registroIdsString?.split(','); // Split here inside the function
            const registroId = registroIds && registroIds.length > 0 ? registroIds[0] : null;
            if (!registroId) {
                throw new Error("Nenhum ID de registro de Kick-Off foi fornecido.");
            }

            // Fazer chamadas sequenciais para evitar rate limit
            const unidadeData = await UnidadeEmpreendimento.filter({ id: unidadeId });
            
            // Delay aumentado para 500ms
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const empreendimentoData = await Empreendimento.filter({ id: empreendimentoId });
            
            // Delay aumentado para 500ms
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const registrosData = await KO_unidade.filter({ id: registroId });

            setUnidade(unidadeData[0]);
            setEmpreendimento(empreendimentoData[0]);
            setRegistros(registrosData);
        } catch (error) {
            console.error("Erro ao carregar dados do relatório:", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        const registroIds = registroIdsString?.split(','); // Split here as well for handlePrint
        navigate(createPageUrl(`VisualizarRelatorioKickOff?unidade=${unidadeId}&emp=${empreendimentoId}&ids=${registroIds.join(',')}`));
    };

    if (loading) {
        return <div className="p-6">Carregando dados do relatório...</div>;
    }

    if (!registros.length || !unidade || !empreendimento) {
        return <div className="p-6">Não foi possível carregar os dados para o relatório.</div>;
    }
    
    // Usamos o primeiro (e único) registro para preencher a ATA
    const registro = registros[0];

    const ReportField = ({ label, value }) => (
        <div className="flex border-b">
            <div className="w-1/3 bg-gray-100 p-2 font-semibold border-r">{label}</div>
            <div className="w-2/3 p-2">{value || '-'}</div>
        </div>
    );
    
    const ReportTextArea = ({ label, value }) => (
         <div className="flex border-b">
            <div className="w-1/3 bg-gray-100 p-2 font-semibold border-r">{label}</div>
            <div className="w-2/3 p-2 whitespace-pre-wrap">{value || '-'}</div>
        </div>
    );

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <Button variant="outline" onClick={() => navigate(createPageUrl(`UnidadeKickOff?unidade=${unidadeId}&emp=${empreendimentoId}`))}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar
                    </Button>
                    <h1 className="text-2xl font-bold">Relatório de Kick-Off</h1>
                    <Button onClick={handlePrint}>
                        <Printer className="w-4 h-4 mr-2" />
                        Visualizar para Impressão
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>ATA - REUNIÃO / FIT-OUT</CardTitle>
                                <p className="text-gray-500">
                                    Reunião de Kick-Off | {unidade.unidade_empreendimento}
                                </p>
                            </div>
                            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f1e898ee2_logo_Interativa_versao_final_sem_fundo_0001.png" alt="Logo Interativa" className="h-16" />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div className="border rounded-lg overflow-hidden">
                            <ReportField label="Data e Hora" value={`${format(new Date(registro.data_reuniao), 'dd/MM/yyyy')} às ${registro.hora_reuniao}`} />
                            <ReportField label="Participantes (Interativa)" value={registro.participantes_interativa} />
                            <ReportField label="Participantes (Condomínio)" value={registro.participantes_condominio} />
                            <ReportField label="Participantes (Locatário)" value={registro.participantes_locatario} />
                        </div>
                        
                        <div className="border rounded-lg overflow-hidden">
                            <ReportField label="OS" value={registro.os_numero} />
                            <ReportField label="Gerenciadora" value={registro.empreendimento_gerenciadora} />
                            <ReportField label="Empreendimento/Torre/Pavimento/Conjunto" value={registro.torre_pavimento_conjunto} />
                            <ReportField label="Metros Quadrados" value={registro.metros_quadrados} />
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                            <ReportTextArea label="Escopo dos Serviços (Interativa)" value={registro.escopo_servicos_interativa} />
                            <ReportTextArea label="Escopo dos Serviços (Locatário)" value={registro.escopo_servicos_locatario} />
                        </div>
                        
                        <div className="border rounded-lg overflow-hidden">
                            <ReportField label="Envio dos projetos" value={registro.data_envio_projetos ? format(new Date(registro.data_envio_projetos), 'dd/MM/yyyy') : '-'} />
                            <ReportField label="Início das atividades em campo" value={registro.data_inicio_atividades ? format(new Date(registro.data_inicio_atividades), 'dd/MM/yyyy') : '-'} />
                            <ReportField label="Previsão de ocupação" value={registro.data_previsao_ocupacao ? format(new Date(registro.data_previsao_ocupacao), 'dd/MM/yyyy') : '-'} />
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                            <ReportTextArea label="Particularidades" value={registro.particularidades} />
                            <ReportTextArea label="Outras Informações" value={registro.outras_informacoes} />
                        </div>

                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
