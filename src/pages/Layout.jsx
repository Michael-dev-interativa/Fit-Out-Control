
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Auth, User } from "@/api/entities";
import ApiConnectionAlert from "@/components/ApiConnectionAlert";
import {
  Building2,
  Home,
  Users,
  LogOut,
  Menu,
  Globe,
  Sun,
  Moon,
  FileText,
  Calendar,
  ListChecks,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const translations = {
  pt: {
    dashboard: "Dashboard",
    dashboardCliente: "Meus Relatórios",
    projects: "Empreendimentos",
    users: "Usuários",
    forms: "Formulários",
    planning: "Planejamento",
    standardActivities: "Atividades Padrão",
    logout: "Sair",
    language: "Idioma",
    theme: "Tema",
    welcome: "Bem-vindo",
    fitOut: "Fit Out",
    assetManagement: "Gestão de Ativos",
    light: "Claro",
    dark: "Escuro"
  },
  en: {
    dashboard: "Dashboard",
    dashboardCliente: "My Reports",
    projects: "Projects",
    users: "Users",
    forms: "Forms",
    planning: "Planning",
    standardActivities: "Standard Activities",
    logout: "Logout",
    language: "Language",
    theme: "Theme",
    welcome: "Welcome",
    fitOut: "Fit Out",
    assetManagement: "Asset Management",
    light: "Light",
    dark: "Dark"
  }
};

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [language, setLanguage] = useState("pt");
  const [theme, setTheme] = useState("light");
  const buildUserFromLocal = () => {
    try {
      const roleLocal = (localStorage.getItem('appRole') || '').toLowerCase();
      const perfilLocal = localStorage.getItem('perfilCliente') === 'true';
      const emailLocal = localStorage.getItem('userEmail') || localStorage.getItem('lastLoginEmail') || null;
      const nomeLocal = localStorage.getItem('userName') || (emailLocal ? emailLocal.split('@')[0] : '');
      const idStr = localStorage.getItem('userId');
      const idLocal = idStr ? Number(idStr) : null;
      if (roleLocal || perfilLocal || emailLocal) {
        const finalRoleLocal = roleLocal === 'admin' ? 'admin' : (roleLocal === 'cliente' ? 'cliente' : (perfilLocal ? 'cliente' : 'user'));
        return { id: idLocal, email: emailLocal, nome: nomeLocal, role: finalRoleLocal, perfil_cliente: finalRoleLocal === 'cliente' };
      }
    } catch { }
    return null;
  };
  const [user, setUser] = useState(() => buildUserFromLocal());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [redirectChecked, setRedirectChecked] = useState(false);

  // Detect if the current page is a report page to render it without the main layout
  const reportPagePaths = [
    '/VisualizarRelatorioVistoria',
    '/VisualizarRelatorioAnalise',
    '/VisualizarRelatorioKickOff',
    '/GaleriaRelatorio',
    '/VisualizarDiarioObra',
    '/VisualizarAprovacaoAmostra',
    '/VisualizarVistoriaTerminalidade',
    '/GaleriaVistoriaTerminalidade',
    '/VisualizarRelatorioSemanal',
    '/VisualizarRelatorioPrimeirosServicos',
    '/VisualizarInspecaoArCondicionado'
  ];
  const isReportPage = reportPagePaths.some(path => location.pathname.startsWith(path));

  // Páginas de autenticação não devem exibir sidebar/header
  const authPaths = ['/Login', '/login', '/Register', '/register'];
  const isAuthPage = authPaths.includes(location.pathname);

  useEffect(() => {
    const storedLang = localStorage.getItem('language');
    const storedTheme = localStorage.getItem('theme');
    if (storedLang) {
      setLanguage(storedLang);
    }
    if (storedTheme) {
      setTheme(storedTheme);
    }

    // Adicionar meta tag para prevenir dark mode forçado no mobile
    let metaColorScheme = document.querySelector('meta[name="color-scheme"]');
    if (!metaColorScheme) {
      metaColorScheme = document.createElement('meta');
      metaColorScheme.name = 'color-scheme';
      document.head.appendChild(metaColorScheme);
    }

    // Definir o color-scheme baseado no tema escolhido
    if (storedTheme === 'dark') {
      metaColorScheme.content = 'dark';
      document.documentElement.style.colorScheme = 'dark';
    } else {
      metaColorScheme.content = 'light';
      document.documentElement.style.colorScheme = 'light';
    }

    // Se já temos usuário do localStorage, não deixar em branco antes do fetch
    const uLocal = buildUserFromLocal();
    if (uLocal && !user) {
      console.log('Layout - inicializando a partir do localStorage:', uLocal);
      setUser(uLocal);
    }
    loadUser();
  }, []);

  // Redireciona para Login quando não há token
  useEffect(() => {
    try {
      const hasToken = !!(localStorage.getItem('authToken') || localStorage.getItem('token'));
      if (!hasToken && !isAuthPage) {
        navigate(createPageUrl('Login'));
      }
    } catch { }
  }, [location.pathname]);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
    window.dispatchEvent(new Event('language-change'));
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    // Atualizar meta tag de color-scheme
    const metaColorScheme = document.querySelector('meta[name="color-scheme"]');
    if (metaColorScheme) {
      metaColorScheme.content = newTheme === 'dark' ? 'dark' : 'light';
    }
    document.documentElement.style.colorScheme = newTheme === 'dark' ? 'dark' : 'light';

    window.dispatchEvent(new Event('theme-change'));
  };

  const t = translations[language];

  const getNavigationItems = (currentUser) => {
    const localPerfil = (() => { try { return localStorage.getItem('perfilCliente'); } catch { return null; } })();
    const localRole = (() => { try { return localStorage.getItem('appRole'); } catch { return null; } })();
    const isCliente = !!(currentUser?.perfil_cliente || currentUser?.role === 'cliente' || localPerfil === 'true' || localRole === 'cliente');
    if (isCliente) {
      return [
        {
          title: t.dashboardCliente,
          url: createPageUrl("DashboardCliente"),
          icon: Eye,
        },
      ];
    }

    return [
      {
        title: t.dashboard,
        url: createPageUrl("Dashboard"),
        icon: Home,
      },
      {
        title: t.projects,
        url: createPageUrl("Empreendimentos"),
        icon: Building2,
      },
      {
        title: t.planning,
        url: createPageUrl("Planejamento"),
        icon: Calendar,
        adminOnly: true
      },
      {
        title: t.users,
        url: createPageUrl("Usuarios"),
        icon: Users,
        adminOnly: true
      },
      {
        title: t.forms,
        url: createPageUrl("GerenciarFormularios"),
        icon: FileText,
        adminOnly: true
      },
      {
        title: t.standardActivities,
        url: createPageUrl("AtividadesPadrao"),
        icon: ListChecks,
        adminOnly: true
      },
    ];
  };

  const navigationItems = getNavigationItems(user);

  const loadUser = async () => {
    try {
      const me = await User.me();
      if (!me) {
        // Fallback: construir usuário mínimo a partir do localStorage
        try {
          console.log('Layout - me nulo, verificando localStorage para fallback');
          const roleLocal = (localStorage.getItem('appRole') || '').toLowerCase();
          const perfilLocal = localStorage.getItem('perfilCliente') === 'true';
          const emailLocal = localStorage.getItem('userEmail') || localStorage.getItem('lastLoginEmail') || null;
          const nomeLocal = localStorage.getItem('userName') || (emailLocal ? emailLocal.split('@')[0] : '');
          const idStr = localStorage.getItem('userId');
          const idLocal = idStr ? Number(idStr) : null;
          if (roleLocal || perfilLocal || emailLocal) {
            const finalRoleLocal = roleLocal === 'admin' ? 'admin' : (roleLocal === 'cliente' ? 'cliente' : (perfilLocal ? 'cliente' : 'user'));
            const currentUserLocal = { id: idLocal, email: emailLocal, nome: nomeLocal, role: finalRoleLocal, perfil_cliente: finalRoleLocal === 'cliente' };
            console.log("Layout - Fallback localStorage:", currentUserLocal);
            setUser(currentUserLocal);
            setRedirectChecked(true);
            return;
          }
          console.log('Layout - Fallback localStorage indisponível');
        } catch { }
        setUser(null);
        setRedirectChecked(true);
        return;
      }
      // Resolver papel final baseando apenas no token/`me`
      const roleMe = (me?.role || '').toLowerCase();
      let finalRole = (roleMe === 'admin') ? 'admin' : (roleMe === 'cliente' ? 'cliente' : 'user');
      const perfilCliente = me?.perfil_cliente === true || finalRole === 'cliente';
      const currentUser = { ...me, role: finalRole, perfil_cliente: perfilCliente };
      // Persistir papel/perfil para consistência entre renders
      try {
        if (currentUser?.role) localStorage.setItem('appRole', String(currentUser.role));
        if (currentUser?.perfil_cliente !== undefined) localStorage.setItem('perfilCliente', String(!!currentUser.perfil_cliente));
      } catch { }
      console.log("Layout - Usuário carregado:", currentUser);
      console.log("Layout - perfil_cliente value:", currentUser?.perfil_cliente);
      setUser(currentUser);
      setRedirectChecked(true);
    } catch (error) {
      console.log("Erro ao carregar usuário:", error.message || error);
      setUser(null);
      setRedirectChecked(true);
    }
  };

  // Verifica redirecionamento quando user ou location mudam
  useEffect(() => {
    console.log("Layout - User:", user);
    console.log("Layout - perfil_cliente:", user?.perfil_cliente);
    const localPerfil = (() => { try { return localStorage.getItem('perfilCliente'); } catch { return null; } })();
    const localRole = (() => { try { return localStorage.getItem('appRole'); } catch { return null; } })();
    const isCliente = (user?.perfil_cliente === true || user?.role === 'cliente' || localPerfil === 'true' || localRole === 'cliente');
    const currentPath = (location.pathname || '').toLowerCase();
    console.log('Layout - currentPath:', currentPath, 'localPerfil:', localPerfil, 'localRole:', localRole, 'isCliente:', isCliente);
    if (isCliente) {
      const allowedClientPages = ['/dashboardcliente', '/relatorioscliente', '/visualizarinspecaohidrantes', '/visualizarinspecaoarcondicionado', '/visualizarinspecaosprinklers', '/visualizarinspecaoalarme', '/visualizarinspecaosdai', '/visualizarinspecaocftv', '/visualizarinspecaocontroleacesso'];
      const isAllowed = allowedClientPages.some(page => currentPath.startsWith(page));
      console.log("Layout - isAllowed:", isAllowed);

      if (!isAllowed && !isReportPage) {
        console.log("Layout - Redirecionando para DashboardCliente");
        navigate(createPageUrl('DashboardCliente'));
      }
    }
  }, [user, location.pathname]);

  const handleLogout = async () => {
    try {
      Auth.logout();
      try { localStorage.removeItem('appRole'); localStorage.removeItem('perfilCliente'); } catch { }
      setUser(null);
      navigate(createPageUrl('Login'));
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  // If it's a report page, render only the children without theme prop
  if (isReportPage) {
    return (
      <main className="min-h-screen bg-gray-50">
        {children}
      </main>
    );
  }

  // Se for página de autenticação (Login/Registro), não renderizar layout com sidebar/header
  if (isAuthPage) {
    return (
      <main className="min-h-screen">
        <ApiConnectionAlert />
        {children}
      </main>
    );
  }

  // Aguarda verificação de redirecionamento para clientes
  if (!redirectChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const NavItems = ({ mobile = false, user }) => (
    <div className={`${mobile ? 'space-y-1' : 'space-y-2'}`}>
      {getNavigationItems(user)
        .filter(item => !item.adminOnly || (user?.role === "admin"))
        .map((item) => (
          <Link
            key={item.title}
            to={item.url}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${location.pathname === item.url
              ? (theme === 'dark'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-blue-600 text-white shadow-lg')
              : (theme === 'dark'
                ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900')
              }`}
            onClick={() => mobile && setIsMobileMenuOpen(false)}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.title}</span>
          </Link>
        ))}
    </div>
  );

  const isDark = theme === 'dark';
  const logoUrl = isDark
    ? "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1a0999f3c_logo_Interativa_letra_branca_sem_fundo_gg.png"
    : "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f1e898ee3_logo_Interativa_versao_final_sem_fundo_0002.png";

  return (
    <div className={`min-h-screen flex ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Sidebar Desktop */}
      <aside className={`hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:z-50 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} lg:border-r print:!hidden`}>
        <div className="flex flex-col flex-1 min-h-0">
          <div className={`flex flex-col items-center justify-center px-4 py-6 ${isDark ? 'border-gray-700' : 'border-gray-200'} border-b`}>
            <img src={logoUrl} alt="Logo Interativa Engenharia" className="h-20 mb-2" />
            <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.fitOut}</h1>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t.assetManagement}</p>
          </div>

          <div className="flex-1 px-4 py-6">
            <NavItems user={user} />
          </div>

          <div className={`px-4 py-6 ${isDark ? 'border-gray-700' : 'border-gray-200'} border-t`}>
            <div className="mb-4">
              <Select value={theme} onValueChange={handleThemeChange}>
                <SelectTrigger className={`w-full ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}>
                  <div className="flex items-center gap-2">
                    {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t.light}</SelectItem>
                  <SelectItem value="dark">{t.dark}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mb-4">
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className={`w-full ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {user && (
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{user.full_name}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{user.email}</p>
                  <p className="text-xs text-blue-600 font-medium capitalize">{user.role}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className={`w-full flex items-center gap-2 ${isDark ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : ''}`}
                >
                  <LogOut className="w-4 h-4" />
                  {t.logout}
                </Button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-72 print:!pl-0 flex flex-col flex-1 min-h-screen">
        {/* Mobile Header */}
        <header className={`lg:hidden print:!hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-4 py-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className={`w-6 h-6 ${isDark ? 'text-white' : ''}`} />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className={`w-72 p-0 ${isDark ? 'bg-gray-800' : ''}`}>
                  <div className="flex flex-col h-full">
                    <div className={`flex flex-col items-center justify-center px-4 py-6 ${isDark ? 'border-gray-700' : 'border-gray-200'} border-b`}>
                      <img src={logoUrl} alt="Logo Interativa Engenharia" className="h-20 mb-2" />
                      <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.fitOut}</h1>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t.assetManagement}</p>
                    </div>

                    <div className="flex-1 px-4 py-6">
                      <NavItems mobile user={user} />
                    </div>

                    <div className={`px-4 py-6 ${isDark ? 'border-gray-700' : 'border-gray-200'} border-t`}>
                      {user && (
                        <Button
                          variant="outline"
                          onClick={handleLogout}
                          className={`w-full flex items-center gap-2 ${isDark ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : ''}`}
                        >
                          <LogOut className="w-4 h-4" />
                          {t.logout}
                        </Button>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <img src={logoUrl} alt="Logo Interativa Engenharia" className="h-10" />
            </div>

            <div className="flex items-center gap-2">
              {/* Theme Toggle Button for Mobile */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')}
                className={isDark ? 'text-white hover:bg-gray-700' : ''}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>

              {/* Language Selector for Mobile */}
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className={`w-24 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}>
                  <Globe className="w-4 h-4" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">PT</SelectItem>
                  <SelectItem value="en">EN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">
          {React.Children.map(children, child =>
            React.cloneElement(child, { language, theme })
          )}
        </main>
      </div>
    </div>
  );
}
