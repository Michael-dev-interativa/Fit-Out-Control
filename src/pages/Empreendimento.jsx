import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getUploadUrl } from '@/api/config.js';
import { Empreendimento } from '@/api/entities';
import { UnidadeEmpreendimento } from '@/api/entities';
import { KO_unidade } from '@/api/entities';
import { AP_unidade } from '@/api/entities';
import { VO_unidade } from '@/api/entities';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  AlertTriangle,
  ArrowLeft,
  Building,
  Zap,
  FileText,
  BookOpen,
  Image,
  AlertCircle,
  ClipboardCheck,
  ClipboardList,
  Folder,
  ChevronRight,
  Edit,
  Layers,
  ClipboardPlus,
  CalendarClock,
  Beaker,
  Loader2
} from 'lucide-react';
// Lazy-load heavy subcomponents to reduce initial bundle size
const UnidadeCard = lazy(() => import('@/components/empreendimento/UnidadeCard'));
const InfoGeral = lazy(() => import('@/components/empreendimento/InfoGeral'));
const TabelaContatos = lazy(() => import('@/components/empreendimento/TabelaContatos'));
const TabelaInformacoesTecnicas = lazy(() => import('@/components/empreendimento/TabelaInformacoesTecnicas'));
const NovaUnidadeDialog = lazy(() => import('@/components/empreendimento/NovaUnidadeDialog'));
const GaleriaFotosDialog = lazy(() => import('@/components/empreendimento/GaleriaFotosDialog'));
const ManuaisGeraisDialog = lazy(() => import('@/components/empreendimento/ManuaisGeraisDialog'));
const ProjetosOriginaisDialog = lazy(() => import('@/components/empreendimento/ProjetosOriginaisDialog'));
const ParticularidadesDialog = lazy(() => import('@/components/empreendimento/ParticularidadesDialog'));
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRef } from 'react';

const EmpreendimentoPage = () => {
  const { isDark, theme } = useTheme();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const empreendimentoId = queryParams.get('empreendimentoId') || queryParams.get('id');

  const [empreendimento, setEmpreendimento] = useState(null);
  const [unidades, setUnidades] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showUnidades, setShowUnidades] = useState(false);
  const [showNovaUnidade, setShowNovaUnidade] = useState(false);
  const [showGaleria, setShowGaleria] = useState(false);
  const [showManuais, setShowManuais] = useState(false);
  const [showProjetos, setShowProjetos] = useState(false);
  const [showParticularidades, setShowParticularidades] = useState(false);
  const [showGroupProcessos, setShowGroupProcessos] = useState(false);
  const [showGroupGerenciamento, setShowGroupGerenciamento] = useState(false);

  const isValidId = (id) => id && String(id).trim() !== '';

  const loadEmpreendimentoData = async () => {
    if (loadEmpreendimentoData._running) return;
    loadEmpreendimentoData._running = true;
    setLoading(true);
    setError(null);
    try {
      // Fetch empreendimento and unidades in parallel
      const [empData, unidadesData] = await Promise.all([
        Empreendimento.get(empreendimentoId),
        UnidadeEmpreendimento.filter({ id_empreendimento: empreendimentoId }, "-created_date")
      ]);

      if (!empData) {
        console.error("EmpreendimentoPage - Empreendimento não encontrado para ID:", empreendimentoId);
        // Only navigate if an explicit error is not already set, otherwise let the error message display.
        if (!error) navigate(createPageUrl("Empreendimentos"), { replace: true });
        return;
      }

      setEmpreendimento(empData);
      const units = unidadesData || [];
      setUnidades(units);
      if (import.meta.env && import.meta.env.DEV) console.log("EmpreendimentoPage - Unidades carregadas:", units.length, "unidades para empreendimento:", empreendimentoId);

      // Debug each unit
      units.forEach((unidade, index) => {
        console.log(`EmpreendimentoPage - Unidade ${index}:`, {
          id: unidade.id,
          nome: unidade.unidade_empreendimento,
          cliente: unidade.cliente_unidade
        });
      });

      // Load records for the units if any exist
      if (units.length > 0) {
        const validUnidadeIds = units
          .map(u => String(u.id))
          .filter(id => isValidId(id));

        if (import.meta.env && import.meta.env.DEV) console.log("EmpreendimentoPage - IDs válidos das unidades para registros:", validUnidadeIds);

        if (validUnidadeIds.length > 0) {
          const [koData, apData, voData] = await Promise.all([
            KO_unidade.filter({ id_unidade: ['in', validUnidadeIds], status: ['!in', ['Editado', 'Excluído', 'Obsoleto']] }).catch(() => []),
            AP_unidade.filter({ id_unidade: ['in', validUnidadeIds], status: ['!in', ['Editado', 'Excluído', 'Obsoleto']] }).catch(() => []),
            VO_unidade.filter({ id_unidade: ['in', validUnidadeIds], status: ['!in', ['Editado', 'Excluído', 'Obsoleto']] }).catch(() => [])
          ]);
          setRegistros([...koData, ...apData, ...voData]);
        } else {
          setRegistros([]);
        }
      } else {
        setRegistros([]);
      }
    } catch (error) {
      console.error("EmpreendimentoPage - Erro ao carregar dados iniciais:", error);
      setEmpreendimento(null);
      setRegistros([]);
      setError(error); // Set error state
      // Só redirecionar se for um erro crítico e não houver empreendimento para mostrar
      if ((error.message?.includes('404') || error.message?.includes('not found')) && !empreendimento) {
        navigate(createPageUrl("Empreendimentos"), { replace: true });
      }
    } finally {
      setLoading(false);
      loadEmpreendimentoData._running = false;
    }
  };

  useEffect(() => {
    // Só carregar dados se temos um ID válido
    if (empreendimentoId) {
      loadEmpreendimentoData();
    }
  }, [empreendimentoId, navigate]);

  const unidadeStats = useMemo(() => {
    const statsMap = {};
    unidades.forEach(unidade => {
      const registrosDaUnidade = registros.filter(r => r.id_unidade === unidade.id);
      statsMap[unidade.id] = {
        pendente: registrosDaUnidade.filter(r => r.status === 'Pendente').length,
        andamento: registrosDaUnidade.filter(r => r.status === 'Em Andamento').length,
        concluido: registrosDaUnidade.filter(r => r.status === 'Concluido').length,
        total: registrosDaUnidade.length,
      };
    });
    return statsMap;
  }, [unidades, registros]);

  // Renderização de erro se o ID for inválido
  if (!empreendimentoId) {
    return (
      <div className={`flex flex-col items-center justify-center h-screen p-8 text-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className={`text-2xl font-bold ${isDark ? 'text-red-400' : 'text-red-600'} mb-4`}>{t.invalidIdErrorTitle}</h2>
        <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} mb-6 max-w-md`}>
          {t.invalidIdErrorMessage}
        </p>
        <Button onClick={() => navigate(createPageUrl('Empreendimentos'))}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Empreendimentos
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen p-6">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
        <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t.loading}</p>
      </div>
    );
  }

  // Handle case where empreendimento is null AFTER loading finishes (e.g., not found)
  if (!empreendimento && !loading) {
    return (
      <div className="text-center p-6">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t.projectNotFound}</p>
        <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} mb-4`}>
          {t.projectNotFoundMessage} {error ? `(${error.message})` : ''}
        </p>
        <Button onClick={() => navigate(createPageUrl('Empreendimentos'), { replace: true })} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Empreendimentos
        </Button>
      </div>
    );
  }

  if (import.meta.env && import.meta.env.DEV) console.log("EmpreendimentoPage - Renderizando com:", {
    empreendimentoId: empreendimentoId,
    quantidadeUnidades: unidades.length,
    empreendimento: empreendimento?.nome_empreendimento
  });

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-2 md:p-4 space-y-4`}>
      <Button variant="outline" onClick={() => navigate(createPageUrl('Empreendimentos'))} className={`${isDark ? 'text-white border-gray-600 hover:bg-gray-800' : ''}`}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para Empreendimentos
      </Button>

      <div className="w-full max-w-full mx-auto">
        <div className="grid grid-cols-1 gap-4">
          <div className="w-full space-y-4">
            <Suspense fallback={<div className="p-4">Carregando informações...</div>}>
              <InfoGeral empreendimento={empreendimento} theme={theme} />
              <TabelaContatos contatos={empreendimento.contatos_proprietario} theme={theme} />
            </Suspense>

            {empreendimento.foto_empreendimento && (
              <div className="w-full">
                <img
                  src={getUploadUrl(empreendimento.foto_empreendimento)}
                  alt={`Foto de ${empreendimento.nome_empreendimento}`}
                  className="rounded-lg shadow-lg w-full h-auto min-h-[400px] max-h-[600px] object-cover"
                  onError={(e) => {
                    console.error('❌ Erro ao carregar imagem:', empreendimento.foto_empreendimento);
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Quick Actions - Responsivo */}
            <Card className={isDark ? 'bg-gray-800' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className={`flex items-center gap-2 text-lg ${isDark ? 'text-white' : ''}`}>
                  <Zap className="w-5 h-5" />
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-2 mb-3">
                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                    onClick={() => setShowProjetos(true)}
                  >
                    <FileText className="w-5 h-5" />
                    <span className="text-center leading-tight">{t['Projetos Originais']}</span>
                  </Button>

                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                    onClick={() => setShowManuais(true)}
                  >
                    <BookOpen className="w-5 h-5" />
                    <span className="text-center leading-tight">{t['Manuais Gerais']}</span>
                  </Button>

                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                    onClick={() => setShowGaleria(true)}
                  >
                    <Image className="w-5 h-5" />
                    <span className="text-center leading-tight">{t['Galeria de Fotos']}</span>
                  </Button>

                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                    onClick={() => setShowParticularidades(true)}
                  >
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-center leading-tight">{t['Particularidades']}</span>
                  </Button>

                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                    onClick={() => navigate(createPageUrl(`EmpreendimentoListaDocumentos?empreendimentoId=${empreendimentoId}`))}
                  >
                    <ClipboardCheck className="w-5 h-5" />
                    <span className="text-center leading-tight">{t['Lista de Documentos']}</span>
                  </Button>

                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                    onClick={() => navigate(createPageUrl(`EmpreendimentoDiariosObra?empreendimentoId=${empreendimentoId}`))}
                  >
                    <ClipboardList className="w-5 h-5" />
                    <span className="text-center leading-tight">{t['Diário de Obra']}</span>
                  </Button>

                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                    onClick={() => navigate(createPageUrl(`EmpreendimentoAtasReuniao?empreendimentoId=${empreendimentoId}`))}
                  >
                    <ClipboardList className="w-5 h-5" />
                    <span className="text-center leading-tight">{t['Ata de Reunião']}</span>
                  </Button>

                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                    onClick={() => navigate(createPageUrl(`EmpreendimentoRelatorioAnaliseTecnica?empreendimentoId=${empreendimentoId}`))}
                  >
                    <FileText className="w-5 h-5" />
                    <span className="text-center leading-tight">{t['Análise Técnica'] || 'Análise Técnica'}</span>
                  </Button>

                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                    onClick={() => navigate(createPageUrl(`EmpreendimentoVistoriaTecnica?empreendimentoId=${empreendimentoId}`))}
                  >
                    <ClipboardList className="w-5 h-5" />
                    <span className="text-center leading-tight">{t['Vistoria Técnica'] || 'Vistoria Técnica'}</span>
                  </Button>
                </div>



              </CardContent>
            </Card>

            <Suspense fallback={<div className="p-4">Carregando tabela técnica...</div>}>
              <TabelaInformacoesTecnicas informacoes={empreendimento.informacoes_tecnicas} theme={theme} />
            </Suspense>

            {/* Pastas (independentes de Ações Rápidas) */}
            <div className="space-y-2 mb-3">
              <div
                role="button"
                onClick={() => setShowGroupProcessos(!showGroupProcessos)}
                className={`flex items-center justify-between p-3 rounded cursor-pointer ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
              >
                <div className="flex items-center">
                  <Folder className="w-5 h-5 mr-2" />
                  <span className={`${isDark ? 'text-white' : 'text-gray-700'} font-medium`}>Processos Fit Out</span>
                </div>
                <ChevronRight className={`w-5 h-5 transform ${showGroupProcessos ? 'rotate-90' : ''} ${isDark ? 'text-gray-200' : 'text-gray-600'}`} />
              </div>

              <div
                role="button"
                onClick={() => setShowGroupGerenciamento(!showGroupGerenciamento)}
                className={`flex items-center justify-between p-3 rounded cursor-pointer ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
              >
                <div className="flex items-center">
                  <Folder className="w-5 h-5 mr-2" />
                  <span className={`${isDark ? 'text-white' : 'text-gray-700'} font-medium`}>Gerenciamento de Obras</span>
                </div>
                <ChevronRight className={`w-5 h-5 transform ${showGroupGerenciamento ? 'rotate-90' : ''} ${isDark ? 'text-gray-200' : 'text-gray-600'}`} />
              </div>
            </div>

            {showGroupProcessos && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 mb-4">
                <Button
                  variant="outline"
                  className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                  onClick={() => navigate(createPageUrl(`EmpreendimentoTermosAceite?empreendimentoId=${empreendimentoId}`))}
                >
                  <ClipboardList className="w-5 h-5" />
                  <span className="text-center leading-tight">{t['Termo de Aceite']}</span>
                </Button>
                <Button
                  variant="outline"
                  className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                  onClick={() => navigate(createPageUrl(`EmpreendimentoRelatorioEntrada?empreendimentoId=${empreendimentoId}`))}
                >
                  <ClipboardList className="w-5 h-5" />
                  <span className="text-center leading-tight">{t['Relatório de Entrada']}</span>
                </Button>
                <Button
                  variant="outline"
                  className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                  onClick={() => navigate(createPageUrl(`EmpreendimentoRelatoriosSaida?empreendimentoId=${empreendimentoId}`))}
                >
                  <ClipboardList className="w-5 h-5" />
                  <span className="text-center leading-tight">{t['Relatório de Saída']}</span>
                </Button>
              </div>
            )}

            {showGroupGerenciamento && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 mb-4">
                <Button
                  variant="outline"
                  className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                  onClick={() => navigate(createPageUrl(`EmpreendimentoListaDocumentosReport?empreendimentoId=${empreendimentoId}`))}
                >
                  <ClipboardList className="w-5 h-5" />
                  <span className="text-center leading-tight">{t['Relatório de Documentos']}</span>
                </Button>
                <Button
                  variant="outline"
                  className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                  onClick={() => navigate(createPageUrl(`EmpreendimentoAmostras?empreendimentoId=${empreendimentoId}`))}
                >
                  <Beaker className="w-5 h-5" />
                  <span className="text-center leading-tight">{t['Aprovação de Amostras']}</span>
                </Button>
                <Button
                  variant="outline"
                  className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                  onClick={() => navigate(createPageUrl(`EmpreendimentoNaoConformidades?empreendimentoId=${empreendimentoId}`))}
                >
                  <ClipboardList className="w-5 h-5" />
                  <span className="text-center leading-tight">{t['Não Conformidades'] || 'Não Conformidades'}</span>
                </Button>
                <Button
                  variant="outline"
                  className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                  onClick={() => navigate(createPageUrl(`EmpreendimentoVistoriaTecnica?empreendimentoId=${empreendimentoId}`))}
                >
                  <ClipboardList className="w-5 h-5" />
                  <span className="text-center leading-tight">{t['Vistoria Técnica'] || 'Vistoria Técnica'}</span>
                </Button>
                <Button
                  variant="outline"
                  className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                  onClick={() => {
                    if (!empreendimentoId) {
                      alert('ID do empreendimento não encontrado. Não é possível criar vistoria.');
                      return;
                    }
                    let url = `EmpreendimentoVistoriaObra?empreendimentoId=${empreendimentoId}`;
                    if ((unidades || []).length === 1) {
                      url += `&unidadeId=${unidades[0]?.id}`;
                    }
                    navigate(createPageUrl(url));
                  }}
                >
                  <ClipboardCheck className="w-5 h-5" />
                  <span className="text-center leading-tight">{t['Vistoria de Obra'] || 'Vistoria de Obra'}</span>
                </Button>
                <Button
                  variant="outline"
                  className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                  onClick={() => navigate(createPageUrl(`EmpreendimentoPrimeirosServicos?empreendimentoId=${empreendimentoId}`))}
                >
                  <ClipboardPlus className="w-5 h-5" />
                  <span className="text-center leading-tight">{t['Relatório de Primeiros Serviços']}</span>
                </Button>
                <Button
                  variant="outline"
                  className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                  onClick={() => navigate(createPageUrl(`EmpreendimentoRelatoriosSemanais?empreendimentoId=${empreendimentoId}`))}
                >
                  <CalendarClock className="w-5 h-5" />
                  <span className="text-center leading-tight">{t['Relatórios Semanais']}</span>
                </Button>
                <Button
                  variant="outline"
                  className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                  onClick={() => navigate(createPageUrl(`EmpreendimentoPlanoComissionamento?empreendimentoId=${empreendimentoId}`))}
                >
                  <ClipboardList className="w-5 h-5" />
                  <span className="text-center leading-tight">{t['Plano de Comissionamento']}</span>
                </Button>
                <Button
                  variant="outline"
                  className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                  onClick={() => navigate(createPageUrl(`EmpreendimentoInspecaoHidrantes?empreendimentoId=${empreendimentoId}`))}
                >
                  <ClipboardList className="w-5 h-5" />
                  <span className="text-center leading-tight">{t['Inspeção de Hidrantes']}</span>
                </Button>
                <Button
                  variant="outline"
                  className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                  onClick={() => navigate(createPageUrl(`EmpreendimentoInspecaoSprinklers?empreendimentoId=${empreendimentoId}`))}
                >
                  <ClipboardList className="w-5 h-5" />
                  <span className="text-center leading-tight">{t['Inspeção de Sprinklers']}</span>
                </Button>
                <Button
                  variant="outline"
                  className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                  onClick={() => navigate(createPageUrl(`EmpreendimentoInspecaoAlarme?empreendimentoId=${empreendimentoId}`))}
                >
                  <ClipboardList className="w-5 h-5" />
                  <span className="text-center leading-tight">{t['Inspeção de Alarme']}</span>
                </Button>
                <Button
                  variant="outline"
                  className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                  onClick={() => navigate(createPageUrl(`EmpreendimentoInspecaoArCondicionado?empreendimentoId=${empreendimentoId}`))}
                >
                  <ClipboardList className="w-5 h-5" />
                  <span className="text-center leading-tight">{t['Inspeção de Ar Condicionado']}</span>
                </Button>
                <Button
                  variant="outline"
                  className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                  onClick={() => navigate(createPageUrl(`EmpreendimentoInspecaoControleAcesso?empreendimentoId=${empreendimentoId}`))}
                >
                  <ClipboardList className="w-5 h-5" />
                  <span className="text-center leading-tight">{t['Inspeção de Controle de Acesso']}</span>
                </Button>
                <Button
                  variant="outline"
                  className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                  onClick={() => navigate(createPageUrl(`EmpreendimentoInspecaoCFTV?empreendimentoId=${empreendimentoId}`))}
                >
                  <ClipboardList className="w-5 h-5" />
                  <span className="text-center leading-tight">{t['Inspeção de CFTV']}</span>
                </Button>
                <Button
                  variant="outline"
                  className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                  onClick={() => navigate(createPageUrl(`EmpreendimentoInspecaoSDAI?empreendimentoId=${empreendimentoId}`))}
                >
                  <ClipboardList className="w-5 h-5" />
                  <span className="text-center leading-tight">{t['Inspeção de Central SDAI']}</span>
                </Button>
                <Button
                  variant="outline"
                  className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                  onClick={() => navigate(createPageUrl(`EmpreendimentoInspecaoEletrica?empreendimentoId=${empreendimentoId}`))}
                >
                  <ClipboardList className="w-5 h-5" />
                  <span className="text-center leading-tight">{t['Inspeção Elétrica']}</span>
                </Button>
                <Button
                  variant="outline"
                  className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                  onClick={() => navigate(createPageUrl(`EmpreendimentoInspecaoHidraulica?empreendimentoId=${empreendimentoId}`))}
                >
                  <ClipboardList className="w-5 h-5" />
                  <span className="text-center leading-tight">{t['Inspeção Hidráulica']}</span>
                </Button>
                <Button
                  variant="outline"
                  className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                  onClick={() => navigate(createPageUrl(`EmpreendimentoInspecaoGas?empreendimentoId=${empreendimentoId}`))}
                >
                  <ClipboardList className="w-5 h-5" />
                  <span className="text-center leading-tight">{t['Inspeção de Gás']}</span>
                </Button>
                <Button
                  variant="outline"
                  className={`h-20 flex flex-col gap-1 text-xs ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                  onClick={() => navigate(createPageUrl(`EmpreendimentoNaoConformidades?empreendimentoId=${empreendimentoId}`))}
                >
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-center leading-tight">{t['Não Conformidade']}</span>
                </Button>
              </div>
            )}

            {/* Unidades - Responsivo */}
            <Card className={`${isDark ? 'bg-gray-800' : ''}`}>
              <CardHeader className="pb-3">
                <CardTitle className={`flex items-center gap-2 text-lg ${isDark ? 'text-white' : ''}`}>
                  <Building className="w-5 h-5" />
                  Unidades
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Button variant="outline" onClick={() => setShowUnidades(!showUnidades)} className="h-10 text-sm">
                  <Layers className="w-4 h-4 mr-2" />
                  {showUnidades ? 'Ocultar Unidades' : 'Ver Unidades'}
                </Button>
                <Button variant="outline" onClick={() => setShowNovaUnidade(true)} className="h-10 text-sm">
                  <Building className="w-4 h-4 mr-2" />
                  Adicionar Unidade
                </Button>
                <Button variant="outline" onClick={() => navigate(createPageUrl(`EditarEmpreendimento?empreendimentoId=${empreendimentoId}`))} className="h-10 text-sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Empreendimento
                </Button>
              </CardContent>
            </Card>

            {showUnidades && (
              <Card className={`${isDark ? 'bg-gray-800' : ''}`}>
                <CardHeader className="pb-3">
                  <CardTitle className={`text-lg ${isDark ? 'text-white' : ''}`}>Unidades</CardTitle>
                </CardHeader>
                <CardContent>
                  {unidades.length > 0 ? (
                    <Suspense fallback={<div className="p-4">Carregando unidades...</div>}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {unidades.map(unidade => (
                          <UnidadeCard
                            key={unidade.id}
                            unidade={unidade}
                            stats={unidadeStats[unidade.id]}
                            empreendimentoId={empreendimentoId}
                            language={language}
                            theme={theme}
                          />
                        ))}
                      </div>
                    </Suspense>
                  ) : (
                    <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-center py-4`}>Nenhuma unidade</p>
                  )}
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>

      {/* Dialogs (lazy-loaded) */}
      <Suspense fallback={null}>
        <NovaUnidadeDialog
          open={showNovaUnidade}
          onOpenChange={setShowNovaUnidade}
          id_empreendimento={empreendimento?.id}
          onSuccess={loadEmpreendimentoData}
          language={language}
          theme={theme}
        />
        <GaleriaFotosDialog
          open={showGaleria}
          onOpenChange={setShowGaleria}
          empreendimento={empreendimento}
          fotos={empreendimento?.fotos_empreendimento || []}
          nomeEmpreendimento={empreendimento?.nome_empreendimento}
          language={language}
          theme={theme}
        />
        <ManuaisGeraisDialog
          open={showManuais}
          onOpenChange={setShowManuais}
          empreendimentoId={empreendimento?.id}
          language={language}
          theme={theme}
        />
        <ProjetosOriginaisDialog
          open={showProjetos}
          onOpenChange={setShowProjetos}
          empreendimentoId={empreendimento?.id}
          language={language}
          theme={theme}
        />
        <ParticularidadesDialog
          open={showParticularidades}
          onOpenChange={setShowParticularidades}
          empreendimento={empreendimento}
          language={language}
          theme={theme}
        />
      </Suspense>
    </div>
  );
}

export default EmpreendimentoPage;