import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Empreendimento, User, InspecaoHidrantes, InspecaoSprinklers, InspecaoAlarmeIncendio, InspecaoSDAI, InspecaoCFTV, InspecaoControleAcesso, InspecaoArCondicionado } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Eye,
  Loader2,
  FileText,
  Flame,
  Droplets,
  Wind,
  Camera,
  DoorOpen,
  AlertTriangle,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const tiposRelatorio = [
  {
    key: 'hidrantes',
    label: 'Inspeção de Hidrantes',
    icon: Droplets,
    color: 'blue',
    entity: 'InspecaoHidrantes',
    viewPage: 'VisualizarInspecaoHidrantes'
  },
  {
    key: 'sprinklers',
    label: 'Inspeção de Sprinklers',
    icon: Droplets,
    color: 'cyan',
    entity: 'InspecaoSprinklers',
    viewPage: 'VisualizarInspecaoSprinklers'
  },
  {
    key: 'alarme',
    label: 'Inspeção de Alarme de Incêndio',
    icon: Flame,
    color: 'red',
    entity: 'InspecaoAlarmeIncendio',
    viewPage: 'VisualizarInspecaoAlarme'
  },
  {
    key: 'sdai',
    label: 'Inspeção SDAI',
    icon: AlertTriangle,
    color: 'orange',
    entity: 'InspecaoSDAI',
    viewPage: 'VisualizarInspecaoSDAI'
  },
  {
    key: 'cftv',
    label: 'Inspeção de CFTV',
    icon: Camera,
    color: 'purple',
    entity: 'InspecaoCFTV',
    viewPage: 'VisualizarInspecaoCFTV'
  },
  {
    key: 'controleAcesso',
    label: 'Inspeção de Controle de Acesso',
    icon: DoorOpen,
    color: 'green',
    entity: 'InspecaoControleAcesso',
    viewPage: 'VisualizarInspecaoControleAcesso'
  },
  {
    key: 'arCondicionado',
    label: 'Inspeção de Ar Condicionado',
    icon: Wind,
    color: 'teal',
    entity: 'InspecaoArCondicionado',
    viewPage: 'VisualizarInspecaoArCondicionado'
  },
];

export default function RelatoriosCliente({ language: initialLanguage, theme: initialTheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const empreendimentoId = new URLSearchParams(location.search).get('empreendimentoId');

  const [empreendimento, setEmpreendimento] = useState(null);
  const [relatorios, setRelatorios] = useState({});
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(initialTheme || 'light');

  const isDark = theme === 'dark';

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
    if (empreendimentoId) {
      loadData();
    }
  }, [empreendimentoId]);

  const loadData = async () => {
    try {
      // Verificar se o cliente tem acesso a este empreendimento usando nosso backend
      const currentUser = await User.me();
      const vinculos = Array.isArray(currentUser?.empreendimentos_vinculados) ? currentUser.empreendimentos_vinculados.map((v) => String(v)) : [];
      const isCliente = currentUser?.perfil_cliente === true || (currentUser?.role === 'cliente');
      const hasAccess = !isCliente || vinculos.includes(String(empreendimentoId));
      if (!hasAccess) {
        navigate(createPageUrl('DashboardCliente'));
        return;
      }

      const empreendimentoData = await Empreendimento.get(empreendimentoId);
      setEmpreendimento(empreendimentoData);

      // Carregar relatórios de cada tipo via nossos wrappers
      const relatoriosData = {};
      const entityClients = {
        InspecaoHidrantes,
        InspecaoSprinklers,
        InspecaoAlarmeIncendio,
        InspecaoSDAI,
        InspecaoCFTV,
        InspecaoControleAcesso,
        InspecaoArCondicionado,
      };
      await Promise.all(
        tiposRelatorio.map(async (tipo) => {
          try {
            const client = entityClients[tipo.entity];
            const data = client ? await client.filter({ id_empreendimento: empreendimentoId }, "-data_inspecao") : [];
            relatoriosData[tipo.key] = data;
          } catch (error) {
            console.error(`Erro ao carregar ${tipo.label}:`, error);
            relatoriosData[tipo.key] = [];
          }
        })
      );
      setRelatorios(relatoriosData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: isDark ? 'bg-blue-900/30 text-blue-400 border-blue-700' : 'bg-blue-50 text-blue-700 border-blue-200',
      cyan: isDark ? 'bg-cyan-900/30 text-cyan-400 border-cyan-700' : 'bg-cyan-50 text-cyan-700 border-cyan-200',
      red: isDark ? 'bg-red-900/30 text-red-400 border-red-700' : 'bg-red-50 text-red-700 border-red-200',
      orange: isDark ? 'bg-orange-900/30 text-orange-400 border-orange-700' : 'bg-orange-50 text-orange-700 border-orange-200',
      purple: isDark ? 'bg-purple-900/30 text-purple-400 border-purple-700' : 'bg-purple-50 text-purple-700 border-purple-200',
      green: isDark ? 'bg-green-900/30 text-green-400 border-green-700' : 'bg-green-50 text-green-700 border-green-200',
      teal: isDark ? 'bg-teal-900/30 text-teal-400 border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200',
    };
    return colors[color] || colors.blue;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('DashboardCliente'))}
            className={`mb-2 ${isDark ? 'text-gray-400 hover:text-white' : ''}`}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {empreendimento?.nome_empreendimento}
          </h1>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
            Relatórios disponíveis para visualização
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {tiposRelatorio.map((tipo) => {
          const relatoriosTipo = relatorios[tipo.key] || [];
          const Icon = tipo.icon;

          if (relatoriosTipo.length === 0) return null;

          return (
            <Card key={tipo.key} className={isDark ? 'bg-gray-800 border-gray-700' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
                  <div className={`p-2 rounded-lg ${getColorClasses(tipo.color)}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {tipo.label}
                  <span className={`ml-2 text-sm font-normal ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    ({relatoriosTipo.length} relatório{relatoriosTipo.length !== 1 ? 's' : ''})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {relatoriosTipo.map((relatorio) => (
                    <div
                      key={relatorio.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                    >
                      <div className="flex items-center gap-4">
                        <FileText className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        <div>
                          <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {relatorio.titulo_relatorio || 'Relatório sem título'}
                          </p>
                          <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            <Calendar className="w-4 h-4" />
                            {relatorio.data_inspecao ?
                              format(new Date(relatorio.data_inspecao), "dd/MM/yyyy", { locale: ptBR }) :
                              'Data não informada'
                            }
                            {relatorio.revisao && (
                              <span className="ml-2">• Rev. {relatorio.revisao}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(createPageUrl(`${tipo.viewPage}?relatorioId=${relatorio.id}`))}
                        className={isDark ? 'border-gray-600 hover:bg-gray-700' : ''}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Visualizar
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {Object.values(relatorios).every(arr => arr.length === 0) && (
          <Card className={isDark ? 'bg-gray-800 border-gray-700' : ''}>
            <CardContent className="p-8 text-center">
              <FileText className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                Nenhum relatório disponível para este empreendimento.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}