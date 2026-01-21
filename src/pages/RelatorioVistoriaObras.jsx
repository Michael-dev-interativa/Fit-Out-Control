
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useUnidadeData } from '@/components/hooks/useUnidadeData'; // New Import
import { RespostaVistoria } from "@/api/entities";
import { FormularioVistoria } from "@/api/entities";
import { User } from "@/api/entities"; // Importar User
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // New Imports: CardHeader, CardTitle
import { ArrowLeft, Printer, Loader2, FileText, CheckSquare, XSquare, ClipboardList, Info } from "lucide-react"; // New Imports: FileText, CheckSquare, XSquare, ClipboardList, Info
import { format } from 'date-fns'; // New Import

export default function RelatorioVistoriaObras({ language = 'pt', theme = 'light' }) {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);

  // Updated URL parameter retrieval based on outline
  const unidadeId = urlParams.get('unidadeId');
  const empreendimentoId = urlParams.get('empreendimentoId');
  // `respostasVistoriaIds` is an array. For this specific component, we will primarily display the first one.
  const respostasVistoriaIds = urlParams.get('respostasVistoriaIds')?.split(',');
  const targetRespostaId = respostasVistoriaIds && respostasVistoriaIds.length > 0 ? respostasVistoriaIds[0] : null;

  // State management
  const [loading, setLoading] = useState(true); // Overall loading
  const [loadingRespostas, setLoadingRespostas] = useState(true); // Specific loading for response data

  const [resposta, setResposta] = useState(null); // Singular response object
  const [formulario, setFormulario] = useState(null);

  // Renamed from `respostas` to `respostasDataMap` to avoid conflict with the plural `respostasVistoriaIds` logic
  // This state holds the key-value map of answers for the displayed single report
  const [respostasDataMap, setRespostasDataMap] = useState({});
  const [fotosPorSecao, setFotosPorSecao] = useState({});
  const [consultor, setConsultor] = useState(null); // State para o nome do consultor
  const printableAreaRef = useRef(null);

  // New hook for unit and development data
  const { unidade, empreendimento, loading: loadingUnidade, error: unidadeError } = useUnidadeData(unidadeId, empreendimentoId);

  // Handle errors from useUnidadeData and redirect
  useEffect(() => {
    if (unidadeError) {
      console.error("Redirecionando devido a erro na unidade/empreendimento:", unidadeError);
      navigate(createPageUrl('Empreendimentos'));
    }
  }, [unidadeError, navigate]);

  // Main effect to load report data
  useEffect(() => {
    const loadReportData = async () => {
      setLoading(true);
      setLoadingRespostas(true);
      try {
        if (!targetRespostaId) {
          console.error("Nenhum ID de resposta fornecido para o relatório.");
          setResposta(null); // Ensure no old data is shown
          return;
        }

        const respostaData = await RespostaVistoria.get(targetRespostaId);
        setResposta(respostaData);
        setRespostasDataMap(typeof respostaData.respostas === 'string' ? JSON.parse(respostaData.respostas) : (respostaData.respostas || {}));
        setFotosPorSecao(typeof respostaData.fotos_secoes === 'string' ? JSON.parse(respostaData.fotos_secoes) : (respostaData.fotos_secoes || {}));

        if (respostaData.id_formulario) {
          const formData = await FormularioVistoria.get(respostaData.id_formulario);
          setFormulario(formData);
        }

        // Consultor data
        if (respostaData.consultor_responsavel) {
          try {
            const users = await User.filter({ email: respostaData.consultor_responsavel });
            if (users.length > 0) {
              setConsultor(users[0]);
            }
          } catch (userError) {
            console.error("Erro ao buscar dados do consultor:", userError);
          }
        }

      } catch (error) {
        console.error("Erro ao carregar dados do relatório:", error);
        setResposta(null); // In case of fetch error, clear report data
      } finally {
        setLoading(false);
        setLoadingRespostas(false);
      }
    };

    // Only proceed to load report data if `unidade` and `empreendimento` data (from hook) are loaded,
    // and there's no error in that process, and we have a target `respostaId`.
    if (!loadingUnidade && !unidadeError) {
      loadReportData();
    }
  }, [loadingUnidade, unidadeError, targetRespostaId]); // Dependencies: Hook loading, hook error, and the derived targetRespostaId

  const handlePrint = () => {
    window.print();
  };

  // Combined loading state check
  if (loading || loadingUnidade || loadingRespostas) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  // Check if report data was loaded successfully
  if (!resposta) {
    return <div className="p-6 text-center">Relatório não encontrado ou IDs de contexto inválidos.</div>;
  }

  const generationDate = new Date().toLocaleDateString('pt-BR');

  return (
    <>
      {/* 1. Estilos de impressão para remover cabeçalho/rodapé do browser e evitar quebras */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1.5cm;
          }
          body * {
            visibility: hidden;
          }
          #printableArea, #printableArea * {
            visibility: visible;
          }
          #printableArea {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none;
          }
          .print-item-container {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
      
      <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="no-print flex justify-between items-center mb-6">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir / Salvar PDF
            </Button>
          </div>

          <Card id="printableArea" ref={printableAreaRef} className="shadow-lg">
            <CardContent className="p-8 md:p-12">
              <header className="mb-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-800">Relatório de Vistoria de Obras</h1>
                    <p className="text-gray-600">{resposta?.nome_vistoria}</p>
                  </div>
                  <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f1e898ee3_logo_Interativa_versao_final_sem_fundo_0002.png" alt="Logo Interativa" className="h-20"/>
                </div>
              </header>

              <section className="mb-8 p-4 border rounded-lg bg-gray-50">
                <h2 className="text-lg font-semibold mb-4 border-b pb-2">Informações Gerais</h2>
                {/* 4. Melhorar alinhamento das informações gerais */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <p><strong>Empreendimento:</strong> {empreendimento?.nome_empreendimento || 'N/A'}</p>
                  <p><strong>Unidade:</strong> {unidade?.unidade_empreendimento || 'N/A'}</p>
                  <p><strong>Cliente:</strong> {unidade?.cliente_unidade || 'N/A'}</p>
                  <p><strong>Data da Vistoria:</strong> {resposta ? new Date(resposta.data_vistoria).toLocaleDateString('pt-BR') : 'N/A'}</p>
                  {/* 5. Mostrar nome do consultor */}
                  <p><strong>Consultor Responsável:</strong> {consultor?.full_name || resposta?.consultor_responsavel || 'N/A'}</p>
                  <p><strong>Participantes:</strong> {resposta?.participantes || 'N/A'}</p>
                   {/* 3. Adicionar data de geração do PDF */}
                  <p><strong>Data de Geração do Relatório:</strong> {generationDate}</p>
                </div>
              </section>

              <main>
                {formulario?.secoes?.map((secao, secaoIndex) => {
                  // Verifica se a seção tem alguma pergunta respondida antes de renderizar
                  const hasAnsweredQuestions = secao.perguntas.some((_, perguntaIndex) => 
                    respostasDataMap[`secao_${secaoIndex}_pergunta_${perguntaIndex}`]
                  );

                  if (!hasAnsweredQuestions) {
                    return null;
                  }

                  return (
                    <section key={secaoIndex} className="mb-8">
                      <h3 className="text-xl font-bold bg-gray-100 p-3 rounded-t-lg border-b-2 border-blue-600">{secao.nome_secao}</h3>
                      <div className="border border-t-0 p-4 rounded-b-lg">
                        {secao.perguntas.map((pergunta, perguntaIndex) => {
                          const respostaKey = `secao_${secaoIndex}_pergunta_${perguntaIndex}`;
                          const respostaValor = respostasDataMap[respostaKey]; // Use respostasDataMap
                          const comentarioKey = `${respostaKey}_comentario`;
                          const comentarioValor = respostasDataMap[comentarioKey]; // Use respostasDataMap
                          const fotosDaPergunta = (fotosPorSecao[secao.nome_secao] || []).filter(foto => foto.perguntaKey === respostaKey);
                          
                          // 7. Não é necessário aparecer os itens que não foram respondidos
                          if (!respostaValor) {
                            return null;
                          }

                          return (
                            // 6. "Caixa" de cada item em uma única folha
                            <div key={perguntaIndex} className="print-item-container mb-6 pb-6 border-b last:border-b-0">
                              <p className="font-semibold text-gray-800">{pergunta.pergunta}</p>
                              <p className="mt-1 text-blue-700 font-medium bg-blue-50 p-2 rounded-md inline-block">Resposta: {respostaValor}</p>
                              {comentarioValor && (
                                <div className="mt-2 text-sm text-gray-700">
                                  <p className="font-semibold">Comentários:</p>
                                  <p className="p-2 bg-gray-50 rounded-md whitespace-pre-wrap">{comentarioValor}</p>
                                </div>
                              )}

                              {fotosDaPergunta.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-4"> {/* Added flex wrap to align images */}
                                  {fotosDaPergunta.map((foto, fotoIndex) => (
                                    <div key={fotoIndex} className="inline-block max-w-[200px] sm:max-w-[250px] md:max-w-[300px]"> {/* Adjusted max-width for images */}
                                      <img src={foto.url} alt={`Foto ${perguntaIndex + 1}-${fotoIndex + 1}`} className="w-full h-auto rounded-lg border shadow-sm" />
                                       {/* 8. Remover o nome da imagem e deixar apenas a legenda */}
                                      {foto.comentario && (
                                        <p className="mt-1 text-xs italic text-gray-600 p-1 bg-gray-100 rounded-b-lg text-center">
                                          {foto.comentario}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
                 {resposta.observacoes_gerais && (
                    <section className="mt-8">
                        <h3 className="text-lg font-semibold mb-2">Observações Gerais</h3>
                        <p className="p-4 border rounded-lg bg-gray-50 whitespace-pre-wrap">{resposta.observacoes_gerais}</p>
                    </section>
                )}
              </main>

              <footer className="mt-12 pt-4 text-center text-xs text-gray-400 border-t">
                Relatório gerado pelo sistema FitOut Control - Interativa Engenharia
                {/* 2. Remover "Modelo v02" */}
              </footer>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
