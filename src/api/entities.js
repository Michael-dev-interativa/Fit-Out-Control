// Cliente local: wrappers que chamam nosso backend Express
import { apiUrl } from './config';
function getAuthToken() {
  try { return localStorage.getItem('authToken') || localStorage.getItem('token') || null; } catch { return null; }
}
function getAuthHeaders(extra = {}) {
  const h = { ...extra };
  const t = getAuthToken();
  console.log('🔑 Auth Token:', t ? `${t.substring(0, 20)}...` : 'NENHUM TOKEN');
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

async function handleResponse(r, resource, action) {
  if (r.ok) return r.json();
  let payload = null;
  try {
    payload = await r.json();
  } catch {
    try { payload = await r.text(); } catch { payload = null; }
  }
  console.error(`[API ERROR] ${action} ${resource} failed`, {
    status: r.status,
    url: r.url,
    payload,
    headers: Object.fromEntries(r.headers.entries())
  });
  throw new Error(`${action} ${resource} failed`);
}

const makeEntity = (resource) => ({
  async list(order) {
    const params = new URLSearchParams();
    if (order) params.append('order', order);
    const url = apiUrl(`/api/${resource}?${params.toString()}`);
    console.log(`[API] LIST ${resource} -> ${url}`);
    const r = await fetch(url, { headers: getAuthHeaders() });
    return handleResponse(r, resource, 'LIST');
  },
  async filter(criteria = {}, order) {
    const params = new URLSearchParams();
    Object.entries(criteria || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, v);
    });
    if (order) params.append('order', order);
    const url = apiUrl(`/api/${resource}?${params.toString()}`);
    const r = await fetch(url, { headers: getAuthHeaders() });
    return handleResponse(r, resource, 'FILTER');
  },
  async get(id) {
    const url = apiUrl(`/api/${resource}/${id}`);
    const r = await fetch(url, { headers: getAuthHeaders() });
    return handleResponse(r, resource, `GET ${id}`);
  },
  async create(data) {
    const url = apiUrl(`/api/${resource}`);
    const r = await fetch(url, {
      method: 'POST', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(data)
    });
    return handleResponse(r, resource, 'CREATE');
  },
  async update(id, data) {
    const url = apiUrl(`/api/${resource}/${id}`);
    const r = await fetch(url, {
      method: 'PUT', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(data)
    });
    return handleResponse(r, resource, `UPDATE ${id}`);
  },
  async delete(id) {
    const url = apiUrl(`/api/${resource}/${id}`);
    const r = await fetch(url, { method: 'DELETE', headers: getAuthHeaders() });
    return handleResponse(r, resource, `DELETE ${id}`);
  }
});

export const Empreendimento = makeEntity('empreendimentos');
export const UnidadeEmpreendimento = makeEntity('unidades-empreendimento');
export const AP_unidade = makeEntity('aps-unidade');
export const KO_unidade = makeEntity('kos-unidade');
export const VO_unidade = makeEntity('vos-unidade');
export const FormularioVistoria = makeEntity('formularios-vistoria');
// Respostas de vistoria são expostas como vistorias
export const RespostaVistoria = makeEntity('vistorias');
export const RelatorioSemanal = makeEntity('relatorios-semanais');
export const RelatorioPrimeirosServicos = makeEntity('relatorios-primeiros-servicos');
export const AprovacaoAmostra = makeEntity('aprovacoes-amostra');
export const VistoriaTerminalidade = makeEntity('vistorias-terminalidade');
export const InspecaoHidrantes = makeEntity('inspecoes-hidrantes');
export const InspecaoSprinklers = makeEntity('inspecoes-sprinklers');
export const InspecaoAlarmeIncendio = makeEntity('inspecoes-alarme-incendio');
export const InspecaoArCondicionado = makeEntity('inspecoes-ar-condicionado');
export const InspecaoControleAcesso = makeEntity('inspecoes-controle-acesso');
export const InspecaoCFTV = makeEntity('inspecoes-cftv');
export const InspecaoSDAI = makeEntity('inspecoes-sdai');
export const InspecaoEletrica = makeEntity('inspecoes-eletrica');

// Placeholders para entidades ainda não mapeadas no backend
export const Usuario = makeEntity('usuarios');
// Vínculos de empreendimentos por usuário
export const UsuarioEmpreendimentos = {
  async get(userId) {
    const url = apiUrl(`/api/usuarios/${userId}/empreendimentos`);
    const r = await fetch(url, { headers: getAuthHeaders() });
    return handleResponse(r, `usuarios/${userId}/empreendimentos`, 'GET');
  },
  async set(userId, ids) {
    const url = apiUrl(`/api/usuarios/${userId}/empreendimentos`);
    const r = await fetch(url, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ids: ids || [] })
    });
    return handleResponse(r, `usuarios/${userId}/empreendimentos`, 'PUT');
  }
};
export const RegistroUnidade = makeEntity('registros-unidade');
export const DocumentosUnidade = makeEntity('documentos-unidade');
export const RegistroGeral = makeEntity('registros-gerais');
export const DisciplinaGeral = makeEntity('disciplinas-gerais');
export const ProjetoOriginal = makeEntity('projetos-originais');
export const ManualGeral = makeEntity('manuais-gerais');
export const ParticularidadeEmpreendimento = makeEntity('particularidades-empreendimento');
export const AtividadePlanejamento = makeEntity('atividades-planejamento');
export const Execucao = makeEntity('execucoes');
export const Atividade = makeEntity('atividades');
export const DiarioDeObra = makeEntity('diarios-obra');
export const RDO = makeEntity('rdos');
export const ListaDocumentosReport = makeEntity('lista-documentos-report');

// Auth local mínima
export const User = {
  ...makeEntity('usuarios'),
  async me() {
    console.log('🔍 User.me() - INICIANDO');
    console.log('🔑 Token:', getAuthToken() ? 'PRESENTE' : 'AUSENTE');
    try {
      let url = apiUrl('/api/auth/me');
      let r = await fetch(url, { headers: getAuthHeaders() });
      console.log('📡 /api/auth/me - Status:', r.status);

      if (!r.ok) {
        url = apiUrl('/api/usuarios/me');
        r = await fetch(url, { headers: getAuthHeaders() });
        console.log('📡 /api/usuarios/me - Status:', r.status);
      }

      if (!r.ok) {
        console.log('⚠️ User.me() - Backend falhou, usando fallback localStorage');
        // Fallback: reconstruir usuário a partir do localStorage
        try {
          const role = (localStorage.getItem('appRole') || '').toLowerCase();
          const perfilCliente = localStorage.getItem('perfilCliente') === 'true';
          const email = localStorage.getItem('userEmail') || localStorage.getItem('lastLoginEmail') || null;
          const nome = localStorage.getItem('userName') || (email ? email.split('@')[0] : null);
          const idStr = localStorage.getItem('userId');
          const id = idStr ? Number(idStr) : null;
          console.log('📦 localStorage fallback - role:', role, 'perfilCliente:', perfilCliente);
          if (role || perfilCliente || email) {
            const finalRole = role === 'admin' ? 'admin' : (role === 'cliente' ? 'cliente' : (perfilCliente ? 'cliente' : 'user'));
            const fallbackUser = { id, email, nome, role: finalRole, perfil_cliente: finalRole === 'cliente' };
            console.log('✅ User.me() - Retornando fallback:', fallbackUser);
            return fallbackUser;
          }
        } catch { }
        console.log('❌ User.me() - Fallback falhou, retornando null');
        return null;
      }

      const userData = await r.json();
      console.log('✅ User.me() - Backend retornou:', userData);
      return userData;
    } catch (error) {
      console.log('⚠️ User.me() - ERRO DE REDE:', error.message);
      // Fallback em erro de rede
      try {
        const role = (localStorage.getItem('appRole') || '').toLowerCase();
        const perfilCliente = localStorage.getItem('perfilCliente') === 'true';
        const email = localStorage.getItem('userEmail') || localStorage.getItem('lastLoginEmail') || null;
        const nome = localStorage.getItem('userName') || (email ? email.split('@')[0] : null);
        const idStr = localStorage.getItem('userId');
        const id = idStr ? Number(idStr) : null;
        console.log('📦 localStorage fallback (erro) - role:', role, 'perfilCliente:', perfilCliente);
        if (role || perfilCliente || email) {
          const finalRole = role === 'admin' ? 'admin' : (role === 'cliente' ? 'cliente' : (perfilCliente ? 'cliente' : 'user'));
          const fallbackUser = { id, email, nome, role: finalRole, perfil_cliente: finalRole === 'cliente' };
          console.log('✅ User.me() - Retornando fallback após erro:', fallbackUser);
          return fallbackUser;
        }
      } catch { }
      console.log('❌ User.me() - Falhou completamente, retornando null');
      return null;
    }
  }
};

export const Auth = {
  async login(email, password) {
    console.log('🔐 Auth.login() - INICIANDO para:', email);
    const url = apiUrl('/api/auth/login');
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await handleResponse(r, 'auth', 'LOGIN');
    console.log('📥 Auth.login() - Backend retornou:', data);
    console.log('👤 Backend user.role:', data?.user?.role);
    console.log('👤 Backend user.perfil_cliente:', data?.user?.perfil_cliente);

    try {
      console.log('🧹 Auth.login() - Limpando localStorage antigo');
      // Limpar TODOS os dados antigos antes de salvar os novos
      this.logout();

      console.log('💾 Auth.login() - Salvando novos dados no localStorage');
      // Salvar novo token
      localStorage.setItem('authToken', data.token);
      const role = data?.user?.role || null;
      const perfilCliente = data?.user?.perfil_cliente === true || role === 'cliente';
      if (role) localStorage.setItem('appRole', String(role));
      localStorage.setItem('perfilCliente', String(perfilCliente));
      console.log('💾 Salvou appRole:', role);
      console.log('💾 Salvou perfilCliente:', perfilCliente);

      // Persistir dados básicos do usuário para fallback
      if (email) localStorage.setItem('userEmail', String(email));
      localStorage.setItem('lastLoginEmail', String(email || ''));
      const nome = data?.user?.nome || '';
      if (nome) localStorage.setItem('userName', String(nome));
      const id = data?.user?.id;
      if (id !== undefined) localStorage.setItem('userId', String(id));
      try { localStorage.setItem('userJson', JSON.stringify(data?.user || {})); } catch { }

      console.log('✅ Auth.login() - localStorage atualizado');
    } catch (e) {
      console.error('❌ Auth.login() - Erro ao salvar no localStorage:', e);
    }
    return data;
  },
  async register(email, password, nome) {
    const url = apiUrl('/api/auth/register');
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nome })
    });
    const data = await handleResponse(r, 'auth', 'REGISTER');
    try {
      // Limpar dados antigos antes de salvar novos
      Auth.logout();
      // Salvar novo token
      localStorage.setItem('authToken', data.token);
      // Salvar dados do novo usuário se disponíveis
      if (data?.user) {
        const role = data.user.role || null;
        const perfilCliente = data.user.perfil_cliente === true || role === 'cliente';
        if (role) localStorage.setItem('appRole', String(role));
        localStorage.setItem('perfilCliente', String(perfilCliente));
        if (email) localStorage.setItem('userEmail', String(email));
        localStorage.setItem('lastLoginEmail', String(email || ''));
        const nomeUsuario = data.user.nome || '';
        if (nomeUsuario) localStorage.setItem('userName', String(nomeUsuario));
        const id = data.user.id;
        if (id !== undefined) localStorage.setItem('userId', String(id));
        try { localStorage.setItem('userJson', JSON.stringify(data.user || {})); } catch { }
      }
    } catch { }
    return data;
  },
  logout() {
    try {
      // Remove todos os dados de autenticação
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      localStorage.removeItem('appRole');
      localStorage.removeItem('perfilCliente');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('lastLoginEmail');
      localStorage.removeItem('userName');
      localStorage.removeItem('userId');
      localStorage.removeItem('userJson');
    } catch { }
  }
};