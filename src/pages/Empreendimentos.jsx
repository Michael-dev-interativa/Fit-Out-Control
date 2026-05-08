import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Empreendimento } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, Search, Bell, Square } from "lucide-react";
import { Input } from "@/components/ui/input";

import EmpreendimentoCard from "../components/empreendimentos/EmpreendimentoCard";
import NovoEmpreendimentoDialog from "../components/empreendimentos/NovoEmpreendimentoDialog";

const ITEMS_PER_PAGE = 50;

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const buildEmpreendimentoBusinessKey = (empreendimento) => {
  const nome = normalizeText(empreendimento?.nome_empreendimento || empreendimento?.nome);
  const cliente = normalizeText(empreendimento?.cliente || empreendimento?.cli_empreendimento);
  const osNumber = normalizeText(empreendimento?.os_number);
  const siglaObra = normalizeText(empreendimento?.sigla_obra);
  const endereco = normalizeText(empreendimento?.endereco || empreendimento?.endereco_empreendimento);
  return [nome, cliente, osNumber, siglaObra, endereco].join('|');
};

const dedupeEmpreendimentos = (items) => {
  const seen = new Set();
  return (items || []).filter((empreendimento) => {
    const key = buildEmpreendimentoBusinessKey(empreendimento);
    if (!key.replace(/\|/g, '')) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// Validação de ID compatível com banco (aceita inteiros positivos e strings não vazias)
const isValidId = (id) => {
  if (id === null || id === undefined) return false;
  const cleanId = String(id).trim();
  if (!cleanId || cleanId === '-' || cleanId === 'null' || cleanId === 'undefined' || cleanId === 'NaN') return false;
  // Aceita numéricos positivos (ex.: 1, 2, 123)
  if (/^\d+$/.test(cleanId)) {
    return Number(cleanId) > 0;
  }
  // Para IDs não numéricos, exige pelo menos 8 caracteres (ex.: UUID)
  return cleanId.length >= 8;
};

const translations = {
  pt: {
    title: "Empreendimentos",
    subtitle: "Gerencie todos os prédios comerciais",
    newProject: "Novo Empreendimento",
    searchPlaceholder: "Buscar por nome ou cliente...",
    noResults: "Nenhum resultado encontrado",
    noProjects: "Nenhum empreendimento cadastrado",
    tryAdjustingSearch: "Tente ajustar os termos de busca",
    addFirstProject: "Comece adicionando seu primeiro empreendimento",
    addProject: "Adicionar Empreendimento",
    loadMore: "Carregar Mais"
  },
  en: {
    title: "Projects",
    subtitle: "Manage all commercial buildings",
    newProject: "New Project",
    searchPlaceholder: "Search by name or client...",
    noResults: "No results found",
    noProjects: "No projects registered",
    tryAdjustingSearch: "Try adjusting your search terms",
    addFirstProject: "Start by adding your first project",
    addProject: "Add Project",
    loadMore: "Load More"
  },
};

export default function Empreendimentos({ language: initialLanguage }) {
  const [todosEmpreendimentos, setTodosEmpreendimentos] = useState([]); // Todos os empreendimentos
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNovoDialog, setShowNovoDialog] = useState(false);
  const [language, setLanguage] = useState(initialLanguage || 'pt');
  const [theme, setTheme] = useState('light');
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => {
    const handleLanguageChange = () => {
      const storedLang = localStorage.getItem('language') || 'pt';
      setLanguage(storedLang);
    };
    window.addEventListener('language-change', handleLanguageChange);
    handleLanguageChange();
    return () => window.removeEventListener('language-change', handleLanguageChange);
  }, []);

  useEffect(() => {
    const getSystemTheme = () => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    const handleThemeChange = () => {
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme) {
        setTheme(storedTheme);
      } else {
        setTheme(getSystemTheme());
      }
    };

    window.addEventListener('theme-change', handleThemeChange);
    handleThemeChange();
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  const t = translations[language];
  const isDark = theme === 'dark';

  // Carrega todos os empreendimentos na inicialização
  useEffect(() => {
    const loadAllEmpreendimentos = async () => {
      setLoading(true);
      try {
        console.log("Carregando todos os empreendimentos...");
        const data = await Empreendimento.list("-created_date", 1000); // Carrega até 1000 registros
        console.log("Empreendimentos carregados (antes do filtro):", data.length);

        // Filtra registros com IDs inválidos usando a função melhorada
        const validData = data.filter(emp => {
          if (!emp) {
            console.warn("Empreendimento nulo detectado e removido");
            return false;
          }

          const valid = isValidId(emp.id);
          if (!valid) {
            console.warn("ID inválido detectado e removido:", emp.id, "- Empreendimento:", emp.nome_empreendimento);
          }
          return valid;
        });

        const uniqueData = dedupeEmpreendimentos(validData);
        console.log("Empreendimentos válidos (depois do filtro):", validData.length);
        console.log("Empreendimentos únicos (depois da deduplicação):", uniqueData.length);
        setTodosEmpreendimentos(uniqueData);
      } catch (error) {
        console.error("Erro ao carregar empreendimentos:", error);
        setTodosEmpreendimentos([]);
      } finally {
        setLoading(false);
      }
    };

    loadAllEmpreendimentos();
  }, []);

  // Filtra os empreendimentos baseado no termo de busca
  const empreendimentosFiltrados = useMemo(() => {
    if (!searchTerm.trim()) {
      return todosEmpreendimentos;
    }

    const termo = searchTerm.toLowerCase().trim();
    console.log("Filtrando com termo:", termo);

    const filtrados = todosEmpreendimentos.filter(emp => {
      const nomeMatch = emp.nome_empreendimento?.toLowerCase().includes(termo) || emp.nome?.toLowerCase().includes(termo);
      const clienteMatch = emp.cli_empreendimento?.toLowerCase().includes(termo) || emp.cliente?.toLowerCase().includes(termo);
      return nomeMatch || clienteMatch;
    });

    console.log("Resultados filtrados:", filtrados.length);
    return filtrados;
  }, [todosEmpreendimentos, searchTerm]);

  // Pagina os resultados filtrados
  const empreendimentosPaginados = useMemo(() => {
    const startIndex = 0;
    const endIndex = currentPage * ITEMS_PER_PAGE;
    return empreendimentosFiltrados.slice(startIndex, endIndex);
  }, [empreendimentosFiltrados, currentPage]);

  // Verifica se há mais itens para carregar
  const hasMore = currentPage * ITEMS_PER_PAGE < empreendimentosFiltrados.length;

  // Reset da página quando o termo de busca muda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleLoadMore = () => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleSuccess = () => {
    setShowNovoDialog(false);
    // Recarrega todos os empreendimentos
    const reloadData = async () => {
      const data = await Empreendimento.list("-created_date", 1000);
      const validData = data.filter(emp => emp && isValidId(emp.id));
      setTodosEmpreendimentos(dedupeEmpreendimentos(validData));
    };
    reloadData();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <h1 className={`text-2xl font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t.title}
        </h1>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`pl-9 ${isDark ? 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-500' : ''}`}
          />
        </div>
        <button
          className={`relative p-2 rounded-lg transition-colors ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}
          title="Notificações"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <Button
          onClick={() => setShowNovoDialog(true)}
          className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm font-medium shrink-0"
          variant="outline"
        >
          <Square className="w-4 h-4 mr-2 text-gray-500" />
          {t.newProject}
        </Button>
      </div>



      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded-t-lg"></div>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : empreendimentosPaginados.length === 0 ? (
        <Card className={`p-12 text-center ${isDark ? 'bg-gray-800' : ''}`}>
          <Building2 className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-500' : 'text-gray-300'}`} />
          <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
            {searchTerm ? t.noResults : t.noProjects}
          </h3>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} mb-6`}>
            {searchTerm
              ? t.tryAdjustingSearch
              : t.addFirstProject
            }
          </p>
          {!searchTerm && (
            <Button onClick={() => setShowNovoDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t.addProject}
            </Button>
          )}
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {empreendimentosPaginados.map((empreendimento) => {
              // A validação principal agora é feita na carga dos dados.
              // O Card interno ainda terá sua própria validação como uma segunda camada.
              return (
                <EmpreendimentoCard
                  key={empreendimento.id}
                  empreendimento={empreendimento}
                  onUpdate={handleSuccess}
                  language={language}
                />
              );
            })}
          </div>
          {hasMore && (
            <div className="text-center mt-8">
              <Button onClick={handleLoadMore}>
                {t.loadMore}
              </Button>
            </div>
          )}
        </>
      )}

      <NovoEmpreendimentoDialog
        open={showNovoDialog}
        onOpenChange={setShowNovoDialog}
        onSuccess={handleSuccess}
        language={language}
      />
    </div>
  );
}