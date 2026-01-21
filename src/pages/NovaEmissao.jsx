import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { RegistroGeral } from "@/api/entities";
import { DisciplinaGeral } from "@/api/entities";
import { RegistroUnidade } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import _ from 'lodash';

export default function NovaEmissao() {
  const navigate = useNavigate();
  const [registrosGerais, setRegistrosGerais] = useState([]);
  const [disciplinasGerais, setDisciplinasGerais] = useState([]);
  const [tiposRelatorio, setTiposRelatorio] = useState([]);
  const [emissoes, setEmissoes] = useState([]);
  
  const [selectedTipoRelatorio, setSelectedTipoRelatorio] = useState("");
  const [selectedEmissao, setSelectedEmissao] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState('light');

  const urlParams = new URLSearchParams(window.location.search);
  const unidadeId = urlParams.get('unidade');
  const empreendimentoId = urlParams.get('emp');
  const tipoRegistro = urlParams.get('tipo');

  useEffect(() => {
    loadInitialData();
    const handleThemeChange = () => {
      setTheme(localStorage.getItem('theme') || 'light');
    };
    window.addEventListener('theme-change', handleThemeChange);
    handleThemeChange();
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  useEffect(() => {
    if (selectedTipoRelatorio) {
      const filteredEmissoes = _.chain(registrosGerais)
        .filter(rg => rg.tipo_relatorio === selectedTipoRelatorio && rg.tipo_registro === tipoRegistro)
        .map('emissao_registro')
        .uniq()
        .sort()
        .value();
      setEmissoes(filteredEmissoes);
      setSelectedEmissao("");
    } else {
      setEmissoes([]);
      setSelectedEmissao("");
    }
  }, [selectedTipoRelatorio, registrosGerais, tipoRegistro]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [regsGeraisData, discsGeraisData] = await Promise.all([
        RegistroGeral.list(),
        DisciplinaGeral.list()
      ]);
      setRegistrosGerais(regsGeraisData);
      setDisciplinasGerais(discsGeraisData);
      
      const uniqueTiposRelatorio = _.chain(regsGeraisData)
        .filter(rg => rg.tipo_registro === tipoRegistro)
        .map('tipo_relatorio')
        .uniq()
        .filter(Boolean)
        .sort()
        .value();
      setTiposRelatorio(uniqueTiposRelatorio);
    } catch (err) {
      setError("Erro ao carregar dados para emissão.");
      console.error(err);
    }
    setLoading(false);
  };

  const handleGerarEmissao = async () => {
    setError("");
    if (selectedTipoRelatorio && !selectedEmissao) {
      setError("Por favor, selecione um Tipo de Emissão.");
      return;
    }

    // Se ambos os campos estiverem em branco, navega para a página de registros vazia,
    // que permitirá a criação manual. Isso é implícito, a página de destino já lida com a ausência de registros.
    if (!selectedTipoRelatorio && !selectedEmissao) {
        console.log("Gerando emissão em branco...");
        // A navegação para a página de registros fará com que ela apareça vazia,
        // e o botão de "Nova Emissão" será na verdade um "Novo Registro" dentro daquele contexto.
        // Por simplicidade, vamos apenas gerar os registros se os filtros forem selecionados.
        // A criação de uma emissão "vazia" é um conceito abstrato que pode ser tratado na página de destino.
        navigate(createPageUrl(`UnidadeRegistros?unidade=${unidadeId}&emp=${empreendimentoId}&tipo=${tipoRegistro}`));
        return;
    }

    setGenerating(true);
    try {
      const disciplinaPrefixMap = _.keyBy(disciplinasGerais, 'descricao_disciplina');
      
      const registrosParaCriar = registrosGerais
        .filter(rg => 
          rg.tipo_registro === tipoRegistro &&
          rg.tipo_relatorio === selectedTipoRelatorio &&
          rg.emissao_registro === selectedEmissao
        )
        .map(rg => {
          const prefixo = disciplinaPrefixMap[rg.disciplina]?.prefixo_disciplina || '???';
          return {
            id_unidade: unidadeId,
            item_registro: `${prefixo}.${rg.numeracao} - ${rg.disciplina}`,
            descricao_registro: rg.descricao_registro,
            status: "Pendente",
            tipo_registro: rg.tipo_registro,
            disciplina: rg.disciplina,
            emissao_registro: rg.emissao_registro,
          };
        });

      if (registrosParaCriar.length > 0) {
        // Usando loop de create se bulkCreate não estiver disponível.
        for (const registro of registrosParaCriar) {
          await RegistroUnidade.create(registro);
        }
      }
      
      navigate(createPageUrl(`UnidadeRegistros?unidade=${unidadeId}&emp=${empreendimentoId}&tipo=${tipoRegistro}`));
    } catch (err) {
      setError("Falha ao gerar emissão.");
      console.error(err);
    }
    setGenerating(false);
  };
  
  const isDark = theme === 'dark';

  return (
    <div className={`p-6 space-y-6 ${isDark ? 'bg-gray-900' : ''}`}>
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(createPageUrl(`UnidadeRegistros?unidade=${unidadeId}&emp=${empreendimentoId}&tipo=${tipoRegistro}`))}
          className={isDark ? 'bg-gray-800 border-gray-600' : ''}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Nova Emissão de {tipoRegistro}</h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Selecione filtros para gerar registros a partir de um modelo.</p>
        </div>
      </div>

      <Card className={isDark ? 'bg-gray-800' : ''}>
        <CardHeader>
          <CardTitle className={isDark ? 'text-white' : ''}>Filtros da Emissão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className={isDark ? 'text-gray-300' : ''}>Tipo de Relatório (Opcional)</label>
            <Select value={selectedTipoRelatorio} onValueChange={setSelectedTipoRelatorio}>
              <SelectTrigger className={isDark ? 'bg-gray-700' : ''}><SelectValue placeholder="Selecione um tipo de relatório" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Nenhum</SelectItem>
                {tiposRelatorio.map(tr => <SelectItem key={tr} value={tr}>{tr}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className={isDark ? 'text-gray-300' : ''}>Tipo de Emissão (Opcional)</label>
            <Select value={selectedEmissao} onValueChange={setSelectedEmissao} disabled={!selectedTipoRelatorio}>
              <SelectTrigger className={isDark ? 'bg-gray-700' : ''}><SelectValue placeholder="Selecione um tipo de emissão" /></SelectTrigger>
              <SelectContent>
                {emissoes.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button onClick={handleGerarEmissao} disabled={loading || generating}>
            {generating ? "Gerando..." : "Gerar Emissão"}
          </Button>
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Se nenhum filtro for selecionado, você será direcionado para uma página de registros vazia para adicionar itens manualmente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}