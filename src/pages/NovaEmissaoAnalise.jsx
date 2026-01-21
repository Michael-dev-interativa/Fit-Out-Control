
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { RegistroGeral } from "@/api/entities";
import { DisciplinaGeral } from "@/api/entities";
import { AP_unidade } from "@/api/entities";
import { UnidadeEmpreendimento } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, FileText, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

const translations = {
  pt: {
    title: "Nova Emissão de Análise",
    subtitle: "Configure os filtros para gerar a emissão",
    backToAnalysis: "Voltar para Análises",
    reportType: "Tipo de Relatório",
    selectReportType: "Selecione um tipo de relatório",
    issueType: "Tipo de Emissão",
    selectIssueType: "Selecione um tipo de emissão",
    generateEmpty: "Gerar Emissão Vazia",
    generateWithRecords: "Gerar Emissão com Registros",
    bothFieldsRequired: "Selecione ambos os campos para gerar com registros",
    generating: "Gerando...",
    success: "Emissão gerada com sucesso!",
    redirecting: "Redirecionando...",
    error: "Erro ao gerar emissão"
  },
  en: {
    title: "New Analysis Emission",
    subtitle: "Configure filters to generate the emission",
    backToAnalysis: "Back to Analysis",
    reportType: "Report Type",
    selectReportType: "Select a report type",
    issueType: "Issue Type",
    selectIssueType: "Select an issue type",
    generateEmpty: "Generate Empty Emission",
    generateWithRecords: "Generate Emission with Records",
    bothFieldsRequired: "Select both fields to generate with records",
    generating: "Generating...",
    success: "Emission generated successfully!",
    redirecting: "Redirecting...",
    error: "Error generating emission"
  }
};

export default function NovaEmissaoAnalise() {
  const navigate = useNavigate();
  const [unidade, setUnidade] = useState(null);
  const [tiposRelatorio, setTiposRelatorio] = useState([]);
  const [emissoesDisponiveis, setEmissoesDisponiveis] = useState([]);
  const [disciplinasGerais, setDisciplinasGerais] = useState([]);
  const [filtros, setFiltros] = useState({
    tipo_relatorio: "",
    emissao_registro: ""
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState('pt');
  const [theme, setTheme] = useState('light');

  const urlParams = new URLSearchParams(window.location.search);
  const unidadeId = urlParams.get('unidade');
  const empreendimentoId = urlParams.get('emp');

  useEffect(() => {
    if (unidadeId) {
      loadData();
    }
    const handleLanguageChange = () => {
      setLanguage(localStorage.getItem('language') || 'pt');
    };
    const handleThemeChange = () => {
      setTheme(localStorage.getItem('theme') || 'light');
    };
    window.addEventListener('language-change', handleLanguageChange);
    window.addEventListener('theme-change', handleThemeChange);
    handleLanguageChange();
    handleThemeChange();
    return () => {
      window.removeEventListener('language-change', handleLanguageChange);
      window.removeEventListener('theme-change', handleThemeChange);
    };
  }, [unidadeId]);

  useEffect(() => {
    if (filtros.tipo_relatorio) {
      loadEmissoesDisponiveis();
    } else {
      setEmissoesDisponiveis([]);
      setFiltros(prev => ({ ...prev, emissao_registro: "" }));
    }
  }, [filtros.tipo_relatorio]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [unidadeData, registrosGerais, disciplinasData] = await Promise.all([
        UnidadeEmpreendimento.filter({ id: unidadeId }),
        RegistroGeral.list(),
        DisciplinaGeral.list("prefixo_disciplina")
      ]);

      if (unidadeData.length === 0) {
        navigate(createPageUrl("Empreendimentos"));
        return;
      }

      setUnidade(unidadeData[0]);
      setDisciplinasGerais(disciplinasData);
      
      // Extrair tipos de relatório únicos onde tipo_registro é "Análise de Projetos"
      const tiposUnicos = [...new Set(
        registrosGerais
          .filter(r => r.tipo_registro === "Análise de Projetos")
          .map(r => r.tipo_relatorio)
          .filter(t => t && t.trim())
      )];
      setTiposRelatorio(tiposUnicos);

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setError("Erro ao carregar dados iniciais");
    } finally {
      setLoading(false);
    }
  };

  const loadEmissoesDisponiveis = async () => {
    try {
      const registrosGerais = await RegistroGeral.filter({
        tipo_registro: "Análise de Projetos",
        tipo_relatorio: filtros.tipo_relatorio
      });

      const emissoesUnicas = [...new Set(
        registrosGerais.map(r => r.emissao_registro).filter(e => e)
      )];
      setEmissoesDisponiveis(emissoesUnicas);
    } catch (error) {
      console.error("Erro ao carregar emissões:", error);
    }
  };

  const handleFiltroChange = (field, value) => {
    setFiltros(prev => ({ ...prev, [field]: value }));
    setError("");
  };

  const gerarEmissaoVazia = async () => {
    setGenerating(true);
    try {
      // Criar uma emissão vazia (sem registros)
      setSuccess(true);
      setTimeout(() => {
        voltarAnalises();
      }, 2000);
    } catch (error) {
      console.error("Erro ao gerar emissão vazia:", error);
      setError("Erro ao gerar emissão vazia");
    } finally {
      setGenerating(false);
    }
  };

  const gerarEmissaoComRegistros = async () => {
    if (!filtros.tipo_relatorio || !filtros.emissao_registro) {
      setError("Selecione ambos os campos para gerar com registros");
      return;
    }

    setGenerating(true);
    try {
      // Buscar registros do RegistroGeral conforme filtros
      const registrosModelo = await RegistroGeral.filter({
        tipo_registro: "Análise de Projetos",
        tipo_relatorio: filtros.tipo_relatorio,
        emissao_registro: filtros.emissao_registro
      });

      // Criar mapa de prefixos das disciplinas
      const prefixMap = disciplinasGerais.reduce((acc, disc) => {
        acc[disc.descricao_disciplina] = disc.prefixo_disciplina;
        return acc;
      }, {});

      // Criar registros no AP_unidade
      const novosRegistros = registrosModelo.map(registro => ({
        id_unidade: unidadeId,
        item_ap: `${prefixMap[registro.disciplina] || '?'}.${registro.numeracao || 1}`,
        descricao_ap: registro.descricao_registro,
        disciplina_ap: registro.disciplina,
        status: "Pendente",
        emissao_ap: filtros.emissao_registro,
        data_inclusao_ap: new Date().toISOString(),
        comentario_ap: "",
        replica_ap: "",
        treplica_ap: "",
        imagem_ap: "",
        comentario_im_ap: ""
      }));

      // Criar todos os registros
      await Promise.all(
        novosRegistros.map(registro => AP_unidade.create(registro))
      );

      setSuccess(true);
      setTimeout(() => {
        voltarAnalises();
      }, 2000);

    } catch (error) {
      console.error("Erro ao gerar emissão com registros:", error);
      setError("Erro ao gerar emissão com registros");
    } finally {
      setGenerating(false);
    }
  };

  const voltarAnalises = () => {
    navigate(createPageUrl(`UnidadeAnalises?unidade=${unidadeId}&emp=${empreendimentoId}`));
  };

  const t = translations[language];
  const isDark = theme === 'dark';

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

  if (success) {
    return (
      <div className={`p-6 ${isDark ? 'bg-gray-900' : ''}`}>
        <div className="max-w-md mx-auto">
          <Card className={`shadow-lg border-0 ${isDark ? 'bg-gray-800' : ''}`}>
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>{t.success}</h2>
              <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{t.redirecting}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${isDark ? 'bg-gray-900' : ''}`}>
      <div className="max-w-2xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={voltarAnalises}
            className={isDark ? 'bg-gray-800 border-gray-600' : ''}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.title}</h1>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {unidade?.unidade_empreendimento}
            </p>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t.subtitle}</p>
          </div>
        </div>

        {/* Filtros */}
        <Card className={`shadow-lg ${isDark ? 'bg-gray-800' : ''}`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
              <FileText className="w-5 h-5" />
              Configuração da Emissão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo_relatorio" className={isDark ? 'text-gray-300' : ''}>{t.reportType}</Label>
                <Select 
                  value={filtros.tipo_relatorio} 
                  onValueChange={(value) => handleFiltroChange("tipo_relatorio", value)}
                >
                  <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}>
                    <SelectValue placeholder={t.selectReportType} />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposRelatorio.map(tipo => (
                      <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emissao_registro" className={isDark ? 'text-gray-300' : ''}>{t.issueType}</Label>
                <Select 
                  value={filtros.emissao_registro} 
                  onValueChange={(value) => handleFiltroChange("emissao_registro", value)}
                  disabled={!filtros.tipo_relatorio}
                >
                  <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}>
                    <SelectValue placeholder={t.selectIssueType} />
                  </SelectTrigger>
                  <SelectContent>
                    {emissoesDisponiveis.map(emissao => (
                      <SelectItem key={emissao} value={emissao}>{emissao}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-4 pt-4">
              <Button
                onClick={gerarEmissaoVazia}
                disabled={generating}
                variant="outline"
                className="flex-1"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                {t.generateEmpty}
              </Button>

              <Button
                onClick={gerarEmissaoComRegistros}
                disabled={generating || !filtros.tipo_relatorio || !filtros.emissao_registro}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                {t.generateWithRecords}
              </Button>
            </div>

            {(!filtros.tipo_relatorio || !filtros.emissao_registro) && (
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} text-center`}>
                {t.bothFieldsRequired}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
