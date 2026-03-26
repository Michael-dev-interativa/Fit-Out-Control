import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { apiUrl } from '@/api/config.js';
import { TermoDeAceite, Empreendimento, UnidadeEmpreendimento } from '@/api/entities';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from '@/components/ui/alert-dialog';
import { TermoDeAceite as TermoEntity } from '@/api/entities';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Eye, Edit, Loader2, AlertTriangle, CheckSquare, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const translations = {
  pt: {
    title: "Termos de Aceite",
    backToProject: "Voltar ao Empreendimento",
    newTermo: "Novo Termo de Aceite",
    loading: "Carregando termos...",
    noTermos: "Nenhum termo de aceite cadastrado.",
    addFirst: "Adicione o primeiro termo de aceite para este empreendimento.",
    unit: "Unidade",
    date: "Data",
    status: "Status",
    view: "Visualizar",
    statusEmAndamento: "Em Andamento",
    statusAceito: "Aceito",
    statusPendente: "Pendente de Ajustes",
    error: "Erro ao carregar dados"
  },
  en: {
    title: "Acceptance Terms",
    backToProject: "Back to Project",
    newTermo: "New Acceptance Term",
    loading: "Loading terms...",
    noTermos: "No acceptance terms registered.",
    addFirst: "Add the first acceptance term for this project.",
    unit: "Unit",
    date: "Date",
    status: "Status",
    view: "View",
    statusEmAndamento: "In Progress",
    statusAceito: "Accepted",
    statusPendente: "Pending Adjustments",
    error: "Error loading data"
  }
};

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'Aceito':
      return 'bg-green-100 text-green-800';
    case 'Em Andamento':
      return 'bg-blue-100 text-blue-800';
    case 'Pendente de Ajustes':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function EmpreendimentoTermosAceite({ language: initialLanguage, theme: initialTheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const empreendimentoId = urlParams.get('empreendimentoId');

  const [termos, setTermos] = useState([]);
  const [empreendimento, setEmpreendimento] = useState(null);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [language, setLanguage] = useState(initialLanguage || 'pt');
  const [theme, setTheme] = useState(initialTheme || 'light');

  const t = translations[language];
  const isDark = theme === 'dark';

  useEffect(() => {
    const handleLanguageChange = () => setLanguage(localStorage.getItem('language') || 'pt');
    const handleThemeChange = () => setTheme(localStorage.getItem('theme') || 'light');
    window.addEventListener('language-change', handleLanguageChange);
    window.addEventListener('theme-change', handleThemeChange);
    handleLanguageChange();
    handleThemeChange();
    return () => {
      window.removeEventListener('language-change', handleLanguageChange);
      window.removeEventListener('theme-change', handleThemeChange);
    };
  }, []);

  useEffect(() => {
    loadData();
  }, [empreendimentoId]);

  const loadData = async () => {
    if (!empreendimentoId) {
      setError(true);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Primeiro tentamos buscar o empreendimento; se não existir (404), logamos e seguimos
      let empData = null;
      try {
        empData = await Empreendimento.get(empreendimentoId);
      } catch (err) {
        console.warn('Empreendimento.get falhou, seguindo para carregar termos/unidades:', err && err.message ? err.message : err);
        empData = null;
      }

      // Buscar termos e unidades independentemente do resultado do Empreendimento.get
      const [termosData, unidadesData] = await Promise.all([
        TermoDeAceite.filter({ id_empreendimento: empreendimentoId }, '-created_date').catch(() => []),
        UnidadeEmpreendimento.filter({ id_empreendimento: empreendimentoId }).catch(() => [])
      ]);

      // Fallback: se API oficial retornar vazia, tentar endpoint de debug (retorna linhas cruas do DB)
      let finalTermos = termosData || [];
      if ((!finalTermos || finalTermos.length === 0) && empreendimentoId) {
        try {
          console.warn('Termos vazios da API; consultando /api/debug/termos-aceite as fallback');
          const resp = await fetch(apiUrl(`/api/debug/termos-aceite/${empreendimentoId}`));
          if (resp.ok) {
            const j = await resp.json();
            if (j && Array.isArray(j.rows) && j.rows.length > 0) {
              finalTermos = j.rows;
              console.warn('Fallback debug retornou termos:', j.count);
            }
          } else {
            console.warn('Fallback debug não ok', resp.status);
          }
        } catch (e) {
          console.warn('Erro ao chamar fallback debug:', e);
        }
      }

      setEmpreendimento(empData);
      setTermos(finalTermos || []);
      setUnidades(unidadesData || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const getUnidadeNome = (id_unidade) => {
    const unidade = unidades.find(u => u.id === id_unidade);
    return unidade?.unidade_empreendimento || 'N/A';
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
        <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>{t.loading}</p>
      </div>
    );
  }

  if (error || !empreendimento) {
    // Se houve erro ao buscar o empreendimento, mas existem termos, mostramos os termos.
    // Apenas exibimos erro severo quando não há termo nem empreendimento.
    if (termos.length > 0) {
      // continuar para renderizar a lista (empreendimento ficará nulo e o cabeçalho usa fallback)
    } else {
      return (
        <div className="flex flex-col items-center justify-center h-screen p-8">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-4`}>{t.error}</p>
          <Button onClick={() => navigate(createPageUrl(`Empreendimento?empreendimentoId=${empreendimentoId}`))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.backToProject}
          </Button>
        </div>
      );
    }
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-4`}>
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl(`Empreendimento?empreendimentoId=${empreendimentoId}`))}
            className={isDark ? 'text-white border-gray-600 hover:bg-gray-800' : ''}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.backToProject}
          </Button>
          <Button
            onClick={() => {
              if (unidades && unidades.length > 0) {
                const primeiraUnidade = unidades[0];
                navigate(createPageUrl(`PreencherTermoDeAceite?empreendimentoId=${empreendimentoId}&unidadeId=${primeiraUnidade.id}`));
              } else {
                navigate(createPageUrl(`PreencherTermoDeAceite?empreendimentoId=${empreendimentoId}`));
              }
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t.newTermo}
          </Button>
        </div>

        <Card className={isDark ? 'bg-gray-800' : ''}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
              <CheckSquare className="w-5 h-5" />
              {t.title} - {empreendimento?.nome_empreendimento || `Empreendimento ${empreendimentoId}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {termos.length === 0 ? (
              <div className="text-center py-12">
                <CheckSquare className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-2`}>{t.noTermos}</p>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{t.addFirst}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {termos.map((termo) => (
                  <Card key={termo.id} className={`${isDark ? 'bg-gray-700' : 'bg-white'} hover:shadow-md transition-shadow relative`}>
                    <div className="absolute top-3 right-3 z-20">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>Tem certeza que deseja excluir este termo? Esta ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={async () => {
                              try {
                                const resp = await TermoEntity.delete(termo.id);
                                toast.success('Termo excluído');
                                loadData();
                              } catch (e) {
                                console.error('Erro ao excluir termo:', e);
                                toast.error('Erro ao excluir termo');
                              }
                            }} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <CardContent className="p-4 pr-12">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {termo.nome_termo}
                          </h3>
                          <div className="flex gap-4 mt-2 text-sm">
                            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                              {t.unit}: {getUnidadeNome(termo.id_unidade)}
                            </span>
                            {termo.data_termo && (
                              <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                {t.date}: {format(new Date(termo.data_termo), 'dd/MM/yyyy', { locale: pt })}
                              </span>
                            )}
                          </div>
                          <div className="mt-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(termo.status_termo)}`}>
                              {termo.status_termo === 'Em Andamento' ? t.statusEmAndamento :
                                termo.status_termo === 'Aceito' ? t.statusAceito :
                                  termo.status_termo === 'Pendente de Ajustes' ? t.statusPendente :
                                    termo.status_termo}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const unidadeParam = termo.id_unidade && String(termo.id_unidade).toLowerCase() !== 'null' ? `&unidadeId=${termo.id_unidade}` : '';
                              navigate(createPageUrl(`PreencherTermoDeAceite?termoId=${termo.id}${unidadeParam}&empreendimentoId=${empreendimentoId}`));
                            }}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(createPageUrl(`VisualizarTermoAceite?termoId=${termo.id}`))}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            {t.view}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div >
  );
}