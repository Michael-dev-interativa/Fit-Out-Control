import React, { useState, useEffect } from "react";
import { User, Usuario, Empreendimento, Auth, UsuarioEmpreendimentos } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
  Search,
  UserPlus,
  Shield,
  User as UserIcon,
  Mail,
  Calendar,
  Building2,
  Eye,
  Settings,
  X,
  Check
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const translations = {
  pt: {
    title: "Usuários",
    subtitle: "Gerencie os usuários do sistema",
    inviteUser: "Convidar Usuário",
    createUser: "Cadastrar Usuário",
    searchPlaceholder: "Buscar por nome ou email...",
    restrictedAccess: "Acesso Restrito",
    adminOnly: "Apenas usuários administradores podem acessar esta página.",
    registeredOn: "Cadastrado em",
    admin: "Administrador",
    user: "Usuário",
    cliente: "Cliente",
    noResults: "Nenhum usuário encontrado",
    noUsers: "Nenhum usuário cadastrado",
    tryAdjustingSearch: "Tente ajustar os termos de busca",
    inviteNewUsers: "Convide novos usuários para começar",
    configureAccess: "Configurar Acesso",
    linkedProjects: "Empreendimentos Vinculados",
    selectProjects: "Selecione os empreendimentos que este cliente pode visualizar",
    save: "Salvar",
    cancel: "Cancelar",
    accessUpdated: "Acesso atualizado com sucesso",
    userRole: "Perfil do Usuário",
  },
  en: {
    title: "Users",
    subtitle: "Manage system users",
    inviteUser: "Invite User",
    createUser: "Create User",
    searchPlaceholder: "Search by name or email...",
    restrictedAccess: "Restricted Access",
    adminOnly: "Only administrators can access this page.",
    registeredOn: "Registered on",
    admin: "Admin",
    user: "User",
    cliente: "Client",
    noResults: "No user found",
    noUsers: "No users registered",
    tryAdjustingSearch: "Try adjusting your search terms",
    inviteNewUsers: "Invite new users to get started",
    configureAccess: "Configure Access",
    linkedProjects: "Linked Projects",
    selectProjects: "Select the projects this client can view",
    save: "Save",
    cancel: "Cancel",
    accessUpdated: "Access updated successfully",
    userRole: "User Role",
  },
};


export default function Usuarios({ language: initialLanguage }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [language, setLanguage] = useState(initialLanguage || 'pt');
  const [theme, setTheme] = useState('light');
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedEmpreendimentos, setSelectedEmpreendimentos] = useState([]);
  const [selectedRole, setSelectedRole] = useState('user');
  const [saving, setSaving] = useState(false);
  const [editedEmail, setEditedEmail] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user', isCliente: false, empreendimentos: [] });

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
    const handleThemeChange = () => {
      const storedTheme = localStorage.getItem('theme') || 'light';
      setTheme(storedTheme);
    };
    handleThemeChange(); // Set initial theme
    window.addEventListener('theme-change', handleThemeChange); // Listen for custom theme change event
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  const t = translations[language];
  const isDark = theme === 'dark';

  useEffect(() => {
    loadUsuarios();
    loadCurrentUser();
  }, []);

  const loadUsuarios = async () => {
    try {
      const data = await Usuario.list("-created_at");
      const mapped = (data || []).map(u => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name || u.nome || (u.email ? String(u.email).split('@')[0] : ''),
        role: u.role || 'user',
        perfil_cliente: !!u.perfil_cliente || (u.role === 'cliente'),
        created_date: u.created_date || u.created_at || new Date().toISOString(),
        empreendimentos_vinculados: (() => {
          const v = u.empreendimentos_vinculados;
          if (!v) return [];
          if (Array.isArray(v)) return v.map((x) => (typeof x === 'object' && x !== null ? x.id : x)).filter((x) => x !== undefined && x !== null);
          if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean);
          return [];
        })()
      }));
      setUsuarios(mapped);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    }
    setLoading(false);
  };

  const loadCurrentUser = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("Erro ao carregar usuário atual:", error);
    }
  };

  const loadEmpreendimentos = async () => {
    try {
      const data = await Empreendimento.list("-created_date");
      setEmpreendimentos(data);
    } catch (error) {
      console.error("Erro ao carregar empreendimentos:", error);
    }
  };

  useEffect(() => {
    loadEmpreendimentos();
  }, []);

  const openConfigDialog = async (usuario) => {
    setSelectedUser(usuario);
    setSelectedRole(usuario.perfil_cliente ? 'cliente' : (usuario.role || 'user'));
    const toIds = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) {
        return val
          .map((x) => (typeof x === 'object' && x !== null ? x.id : x))
          .filter((v) => v !== undefined && v !== null)
          .map((v) => String(v));
      }
      return [];
    };
    // Buscar vínculos do backend
    try {
      const idsSrv = await UsuarioEmpreendimentos.get(usuario.id);
      const norm = (idsSrv || []).map(v => String(typeof v === 'object' ? v.id : v));
      setSelectedEmpreendimentos(norm);
    } catch {
      setSelectedEmpreendimentos(toIds(usuario.empreendimentos_vinculados));
    }
    setEditedEmail(usuario.email || '');
    setConfigDialogOpen(true);
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    return pwd;
  };

  const openCreateDialog = () => {
    setNewUser({ name: '', email: '', password: generatePassword(), role: 'user', isCliente: false, empreendimentos: [] });
    setCreateDialogOpen(true);
  };

  const handleEmpreendimentoToggle = (empreendimentoId) => {
    const key = String(empreendimentoId);
    setSelectedEmpreendimentos(prev => {
      if (prev.includes(key)) {
        return prev.filter(id => id !== key);
      }
      return [...prev, key];
    });
  };

  const handleSaveConfig = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const isCliente = selectedRole === 'cliente';
      const ids = (selectedEmpreendimentos || [])
        .map((x) => (typeof x === 'object' ? x.id : x))
        .map((v) => {
          const n = parseInt(v, 10);
          return Number.isNaN(n) ? String(v) : n;
        });
      const updateData = {
        perfil_cliente: isCliente,
        role: isCliente ? 'cliente' : (selectedRole === 'admin' ? 'admin' : 'user'),
        empreendimentos_vinculados: isCliente ? ids : []
      };

      // Permitir que administradores ajustem o email do usuário
      if (editedEmail && editedEmail !== selectedUser.email) {
        updateData.email = editedEmail.trim();
      }

      // Quando não for cliente, garantir role coerente
      if (!isCliente && (selectedRole === 'admin' || selectedRole === 'user')) {
        updateData.role = selectedRole;
      }

      console.log("Salvando dados do usuário:", updateData);
      await Usuario.update(selectedUser.id, updateData);
      if (isCliente) {
        try {
          await UsuarioEmpreendimentos.set(selectedUser.id, ids);
        } catch (e) {
          // Fallback: se endpoint não existir (404), persistir em `perfil`
          console.warn('Fallback: salvando vínculos no perfil JSON');
          await Usuario.update(selectedUser.id, { perfil: { empreendimentos_vinculados: ids } });
        }
      } else {
        // Se deixou de ser cliente, zera vínculos
        try { await UsuarioEmpreendimentos.set(selectedUser.id, []); } catch { await Usuario.update(selectedUser.id, { perfil: { empreendimentos_vinculados: [] } }); }
      }
      console.log("Usuário atualizado com sucesso");
      toast.success(t.accessUpdated);
      setConfigDialogOpen(false);
      loadUsuarios();
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      toast.error("Erro ao atualizar acesso");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    const email = (newUser.email || '').trim();
    const name = (newUser.name || '').trim();
    const password = (newUser.password || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Informe um email válido');
      return;
    }
    if (!name) {
      toast.error('Informe o nome do usuário');
      return;
    }
    setSaving(true);
    try {
      // Preservar token do admin para não perder sessão ao registrar
      const adminToken = (() => { try { return localStorage.getItem('authToken') || localStorage.getItem('token'); } catch { return null; } })();

      await Auth.register(email, password, name);

      // Restaurar sessão do admin imediatamente
      try { if (adminToken) localStorage.setItem('authToken', adminToken); } catch { }

      // localizar usuário recém-criado
      let created = null;
      try {
        const results = await Usuario.filter({ email });
        if (Array.isArray(results) && results.length > 0) created = results[0];
      } catch { }
      if (!created) {
        try {
          const all = await Usuario.list();
          created = (all || []).find(u => (u.email || '').toLowerCase() === email.toLowerCase());
        } catch { }
      }
      if (created) {
        const updateData = {
          role: newUser.isCliente ? 'cliente' : newUser.role,
          perfil_cliente: !!newUser.isCliente,
          empreendimentos_vinculados: newUser.isCliente ? (newUser.empreendimentos || []) : []
        };
        try { await Usuario.update(created.id, updateData); } catch { }
        try {
          if (newUser.isCliente) {
            await UsuarioEmpreendimentos.set(created.id, newUser.empreendimentos || []);
          } else {
            await UsuarioEmpreendimentos.set(created.id, []);
          }
        } catch (e) {
          // Fallback para perfil JSON se endpoint de vínculos não existir
          const ids = (newUser.empreendimentos || []).map(v => parseInt(v, 10)).filter(v => !Number.isNaN(v));
          await Usuario.update(created.id, { perfil: { empreendimentos_vinculados: newUser.isCliente ? ids : [] } });
        }
      }
      toast.success(`Usuário cadastrado. Senha provisória: ${password}`);
      setCreateDialogOpen(false);
      await loadUsuarios();
    } catch (err) {
      console.error('Erro ao cadastrar usuário', err);
      toast.error('Erro ao cadastrar usuário');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsuarios = usuarios.filter(user => {
    const name = (user.full_name || user.nome || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    return name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
  });

  // Verificar se o usuário atual é admin
  if (currentUser?.role !== "admin") {
    return (
      <div className="p-6">
        <Card className={`max-w-md mx-auto text-center ${isDark ? 'bg-gray-800' : ''}`}>
          <CardContent className="p-8">
            <Shield className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>{t.restrictedAccess}</h2>
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
              {t.adminOnly}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.title}</h1>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-4">
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={openCreateDialog}>
            <UserPlus className="w-4 h-4 mr-2" />
            {t.createUser}
          </Button>
          <img
            src={theme === 'dark'
              ? "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1a0999f3c_logo_Interativa_letra_branca_sem_fundo_gg.png"
              : "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f1e898ee3_logo_Interativa_versao_final_sem_fundo_0002.png"
            }
            alt="Logo Interativa Engenharia"
            className="h-24 hidden lg:block"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {Array(5).fill(0).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredUsuarios.map((usuario) => (
            <Card key={usuario.id} className={`hover:shadow-md transition-shadow ${isDark ? 'bg-gray-800' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <UserIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{usuario.full_name || usuario.nome || usuario.email}</h3>
                      <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Mail className="w-4 h-4" />
                        {usuario.email}
                      </div>
                      <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                        <Calendar className="w-4 h-4" />
                        {t.registeredOn} {format(new Date(usuario.created_date || new Date()), "dd/MM/yyyy")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={usuario.role === "admin" ? "default" : "secondary"}
                      className={
                        usuario.role === "admin"
                          ? "bg-purple-100 text-purple-800"
                          : usuario.perfil_cliente
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                      }
                    >
                      {usuario.role === "admin" ? (
                        <>
                          <Shield className="w-3 h-3 mr-1" />
                          {t.admin}
                        </>
                      ) : usuario.perfil_cliente ? (
                        <>
                          <Eye className="w-3 h-3 mr-1" />
                          {t.cliente}
                        </>
                      ) : (
                        <>
                          <UserIcon className="w-3 h-3 mr-1" />
                          {t.user}
                        </>
                      )}
                    </Badge>
                    {usuario.perfil_cliente && usuario.empreendimentos_vinculados?.length > 0 && (
                      <Badge variant="outline" className={isDark ? 'border-gray-600' : ''}>
                        <Building2 className="w-3 h-3 mr-1" />
                        {usuario.empreendimentos_vinculados.length} empreendimento(s)
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openConfigDialog(usuario)}
                      className={isDark ? 'hover:bg-gray-700' : ''}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredUsuarios.length === 0 && (
            <Card className={`p-12 text-center ${isDark ? 'bg-gray-800' : ''}`}>
              <Users className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
                {searchTerm ? t.noResults : t.noUsers}
              </h3>
              <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                {searchTerm
                  ? t.tryAdjustingSearch
                  : t.inviteNewUsers
                }
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Dialog de Configuração de Acesso */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className={`max-w-lg ${isDark ? 'bg-gray-800 text-white' : ''}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : ''}>
              {t.configureAccess} - {selectedUser?.full_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className={isDark ? 'text-gray-300' : ''}>Email</Label>
              <Input
                type="email"
                value={editedEmail}
                onChange={(e) => setEditedEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
              />
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Defina ou ajuste o email de login deste usuário. O usuário não precisa criar o próprio email.
              </p>
            </div>
            <div className="space-y-2">
              <Label className={isDark ? 'text-gray-300' : ''}>{t.userRole}</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t.admin}</SelectItem>
                  <SelectItem value="user">{t.user}</SelectItem>
                  <SelectItem value="cliente">{t.cliente}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedRole === 'cliente' && (
              <div className="space-y-3">
                <Label className={isDark ? 'text-gray-300' : ''}>{t.linkedProjects}</Label>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t.selectProjects}
                </p>
                <div className={`max-h-60 overflow-y-auto space-y-2 p-3 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  {empreendimentos.map((emp) => (
                    <div key={emp.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={String(emp.id)}
                        checked={selectedEmpreendimentos.some((v) => String(v) === String(emp.id))}
                        onCheckedChange={() => handleEmpreendimentoToggle(emp.id)}
                      />
                      <Label
                        htmlFor={String(emp.id)}
                        className={`flex-1 cursor-pointer ${isDark ? 'text-gray-200' : ''}`}
                      >
                        {emp.nome_empreendimento}
                        {emp.cli_empreendimento && (
                          <span className={`text-sm ml-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            ({emp.cli_empreendimento})
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                  {empreendimentos.length === 0 && (
                    <p className={`text-sm text-center py-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Nenhum empreendimento cadastrado
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleSaveConfig} disabled={saving}>
              {saving ? "Salvando..." : t.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Cadastro de Usuário */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className={`max-w-lg ${isDark ? 'bg-gray-800 text-white' : ''}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : ''}>{t.createUser}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className={isDark ? 'text-gray-300' : ''}>Nome</Label>
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser(u => ({ ...u, name: e.target.value }))}
                placeholder="Nome completo"
                className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label className={isDark ? 'text-gray-300' : ''}>Email</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser(u => ({ ...u, email: e.target.value }))}
                placeholder="usuario@empresa.com"
                className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label className={isDark ? 'text-gray-300' : ''}>Senha provisória</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newUser.password}
                  onChange={(e) => setNewUser(u => ({ ...u, password: e.target.value }))}
                  className={`flex-1 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                />
                <Button type="button" variant="outline" onClick={() => setNewUser(u => ({ ...u, password: generatePassword() }))}>Gerar</Button>
              </div>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Você pode informar ou gerar uma senha temporária.</p>
            </div>
            <div className="space-y-2">
              <Label className={isDark ? 'text-gray-300' : ''}>{t.userRole}</Label>
              <Select value={newUser.isCliente ? 'cliente' : newUser.role} onValueChange={(v) => setNewUser(u => ({ ...u, isCliente: v === 'cliente', role: v === 'cliente' ? 'user' : v }))}>
                <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t.admin}</SelectItem>
                  <SelectItem value="user">{t.user}</SelectItem>
                  <SelectItem value="cliente">{t.cliente}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newUser.isCliente && (
              <div className="space-y-3">
                <Label className={isDark ? 'text-gray-300' : ''}>{t.linkedProjects}</Label>
                <div className={`max-h-60 overflow-y-auto space-y-2 p-3 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  {empreendimentos.map((emp) => (
                    <div key={emp.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={`create-${emp.id}`}
                        checked={newUser.empreendimentos.includes(emp.id)}
                        onCheckedChange={() => setNewUser(u => ({ ...u, empreendimentos: u.empreendimentos.includes(emp.id) ? u.empreendimentos.filter(id => id !== emp.id) : [...u.empreendimentos, emp.id] }))}
                      />
                      <Label htmlFor={`create-${emp.id}`} className={`flex-1 cursor-pointer ${isDark ? 'text-gray-200' : ''}`}>
                        {emp.nome_empreendimento}
                      </Label>
                    </div>
                  ))}
                  {empreendimentos.length === 0 && (
                    <p className={`text-sm text-center py-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Nenhum empreendimento cadastrado</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleCreateUser} disabled={saving}>
              {saving ? 'Salvando...' : t.createUser}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}