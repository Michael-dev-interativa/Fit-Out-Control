
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { RegistroUnidade } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText, Search, Plus, Filter } from "lucide-react";
import RegistroCard from "../components/unidade/RegistroCard";
import UnidadeHeader from "../components/unidade/UnidadeHeader";
import { useUnidadeData } from '@/components/hooks/useUnidadeData';

const statusOptions = ["all", "Pendente", "Em Andamento", "Concluído"];

export default function UnidadeRegistros({ language = 'pt', theme = 'light' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [registros, setRegistros] = useState([]);
  const [filteredRegistros, setFilteredRegistros] = useState([]);
  const [loading, setLoading] = useState(true); // State for RegistroUnidade fetching
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNovoDialog, setShowNovoDialog] = useState(false); // New state as per outline

  const urlParams = new URLSearchParams(location.search);
  const unidadeId = urlParams.get('id'); // Changed from 'unidade' to 'id'
  const empreendimentoId = urlParams.get('emp');
  const tipoRegistro = urlParams.get('tipo');

  // Hook to fetch unidade and empreendimento data
  const { unidade, empreendimento, loading: unidadeDataLoading, error } = useUnidadeData(unidadeId, empreendimentoId);

  // Effect to handle errors from useUnidadeData and redirect
  useEffect(() => {
    if (error) {
      console.error("Redirecionando devido a erro no carregamento dos dados da unidade:", error);
      navigate(createPageUrl('Empreendimentos'));
    }
  }, [error, navigate]);

  // Effect to fetch RegistroUnidade data
  useEffect(() => {
    // Only proceed to load registrations if IDs and tipoRegistro are present,
    // and unit/empreendimento data has finished loading and is available
    if (unidadeId && tipoRegistro && !unidadeDataLoading && unidade && empreendimento) {
      loadData();
    }
  }, [unidadeId, tipoRegistro, unidadeDataLoading, unidade, empreendimento]);

  useEffect(() => {
    let filtered = registros;
    if (searchTerm) {
      filtered = filtered.filter(registro =>
        registro.item_registro?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        registro.descricao_registro?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    setFilteredRegistros(filtered);
  }, [registros, searchTerm, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Only fetch RegistroUnidade data, as UnidadeEmpreendimento and Empreendimento are handled by useUnidadeData
      const allRegsData = await RegistroUnidade.filter({ id_unidade: unidadeId, status: "!Obsoleto" }, "-created_date");
      
      const regsDoTipo = allRegsData.filter(r => r.tipo_registro === tipoRegistro);
      setRegistros(regsDoTipo);
    } catch (error) {
      console.error(`Erro ao carregar registros de ${tipoRegistro}:`, error);
    }
    setLoading(false);
  };
  
  const handleEditRegistro = (registro) => {
    navigate(createPageUrl(`EditarRegistro?id=${registro.id}&unidade=${unidadeId}&emp=${empreendimentoId}`));
  };

  const handleNovaEmissao = () => {
    navigate(createPageUrl(`NovaEmissao?unidade=${unidadeId}&emp=${empreendimentoId}&tipo=${tipoRegistro}`));
  };

  const getUnidadeHeaderStats = () => {
    const statusCounts = registros.reduce((acc, registro) => {
      acc[registro.status] = (acc[registro.status] || 0) + 1;
      return acc;
    }, {});

    return {
      total: registros.length,
      pendente: statusCounts['Pendente'] || 0,
      andamento: statusCounts['Em Andamento'] || 0,
      concluido: statusCounts['Concluído'] || 0
    };
  };

  const isDark = theme === 'dark';

  // Show a general loading state for the entire page if unit/empreendimento data is loading or not yet available
  if (unidadeDataLoading || !unidade || !empreendimento) {
      return (
          <div className={`p-4 md:p-6 space-y-6 ${isDark ? 'bg-gray-900 text-white' : ''} flex flex-col justify-center items-center min-h-screen`}>
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-lg">Carregando dados da unidade e empreendimento...</p>
          </div>
      );
  }

  return (
    <div className={`p-4 md:p-6 space-y-6 ${isDark ? 'bg-gray-900' : ''}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl(`Unidade?id=${unidadeId}&emp=${empreendimentoId}`))}
            className={isDark ? 'bg-gray-800 border-gray-600' : ''}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className={`text-xl md:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{tipoRegistro}</h1>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Gerencie registros de {tipoRegistro?.toLowerCase()}</p>
          </div>
        </div>
      </div>

      <UnidadeHeader 
        empreendimento={empreendimento}
        unidade={unidade}
        stats={getUnidadeHeaderStats()}
        language={language}
        theme={theme}
      />
      
      <Card className={isDark ? 'bg-gray-800' : ''}>
        <CardHeader>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <CardTitle className={isDark ? 'text-white' : ''}>Lista de Registros</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar registro..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 w-full sm:w-64 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className={`w-full sm:w-48 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {statusOptions.slice(1).map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleNovaEmissao} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nova Emissão de Registros
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? ( // This 'loading' state is specific to the RegistroUnidade fetch
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className={`h-32 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} />
              ))}
            </div>
          ) : filteredRegistros.length === 0 ? (
            <div className="text-center py-12">
              <FileText className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
                {searchTerm || statusFilter !== "all" 
                  ? "Nenhum registro encontrado"
                  : `Nenhum registro de ${tipoRegistro} cadastrado`
                }
              </h3>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} mb-6`}>
                {searchTerm || statusFilter !== "all"
                  ? "Tente ajustar os filtros de busca"
                  : `Adicione o primeiro registro de ${tipoRegistro?.toLowerCase()} desta unidade`
                }
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Button onClick={handleNovaEmissao}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Emissão
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRegistros.map((registro) => (
                <RegistroCard
                  key={registro.id}
                  registro={registro}
                  onEdit={handleEditRegistro}
                  theme={theme}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
