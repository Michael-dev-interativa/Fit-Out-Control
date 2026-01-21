
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { UnidadeEmpreendimento } from "@/api/entities";
import { Empreendimento } from "@/api/entities";
import { RegistroUnidade } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Download, Calendar, User, MessageSquare, CornerDownRight, Printer } from "lucide-react";
import { format } from "date-fns";

const statusColors = {
  "Pendente": "bg-orange-100 text-orange-700",
  "Em Andamento": "bg-blue-100 text-blue-700",
  "Concluído": "bg-green-100 text-green-700"
};

export default function VisualizarRelatorio() {
  const navigate = useNavigate();
  const [unidade, setUnidade] = useState(null);
  const [empreendimento, setEmpreendimento] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('light');

  const urlParams = new URLSearchParams(window.location.search);
  const unidadeId = urlParams.get('unidade');
  const empreendimentoId = urlParams.get('emp');
  const tipoFiltro = urlParams.get('tipo');
  const emissaoFiltro = urlParams.get('emissao');

  useEffect(() => {
    const handleThemeChange = () => {
      const storedTheme = localStorage.getItem('theme') || 'light';
      setTheme(storedTheme);
    };
    window.addEventListener('theme-change', handleThemeChange);
    handleThemeChange();
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  useEffect(() => {
    if (unidadeId) {
      loadRelatorioData();
    } else {
      navigate(createPageUrl("Empreendimentos"));
    }
  }, [unidadeId]);

  const isDark = theme === 'dark';

  const loadRelatorioData = async () => {
    try {
      setLoading(true);
      
      const [unidadeData, empData] = await Promise.all([
        UnidadeEmpreendimento.filter({ id: unidadeId }),
        Empreendimento.filter({ id: empreendimentoId })
      ]);

      if (unidadeData.length === 0 || empData.length === 0) {
        navigate(createPageUrl("Empreendimentos"));
        return;
      }

      setUnidade(unidadeData[0]);
      setEmpreendimento(empData[0]);

      // Carregar e filtrar registros
      const todosRegistros = await RegistroUnidade.filter({ id_unidade: unidadeId }, "-created_date");
      // Filtrar apenas registros ativos para o relatório
      let registrosFiltrados = todosRegistros.filter(r => !["Editado", "Excluído"].includes(r.status));

      if (tipoFiltro !== "Todos") {
        registrosFiltrados = registrosFiltrados.filter(r => r.tipo_registro === tipoFiltro);
      }

      if (emissaoFiltro !== "Todas") {
        registrosFiltrados = registrosFiltrados.filter(r => r.emissao_registro === emissaoFiltro);
      }

      setRegistros(registrosFiltrados);

    } catch (error) {
      console.error("Erro ao carregar dados do relatório:", error);
    } finally {
      setLoading(false);
    }
  };

  const voltarFiltros = () => {
    navigate(createPageUrl(`RelatorioUnidade?id=${unidadeId}&emp=${empreendimentoId}`));
  };

  const imprimirRelatorio = () => {
    window.print();
  };

  const exportarPDF = () => {
    // Esta função poderia ser implementada com uma biblioteca como jsPDF
    // Por enquanto, usar a função de impressão do navegador
    window.print();
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Cabeçalho - oculto na impressão */}
      <div className="print:hidden p-6 border-b">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={voltarFiltros}
              className={isDark ? 'bg-gray-800 border-gray-600' : ''}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Relatório de Registros
              </h1>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {empreendimento?.nome_empreendimento} / {unidade?.unidade_empreendimento}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={imprimirRelatorio} variant="outline">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            <Button onClick={exportarPDF} className="bg-red-600 hover:bg-red-700">
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo do relatório */}
      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Cabeçalho do relatório */}
          <Card className={`print:shadow-none ${isDark ? 'bg-gray-800' : ''}`}>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <img 
                  src={theme === 'dark'
                    ? "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1a0999f3c_logo_Interativa_letra_branca_sem_fundo_gg.png"
                    : "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f1e898ee3_logo_Interativa_versao_final_sem_fundo_0002.png"
                  }
                  alt="Logo Interativa Engenharia"
                  className="h-16"
                />
              </div>
              <CardTitle className={`text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Relatório de Registros FitOut
              </CardTitle>
              <div className="mt-4 space-y-1">
                <p className={`text-lg font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  {empreendimento?.nome_empreendimento}
                </p>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Unidade: {unidade?.unidade_empreendimento}
                </p>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Cliente: {unidade?.cliente_unidade}
                </p>
              </div>
            </CardHeader>
          </Card>

          {/* Informações dos filtros */}
          <Card className={`print:shadow-none ${isDark ? 'bg-gray-800' : ''}`}>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Filtros aplicados:
                  </span>
                </div>
                <Badge variant="outline" className={isDark ? 'border-gray-600 text-gray-300' : ''}>
                  Tipo: {tipoFiltro}
                </Badge>
                <Badge variant="outline" className={isDark ? 'border-gray-600 text-gray-300' : ''}>
                  Emissão: {emissaoFiltro}
                </Badge>
                <Badge variant="outline" className={isDark ? 'border-gray-600 text-gray-300' : ''}>
                  Total: {registros.length} registros
                </Badge>
                <div className="ml-auto">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Gerado em: {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de registros */}
          {registros.length === 0 ? (
            <Card className={isDark ? 'bg-gray-800' : ''}>
              <CardContent className="p-12 text-center">
                <FileText className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                  Nenhum registro encontrado com os filtros aplicados
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {registros.map((registro, index) => (
                <Card key={registro.id} className={`print:shadow-none print:border ${isDark ? 'bg-gray-800' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {index + 1}. {registro.item_registro}
                        </h3>
                        {registro.descricao_registro && (
                          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {registro.descricao_registro}
                          </p>
                        )}
                      </div>
                      <Badge className={statusColors[registro.status] || 'bg-gray-100 text-gray-800'}>
                        {registro.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Informações básicas */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Tipo:</span>
                        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{registro.tipo_registro}</p>
                      </div>
                      <div>
                        <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Disciplina:</span>
                        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{registro.disciplina}</p>
                      </div>
                      <div>
                        <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Emissão:</span>
                        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{registro.emissao_registro}</p>
                      </div>
                    </div>

                    {/* Informações de criação */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 border-t pt-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(registro.created_date), "dd/MM/yyyy")}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {registro.created_by}
                      </div>
                    </div>

                    {/* Comentários */}
                    {(registro.comentario_registro || registro.replica_registro || registro.treplica_registro) && (
                      <div className={`space-y-3 p-3 rounded-md ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        {registro.comentario_registro && (
                          <div className="flex gap-2">
                            <MessageSquare className={`w-4 h-4 mt-1 flex-shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                            <div>
                              <p className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Comentário:</p>
                              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{registro.comentario_registro}</p>
                            </div>
                          </div>
                        )}
                        
                        {registro.replica_registro && (
                          <div className="flex gap-2 pl-4 border-l-2 border-blue-500">
                            <CornerDownRight className={`w-4 h-4 mt-1 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                            <div>
                              <p className={`text-xs font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'} mb-1`}>Réplica:</p>
                              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{registro.replica_registro}</p>
                            </div>
                          </div>
                        )}
                        
                        {registro.treplica_registro && (
                          <div className="flex gap-2 pl-8 border-l-2 border-green-500">
                            <CornerDownRight className={`w-4 h-4 mt-1 flex-shrink-0 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                            <div>
                              <p className={`text-xs font-medium ${isDark ? 'text-green-300' : 'text-green-700'} mb-1`}>Tréplica:</p>
                              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{registro.treplica_registro}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Foto */}
                    {registro.foto_registro && (
                      <div>
                        <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Foto do Registro:</p>
                        <img
                          src={registro.foto_registro}
                          alt="Foto do registro"
                          className="max-w-full h-auto max-h-64 object-contain rounded border"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Rodapé do relatório */}
          <Card className={`print:shadow-none ${isDark ? 'bg-gray-800' : ''}`}>
            <CardContent className="p-4 text-center">
              <div className="space-y-2">
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Relatório gerado pelo sistema FitOut Control - Interativa Engenharia
                </p>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  © {new Date().getFullYear()} Interativa Engenharia. Todos os direitos reservados.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
