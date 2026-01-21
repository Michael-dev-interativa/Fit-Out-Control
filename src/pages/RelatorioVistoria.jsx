
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { RespostaVistoria } from '@/api/entities';
import { FormularioVistoria } from '@/api/entities';
import { UnidadeEmpreendimento } from '@/api/entities';
import { Empreendimento } from '@/api/entities';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Download, FileText, Eye, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUnidadeData } from '@/components/hooks/useUnidadeData';

const translations = {
  pt: {
    title: "Relatórios de Vistoria",
    subtitle: "Gere relatórios das vistorias realizadas",
    selectInspection: "Selecione uma vistoria:",
    noInspections: "Nenhuma vistoria encontrada para esta unidade.",
    generatePDF: "Gerar PDF",
    viewReport: "Visualizar Relatório",
    inspectionDate: "Data da Vistoria",
    consultant: "Consultor Responsável",
    status: "Status",
    participants: "Participantes",
    generalObservations: "Observações Gerais",
    score: "Pontuação",
    loading: "Carregando...",
    generating: "Gerando PDF..."
  },
  en: {
    title: "Inspection Reports",
    subtitle: "Generate reports from completed inspections",
    selectInspection: "Select an inspection:",
    noInspections: "No inspections found for this unit.",
    generatePDF: "Generate PDF",
    viewReport: "View Report",
    inspectionDate: "Inspection Date",
    consultant: "Responsible Consultant",
    status: "Status",
    participants: "Participants",
    generalObservations: "General Observations",
    score: "Score",
    loading: "Loading...",
    generating: "Generating PDF..."
  }
};

export default function RelatorioVistoria({ language = 'pt', theme = 'light' }) {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const unidadeId = urlParams.get('unidadeId');
  const empreendimentoId = urlParams.get('empreendimentoId');

  // Use the new hook for initial data loading and error handling for unidade and empreendimento
  const { unidade, empreendimento, loading: hookLoading, error } = useUnidadeData(unidadeId, empreendimentoId);

  const [respostasVistoria, setRespostasVistoria] = useState([]);
  const [selectedResposta, setSelectedResposta] = useState(null); // Kept as single object based on component usage
  const [localLoading, setLocalLoading] = useState(true); // Tracks loading specifically for inspection responses
  const [generating, setGenerating] = useState(false);

  const t = translations[language];
  const isDark = theme === 'dark';

  // Combined loading state for the UI, considering both hook data and local responses
  const isLoading = hookLoading || localLoading;

  // Effect to handle redirection if an error occurs during initial data fetch (e.g., invalid ID)
  useEffect(() => {
    if (error) {
      console.error("Redirecionando devido a erro:", error.message || error);
      navigate(createPageUrl('Empreendimentos'));
    }
  }, [error, navigate]);

  // Effect to load inspection responses once unit and enterprise data (from hook) are loaded and valid
  useEffect(() => {
    // Only proceed if hook data has finished loading, no error, and we have a valid unidadeId
    if (!hookLoading && !error && unidadeId) {
      loadResponses();
    }
  }, [hookLoading, error, unidadeId]); // Dependencies adjusted

  const loadResponses = async () => {
    setLocalLoading(true);
    try {
      // Only fetch RespostaVistoria, unit and enterprise data are handled by useUnidadeData hook
      const respostasData = await RespostaVistoria.filter({ id_unidade: unidadeId }, "-created_date");
      setRespostasVistoria(respostasData);
    } catch (error) {
      console.error("Erro ao carregar respostas de vistoria:", error);
    }
    setLocalLoading(false);
  };

  const handleSelectResposta = async (respostaId) => {
    const resposta = respostasVistoria.find(r => r.id === respostaId);
    setSelectedResposta(resposta);
  };

  const generateReportHTML = async (resposta) => {
    try {
      // Fetch the specific form related to the selected inspection response
      const fetchFormulario = resposta?.id_formulario ? FormularioVistoria.get(resposta.id_formulario) : Promise.resolve(null);

      const [formulario] = await Promise.all([
        fetchFormulario
      ]);

      // Use the 'unidade' and 'empreendimento' from the component's state (populated by useUnidadeData)
      // This ensures the report reflects the unit/enterprise data tied to the current page context.
      const unidadeResposta = unidade;
      const empreendimentoResposta = empreendimento;

      let consultorNome = resposta.consultor_responsavel || 'N/A';
      if (resposta.consultor_responsavel) {
          try {
              const users = await User.filter({ email: resposta.consultor_responsavel });
              if (users.length > 0) {
                  consultorNome = users[0].full_name;
              }
          } catch(e) { console.error("Não foi possível buscar o usuário", e); }
      }
      
      const getAnswerClass = (status) => {
        if (!status) return 'answer-none';
        const classMap = {
            'Pendente': "answer-pending",
            'Em andamento': "answer-progress",
            'Válido': "answer-valid",
            'Informativo': "answer-info"
        };
        return classMap[status] || 'answer-none';
      };

      let sectionsHTML = '';
      const respostasProcessadas = typeof resposta.respostas === 'string' ? JSON.parse(resposta.respostas) : (resposta.respostas || {});
      const fotosSecoes = typeof resposta.fotos_secoes === 'string' ? JSON.parse(resposta.fotos_secoes) : (resposta.fotos_secoes || {});
      
      if (formulario && formulario.secoes) {
        formulario.secoes.forEach((secao) => {
          let secaoItemsHTML = '';
          
          secao.perguntas.forEach((pergunta, perguntaIndex) => {
            const chave = `secao_${formulario.secoes.indexOf(secao)}_pergunta_${perguntaIndex}`;
            const respostaItem = respostasProcessadas[chave];
            const chaveImagem = `${chave}_imagem`;
            const imagensPergunta = fotosSecoes[chaveImagem] || [];
            
            if (respostaItem && respostaItem.resposta) {
              const answerClass = getAnswerClass(respostaItem.resposta);
              secaoItemsHTML += `
                <div class="question-item">
                  <div class="question-text">${pergunta.pergunta}</div>
                  <div class="question-answer ${answerClass}">${respostaItem.resposta}</div>
                </div>
              `;

              // Adicionar imagens específicas da pergunta
              if (imagensPergunta.length > 0) {
                secaoItemsHTML += `
                  <div class="question-photos">
                    <div class="photos-grid">
                      ${imagensPergunta.map((img, index) => `
                        <div class="photo-item">
                          <img src="${img.url}" alt="Foto ${index + 1} - ${pergunta.pergunta}" />
                          <div class="photo-caption">${img.legenda || 'Sem legenda'}</div>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                `;
              }
            }
          });
          
          // Fotos gerais da seção (mantido para compatibilidade)
          const chaveSecao = `secao_${formulario.secoes.indexOf(secao)}`;
          const fotosSecao = fotosSecoes[chaveSecao];
          
          if (fotosSecao && fotosSecao.length > 0) {
            secaoItemsHTML += `
              <div class="photos-section">
                <strong class="photos-title">Registro Fotográfico Geral - ${secao.nome_secao}:</strong>
                <div class="photos-grid">
                  ${fotosSecao.map((foto, index) => `
                    <div class="photo-item">
                      <img src="${foto.url}" alt="Foto ${index + 1}" />
                      <div class="photo-caption">${foto.legenda || ''}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          }

          if (secaoItemsHTML) {
            sectionsHTML += `
              <div class="section-container">
                <div class="section-header">${secao.nome_secao.toUpperCase()}</div>
                ${secaoItemsHTML}
              </div>
            `;
          }
        });
      }

      const dataVistoriaFormatada = resposta.created_date ? format(new Date(resposta.created_date), "dd/MM/yyyy") : 'N/A';

      return `
        <div class="section-container">
          <div class="section-header">1. INFORMAÇÕES GERAIS</div>
          <div class="section-content">
            <div class="info-item">
              <strong>Empreendimento:</strong> ${empreendimentoResposta?.nome_empreendimento || 'N/A'}
            </div>
            <div class="info-item">
              <strong>Endereço:</strong> ${empreendimentoResposta?.endereco_empreendimento || 'N/A'}
            </div>
            <div class="info-item">
              <strong>Unidade:</strong> ${unidadeResposta?.unidade_empreendimento || 'N/A'}
            </div>
            <div class="info-item">
              <strong>Locatário:</strong> ${unidadeResposta?.cliente_unidade || 'N/A'}
            </div>
            <div class="info-item">
              <strong>Data da Vistoria:</strong> ${dataVistoriaFormatada}
            </div>
            <div class="info-item">
              <strong>Hora da Vistoria:</strong> ${resposta.hora_vistoria || 'N/A'}
            </div>
            <div class="info-item">
              <strong>Tipo de Vistoria:</strong> ${resposta.nome_vistoria || 'N/A'}
            </div>
            <div class="info-item">
              <strong>Consultor Responsável:</strong> ${consultorNome}
            </div>
          </div>
        </div>

        ${sectionsHTML}

        ${resposta.observacoes_gerais ? `
          <div class="section-container">
            <div class="section-header">OBSERVAÇÕES GERAIS</div>
            <div class="section-content">
              <p>${resposta.observacoes_gerais.replace(/\n/g, '<br>')}</p>
            </div>
          </div>
        ` : ''}

        <div class="section-container">
          <div class="section-header">REPRESENTANTES</div>
          <div class="section-content">
            <table class="participants-table">
              <thead><tr><th>NOME</th><th>EMPRESA</th><th>ASSINATURA</th></tr></thead>
              <tbody>
                ${(resposta.participantes || '').split(',').map(p => p.trim()).filter(p => p).map(p => `
                  <tr><td>${p}</td><td></td><td></td></tr>
                `).join('')}
                <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
                <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
                <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
                <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (error) {
      console.error("Erro ao gerar HTML do relatório:", error);
      return '<p>Erro ao gerar relatório. Tente novamente.</p>';
    }
  };

  const handleGeneratePDF = async () => {
    if (!selectedResposta) return;
    
    setGenerating(true);
    try {
      const htmlContent = await generateReportHTML(selectedResposta);
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Relatório de Vistoria - ${selectedResposta.nome_vistoria}</title>
          <meta charset="utf-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            
            body { 
              font-family: 'Inter', sans-serif; 
              margin: 0; 
              color: #333; 
              font-size: 10px; 
              line-height: 1.5;
              background: white;
            }
            
            @media print {
              @page { 
                size: A4; 
                margin: 1.5cm; /* Define as margens da página */
              }
              
              body { 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact;
                margin: 0; /* O corpo preenche a área da página dentro das margens */
              }
            }
            
            .print-header {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: white;
                padding: 15px 0;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px solid #333;
                z-index: 1000;
            }

            .print-header .header-logo img {
                height: 40px;
                width: auto;
            }
            
            .print-header .header-title {
                font-size: 16px;
                font-weight: bold;
                text-align: center;
            }
            
            .print-header .header-info {
                font-size: 10px;
                text-align: right;
            }

            .print-footer {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: white;
                padding: 10px 0;
                border-top: 1px solid #ccc;
                display: flex;
                justify-content: space-between;
                font-size: 9px;
                color: #666;
                z-index: 1000;
            }
            
            .main-content {
                padding-top: 75px;  /* Espaço para o cabeçalho fixo */
                padding-bottom: 40px; /* Espaço para o rodapé fixo */
            }

            .section-container, .question-item, .photo-item { 
              break-inside: avoid; 
              page-break-inside: avoid; 
            }

            .section-header { 
              background-color: #343a40; 
              color: white; 
              padding: 6px 10px; 
              font-weight: bold; 
              font-size: 11px; 
              margin-top: 20px;
            }
            
            .section-content { 
              border: 1px solid #dee2e6; 
              border-top: none;
              padding: 12px; 
              margin-bottom: 15px;
            }
            
            .info-item {
              padding: 8px 0;
              border-bottom: 1px solid #e9ecef;
            }
            
            .info-item:last-child {
              border-bottom: none;
            }

            .info-item strong {
              display: block;
              font-weight: 600;
              margin-bottom: 2px;
            }
            
            .participants-table { 
              width: 100%; 
              border-collapse: collapse; 
            }
            
            .participants-table th, 
            .participants-table td { 
              border: 1px solid #dee2e6; 
              padding: 8px; 
              text-align: left; 
            }
            
            .participants-table th { 
              background-color: #f8f9fa; 
              font-weight: bold;
            }
            
            .question-item { 
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 10px;
              border: 1px solid #e9ecef;
              border-radius: 4px;
              margin-bottom: 8px;
            }
            
            .question-text { 
              flex: 1;
              padding-right: 15px;
            }
            
            .question-answer { 
              font-weight: bold; 
            }
            
            .answer-pending { color: #dc3545; }
            .answer-progress { color: #ffc107; }
            .answer-valid { color: #28a745; }
            .answer-info { color: #17a2b8; }
            .answer-none { color: #6c757d; }
            
            .photos-section { 
              margin-top: 20px; 
            }
            
            .photos-title { 
              display: block; 
              margin-bottom: 10px;
            }

            .question-photos {
              margin-top: 8px;
              margin-bottom: 12px;
              padding: 8px;
              background: #f8f9fa;
              border-radius: 4px;
            }

            .photos-grid { 
              display: grid; 
              grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); 
              gap: 12px; 
              margin-top: 8px;
            }
            
            .photo-item { 
              text-align: center; 
              break-inside: avoid;
              page-break-inside: avoid;
            }
            
            .photo-item img { 
              width: 100%; 
              height: 120px; 
              object-fit: cover; 
              border: 1px solid #dee2e6; 
              border-radius: 4px;
            }
            
            .photo-caption { 
              font-size: 8px; 
              color: #666; 
              margin-top: 4px; 
              font-style: italic;
            }
            
          </style>
        </head>
        <body>
          <div class="print-header">
            <div class="header-logo">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f1e898ee3_logo_Interativa_versao_final_sem_fundo_0002.png" alt="Interativa Engenharia" />
            </div>
            <div class="header-title">
              RELATÓRIO DE VISTORIA <br>
              <span style="font-size: 12px; font-weight: normal;">${selectedResposta.nome_vistoria?.toUpperCase() || 'VISTORIA DE OBRAS'}</span>
            </div>
            <div class="header-info">
              Data: ${format(new Date(), "dd/MM/yyyy")}
            </div>
          </div>
          
          <div class="print-footer">
            <div class="footer-left">
              Interativa Engenharia
            </div>
            <div class="footer-right">
              Página <span class="page-number"></span> de <span class="total-pages"></span>
            </div>
          </div>
          
          <div class="main-content">
            ${htmlContent}
          </div>
        </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      
      // Aguarda um momento para o conteúdo carregar antes de imprimir
      setTimeout(() => {
        printWindow.print();
      }, 1000);
      
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
    } finally {
      setGenerating(false);
    }
  };

  const handleViewReport = () => {
    if (selectedResposta) {
      navigate(createPageUrl(`VisualizarRelatorioVistoria?respostaId=${selectedResposta.id}&unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`));
    }
  };

  return (
    <div className={`p-6 space-y-6 ${isDark ? 'bg-gray-900' : ''}`}>
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(createPageUrl(`IniciarVistoria?unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`))}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>{t.title}</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t.subtitle}</p>
        </div>
      </div>

      <Card className={isDark ? 'bg-gray-800' : ''}>
        <CardHeader>
          <CardTitle className={isDark ? 'text-white' : ''}>{t.selectInspection}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              <span className="ml-2">{t.loading}</span>
            </div>
          ) : respostasVistoria.length > 0 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inspection-select" className={isDark ? 'text-gray-300' : ''}>
                  {t.selectInspection}
                </Label>
                <Select onValueChange={handleSelectResposta}>
                  <SelectTrigger className={`w-full ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}>
                    <SelectValue placeholder="Escolha uma vistoria..." />
                  </SelectTrigger>
                  <SelectContent>
                    {respostasVistoria.map(resp => (
                      <SelectItem key={resp.id} value={resp.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{resp.nome_vistoria}</span>
                          <span className="text-sm text-gray-500">
                            {format(new Date(resp.created_date), 'dd/MM/yyyy')} - {resp.status_vistoria}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedResposta && (
                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={handleGeneratePDF}
                    disabled={generating}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t.generating}
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        {t.generatePDF}
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={handleViewReport}
                    variant="outline"
                    className={isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : ''}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {t.viewReport}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t.noInspections}</p>
          )}
        </CardContent>
      </Card>

      {selectedResposta && (
        <Card className={isDark ? 'bg-gray-800' : ''}>
          <CardHeader>
            <CardTitle className={isDark ? 'text-white' : ''}>Detalhes da Vistoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className={`font-medium ${isDark ? 'text-gray-300' : ''}`}>{t.inspectionDate}:</Label>
                <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                  {format(new Date(selectedResposta.created_date), 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
              <div>
                <Label className={`font-medium ${isDark ? 'text-gray-300' : ''}`}>{t.consultant}:</Label>
                <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                  {selectedResposta.consultor_responsavel || 'N/A'}
                </p>
              </div>
              <div>
                <Label className={`font-medium ${isDark ? 'text-gray-300' : ''}`}>{t.status}:</Label>
                <Badge className="mt-1">
                  {selectedResposta.status_vistoria}
                </Badge>
              </div>
              <div>
                <Label className={`font-medium ${isDark ? 'text-gray-300' : ''}`}>Representantes:</Label>
                <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                  {selectedResposta.participantes || 'N/A'}
                </p>
              </div>
            </div>
            
            {selectedResposta.observacoes_gerais && (
              <div className="mt-4">
                <Label className={`font-medium ${isDark ? 'text-gray-300' : ''}`}>{t.generalObservations}:</Label>
                <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {selectedResposta.observacoes_gerais}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
