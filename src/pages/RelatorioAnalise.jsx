
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { AP_unidade } from "@/api/entities";
import { DisciplinaGeral } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Filter, Download, Eye } from "lucide-react";
import { format } from "date-fns";
import _ from 'lodash';
import { useUnidadeData } from '@/components/hooks/useUnidadeData';

const statusOptions = ["Todos", "Pendente", "Em Andamento", "Concluído"];
const emissoesOptions = ["Todas", "1ª Emissão", "2ª Emissão", "3ª Emissão", "4ª Emissão", "5ª Emissão"];

const translations = {
  pt: {
    title: "Relatório de Análise de Projetos",
    subtitle: "Configure os filtros e visualize o relatório",
    backToAnalysis: "Voltar para Análises",
    filters: "Filtros do Relatório",
    status: "Status",
    allStatus: "Todos os Status",
    issueType: "Tipo de Emissão",
    allIssues: "Todas as Emissões",
    discipline: "Disciplina",
    allDisciplines: "Todas as Disciplinas",
    generateReport: "Gerar Relatório PDF",
    viewReport: "Visualizar Relatório",
    recordsFound: "registros encontrados",
    noRecordsFound: "Nenhum registro encontrado com os filtros aplicados",
    emission: "Emissão",
    item: "Item",
    description: "Descrição",
    comment: "Comentário",
    includedOn: "Incluído em"
  }
};

export default function RelatorioAnalise({ language = 'pt', theme = 'light' }) {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const unidadeId = urlParams.get('unidadeId');
  const empreendimentoId = urlParams.get('empreendimentoId');
  
  const { unidade, empreendimento, loading, error } = useUnidadeData(unidadeId, empreendimentoId);

  const [registrosAP, setRegistrosAP] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [disciplinaPrefixMap, setDisciplinaPrefixMap] = useState({});
  const [filtros, setFiltros] = useState({
    status: "Todos",
    emissao_ap: "Todas",
    disciplina_ap: "Todas"
  });
  const [analisesFiltradas, setAnalisesFiltradas] = useState([]);
  const [showGerarRelatorioDialog, setShowGerarRelatorioDialog] = useState(false);

  useEffect(() => {
    if (error) {
      console.error("Redirecionando devido a erro:", error.message || error);
      navigate(createPageUrl('Empreendimentos'));
    }
  }, [error, navigate]);

  useEffect(() => {
    if (!unidadeId || !empreendimentoId) {
      navigate(createPageUrl("Empreendimentos"));
      return;
    }

    const loadAnalysesAndDisciplines = async () => {
        try {
            const [analisesData, disciplinasData] = await Promise.all([
                AP_unidade.filter({ id_unidade: unidadeId }, "-created_date"),
                DisciplinaGeral.list("prefixo_disciplina")
            ]);
            
            // Filtrar apenas registros ativos (não editados nem excluídos)
            const analisesAtivas = analisesData.filter(a => 
                a.status !== 'Editado' && a.status !== 'Excluído'
            );
            setRegistrosAP(analisesAtivas);
            
            setDisciplinas(disciplinasData);
            
            // Criar mapa de prefixos das disciplinas
            const prefixMap = disciplinasData.reduce((acc, disc) => {
                acc[disc.descricao_disciplina] = disc.prefixo_disciplina;
                return acc;
            }, {});
            setDisciplinaPrefixMap(prefixMap);

        } catch (error) {
            console.error("Erro ao carregar dados de análises ou disciplinas:", error);
        }
    };

    if (!loading && unidade && empreendimento) { // Ensure unidade and empreendimento are loaded
        loadAnalysesAndDisciplines();
    }
  }, [unidadeId, empreendimentoId, loading, unidade, empreendimento]);

  useEffect(() => {
    aplicarFiltros();
  }, [filtros, registrosAP]);

  const t = translations[language];
  const isDark = theme === 'dark';

  const aplicarFiltros = () => {
    let filtered = registrosAP;

    if (filtros.status !== "Todos") {
      filtered = filtered.filter(a => a.status === filtros.status);
    }

    if (filtros.emissao_ap !== "Todas") {
      filtered = filtered.filter(a => a.emissao_ap === filtros.emissao_ap);
    }

    if (filtros.disciplina_ap !== "Todas") {
      filtered = filtered.filter(a => a.disciplina_ap === filtros.disciplina_ap);
    }

    setAnalisesFiltradas(filtered);
  };

  const handleFiltroChange = (field, value) => {
    setFiltros(prev => ({ ...prev, [field]: value }));
  };

  const getStatusColor = (status) => {
    const colors = {
      "Pendente": isDark ? "bg-orange-900/50 text-orange-300" : "bg-orange-100 text-orange-700",
      "Em Andamento": isDark ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700",
      "Concluído": isDark ? "bg-green-900/50 text-green-300" : "bg-green-100 text-green-700"
    };
    return colors[status] || (isDark ? "bg-gray-900/50 text-gray-300" : "bg-gray-100 text-gray-700");
  };

  const getDisciplinaColor = (disciplina) => {
    const colors = {
      "Arquitetura": isDark ? "bg-pink-900/50 text-pink-300" : "bg-pink-100 text-pink-700",
      "Estrutura": isDark ? "bg-orange-900/50 text-orange-300" : "bg-orange-100 text-orange-700",
      "Civil": isDark ? "bg-yellow-900/50 text-yellow-300" : "bg-yellow-100 text-yellow-700",
      "Elétrica": isDark ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700",
      "Hidráulica": isDark ? "bg-cyan-900/50 text-cyan-300" : "bg-cyan-100 text-cyan-700",
      "Incêndio": isDark ? "bg-red-900/50 text-red-300" : "bg-red-100 text-red-700",
      "Climatização": isDark ? "bg-indigo-900/50 text-indigo-300" : "bg-indigo-100 text-indigo-700"
    };
    return colors[disciplina] || (isDark ? "bg-gray-900/50 text-gray-300" : "bg-gray-100 text-gray-700");
  };

  const gerarRelatorioPDF = () => {
    const queryParams = new URLSearchParams({
      unidadeId: unidadeId,
      empreendimentoId: empreendimentoId,
      status: filtros.status,
      emissao: filtros.emissao_ap,
      disciplina: filtros.disciplina_ap
    });
    navigate(createPageUrl(`VisualizarRelatorioAnalise?${queryParams.toString()}`));
  };

  const voltar = () => {
    navigate(createPageUrl(`UnidadeAnalises?unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`));
  };

  if (loading) {
    return (
      <div className={`p-6 space-y-6 ${isDark ? 'bg-gray-900' : ''}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!unidade) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold mb-4">Unidade não encontrada</h2>
        <Button onClick={() => navigate(createPageUrl("Empreendimentos"))}>Voltar aos Empreendimentos</Button>
      </div>
    );
  }

  // Obter disciplinas únicas das análises
  const disciplinasDisponiveis = [...new Set(registrosAP.map(a => a.disciplina_ap))].filter(Boolean);

  return (
    <div className={`p-4 md:p-6 space-y-6 ${isDark ? 'bg-gray-900' : ''}`}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="outline"
          size="icon"
          onClick={voltar}
          className={isDark ? 'bg-gray-800 border-gray-600' : ''}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className={`text-xl md:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.title}</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {empreendimento?.nome_empreendimento} / {unidade?.unidade_empreendimento}
          </p>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {t.subtitle}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card className={isDark ? 'bg-gray-800' : ''}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
            <Filter className="w-5 h-5" />
            {t.filters}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label className={isDark ? 'text-gray-300' : ''}>{t.status}</Label>
              <Select value={filtros.status} onValueChange={(value) => handleFiltroChange('status', value)}>
                <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className={isDark ? 'text-gray-300' : ''}>{t.issueType}</Label>
              <Select value={filtros.emissao_ap} onValueChange={(value) => handleFiltroChange('emissao_ap', value)}>
                <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {emissoesOptions.map(emissao => (
                    <SelectItem key={emissao} value={emissao}>{emissao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className={isDark ? 'text-gray-300' : ''}>{t.discipline}</Label>
              <Select value={filtros.disciplina_ap} onValueChange={(value) => handleFiltroChange('disciplina_ap', value)}>
                <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todas">{t.allDisciplines}</SelectItem>
                  {disciplinasDisponiveis
                    .sort((a, b) => {
                      const prefixA = disciplinaPrefixMap[a] || 0;
                      const prefixB = disciplinaPrefixMap[b] || 0;
                      return prefixA - prefixB;
                    })
                    .map(disciplina => (
                      <SelectItem key={disciplina} value={disciplina}>{disciplina}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <strong>{analisesFiltradas.length}</strong> {t.recordsFound}
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={gerarRelatorioPDF}
                disabled={analisesFiltradas.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                {t.generateReport}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prévia dos resultados */}
      <Card className={isDark ? 'bg-gray-800' : ''}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
            <Eye className="w-5 h-5" />
            {t.viewReport}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analisesFiltradas.length === 0 ? (
            <div className="text-center py-8">
              <FileText className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t.noRecordsFound}</p>
            </div>
          ) : (
            <div className="space-y-6 max-h-[600px] overflow-y-auto">
              {Object.entries(_.groupBy(analisesFiltradas, 'emissao_ap')).map(([emissao, analisesGrupo]) => (
                <div key={emissao}>
                  <h3 className={`font-bold text-lg mb-4 pb-2 border-b ${isDark ? 'text-blue-400 border-gray-700' : 'text-blue-600 border-gray-200'}`}>
                    {t.emission}: {emissao}
                  </h3>
                  {Object.entries(_.groupBy(analisesGrupo, 'disciplina_ap'))
                    .sort(([disciplinaA], [disciplinaB]) => {
                      const prefixA = disciplinaPrefixMap[disciplinaA] || 0;
                      const prefixB = disciplinaPrefixMap[disciplinaB] || 0;
                      return prefixA - prefixB;
                    })
                    .map(([disciplina, itemsDaDisciplina]) => (
                    <div key={disciplina} className="pl-2 mt-4">
                      <h4 className={`font-semibold text-md mb-3 flex items-center gap-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                        <Badge className={getDisciplinaColor(disciplina)}>{disciplina}</Badge>
                      </h4>
                      <div className="space-y-3 pl-4 border-l-2 border-dashed border-gray-300">
                        {itemsDaDisciplina
                          .sort((a, b) => {
                            const itemA = a.item_ap || "";
                            const itemB = b.item_ap || "";
                            return itemA.localeCompare(itemB, undefined, { numeric: true });
                          })
                          .map((analise) => (
                          <div 
                            key={analise.id}
                            className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-4">
                                <h5 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                  <span className="font-bold">{analise.item_ap}</span> - {analise.descricao_ap}
                                </h5>
                                <Badge className={getStatusColor(analise.status)}>
                                  {analise.status}
                                </Badge>
                              </div>
                              
                              {analise.comentario_ap && (
                                <div>
                                  <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t.comment}:</p>
                                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{analise.comentario_ap}</p>
                                </div>
                              )}

                              {analise.replica_ap && (
                                <div>
                                  <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Réplica:</p>
                                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{analise.replica_ap}</p>
                                </div>
                              )}

                              {analise.treplica_ap && (
                                <div>
                                  <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Tréplica:</p>
                                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{analise.treplica_ap}</p>
                                </div>
                              )}

                              {analise.imagem_ap && (
                                <div>
                                  <img 
                                    src={analise.imagem_ap} 
                                    alt="Imagem da análise" 
                                    className="max-w-full h-auto max-h-48 rounded-lg border"
                                  />
                                  {analise.comentario_im_ap && (
                                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                      {analise.comentario_im_ap}
                                    </p>
                                  )}
                                </div>
                              )}

                              {analise.data_inclusao_ap && (
                                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                  {t.includedOn}: {format(new Date(analise.data_inclusao_ap), 'dd/MM/yyyy HH:mm')}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
