import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User, Empreendimento } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, FileText, Eye, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DashboardCliente({ language: initialLanguage, theme: initialTheme }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [empreendimentos, setEmpreendimentos] = useState([]);
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
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      if (currentUser.empreendimentos_vinculados && currentUser.empreendimentos_vinculados.length > 0) {
        const empreendimentosData = await Promise.all(
          currentUser.empreendimentos_vinculados.map(id =>
            Empreendimento.get(id).catch(() => null)
          )
        );
        setEmpreendimentos(empreendimentosData.filter(e => e !== null));
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-8 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Bem-vindo, {user?.full_name || 'Cliente'}
          </h1>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
            Portal do Cliente - Visualização de Relatórios
          </p>
        </div>
        <img
          src={isDark
            ? "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1a0999f3c_logo_Interativa_letra_branca_sem_fundo_gg.png"
            : "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f1e898ee3_logo_Interativa_versao_final_sem_fundo_0002.png"
          }
          alt="Logo Interativa Engenharia"
          className="h-32"
        />
      </div>

      <div>
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
          <Building2 className="inline-block w-5 h-5 mr-2" />
          Seus Empreendimentos
        </h2>

        {empreendimentos.length === 0 ? (
          <Card className={isDark ? 'bg-gray-800 border-gray-700' : ''}>
            <CardContent className="p-8 text-center">
              <Building2 className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                Nenhum empreendimento vinculado à sua conta.
              </p>
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Entre em contato com o administrador para solicitar acesso.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {empreendimentos.map((empreendimento) => (
              <Card
                key={empreendimento.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${isDark ? 'bg-gray-800 border-gray-700 hover:border-blue-500' : 'hover:border-blue-300'}`}
                onClick={() => navigate(createPageUrl(`RelatoriosCliente?empreendimentoId=${empreendimento.id}`))}
              >
                <CardHeader className="pb-2">
                  {empreendimento.foto_empreendimento && (
                    <img
                      src={empreendimento.foto_empreendimento}
                      alt={empreendimento.nome_empreendimento}
                      className="w-full h-32 object-cover rounded-md mb-3"
                    />
                  )}
                  <CardTitle className={`text-lg ${isDark ? 'text-white' : ''}`}>
                    {empreendimento.nome_empreendimento}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {empreendimento.endereco_empreendimento || 'Endereço não informado'}
                  </p>
                  <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    Cliente: {empreendimento.cli_empreendimento || '-'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`mt-4 w-full ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Relatórios
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}