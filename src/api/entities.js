// Cliente local: wrappers que chamam nosso backend Express
import { apiUrl } from './config';
function getAuthToken() {
  try { return localStorage.getItem('authToken') || localStorage.getItem('token') || null; } catch { return null; }
}
function getAuthHeaders(extra = {}) {
  const h = { ...extra };
  const t = getAuthToken();
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
  console.error(`${action} ${resource} failed`, { status: r.status, payload });
  throw new Error(`${action} ${resource} failed`);
}

const makeEntity = (resource) => ({
  async list(order) {
    const params = new URLSearchParams();
    if (order) params.append('order', order);
    const r = await fetch(apiUrl(`/api/${resource}?${params.toString()}`), { headers: getAuthHeaders() });
    return handleResponse(r, resource, 'LIST');
  },
  async filter(criteria = {}, order) {
    const params = new URLSearchParams();
    Object.entries(criteria || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, v);
    });
    if (order) params.append('order', order);
    const r = await fetch(apiUrl(`/api/${resource}?${params.toString()}`), { headers: getAuthHeaders() });
    return handleResponse(r, resource, 'FILTER');
  },
  async get(id) {
    const r = await fetch(apiUrl(`/api/${resource}/${id}`), { headers: getAuthHeaders() });
    return handleResponse(r, resource, `GET ${id}`);
  },
  async create(data) {
    const r = await fetch(apiUrl(`/api/${resource}`), {
      method: 'POST', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(data)
    });
    return handleResponse(r, resource, 'CREATE');
  },
  async update(id, data) {
    const r = await fetch(apiUrl(`/api/${resource}/${id}`), {
      method: 'PUT', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(data)
    });
    return handleResponse(r, resource, `UPDATE ${id}`);
  },
  async delete(id) {
    const r = await fetch(apiUrl(`/api/${resource}/${id}`), { method: 'DELETE', headers: getAuthHeaders() });
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
    const r = await fetch(apiUrl(`/api/usuarios/${userId}/empreendimentos`), { headers: getAuthHeaders() });
    return handleResponse(r, `usuarios/${userId}/empreendimentos`, 'GET');
  },
  async set(userId, ids) {
    const r = await fetch(apiUrl(`/api/usuarios/${userId}/empreendimentos`), {
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

// Auth local mínima
export const User = {
  ...makeEntity('usuarios'),
  async me() {
    try {
      let r = await fetch(apiUrl('/api/auth/me'), { headers: getAuthHeaders() });
      if (!r.ok) r = await fetch(apiUrl('/api/usuarios/me'), { headers: getAuthHeaders() });
      if (!r.ok) {
        // Fallback: reconstruir usuário a partir do localStorage
        try {
          const role = (localStorage.getItem('appRole') || '').toLowerCase();
          const perfilCliente = localStorage.getItem('perfilCliente') === 'true';
          const email = localStorage.getItem('userEmail') || localStorage.getItem('lastLoginEmail') || null;
          const nome = localStorage.getItem('userName') || (email ? email.split('@')[0] : null);
          const idStr = localStorage.getItem('userId');
          const id = idStr ? Number(idStr) : null;
          if (role || perfilCliente || email) {
            const finalRole = role === 'admin' ? 'admin' : (role === 'cliente' ? 'cliente' : (perfilCliente ? 'cliente' : 'user'));
            return { id, email, nome, role: finalRole, perfil_cliente: finalRole === 'cliente' };
          }
        } catch { }
        return null;
      }
      return r.json();
    } catch {
      // Fallback em erro de rede
      try {
        const role = (localStorage.getItem('appRole') || '').toLowerCase();
        const perfilCliente = localStorage.getItem('perfilCliente') === 'true';
        const email = localStorage.getItem('userEmail') || localStorage.getItem('lastLoginEmail') || null;
        const nome = localStorage.getItem('userName') || (email ? email.split('@')[0] : null);
        const idStr = localStorage.getItem('userId');
        const id = idStr ? Number(idStr) : null;
        if (role || perfilCliente || email) {
          const finalRole = role === 'admin' ? 'admin' : (role === 'cliente' ? 'cliente' : (perfilCliente ? 'cliente' : 'user'));
          return { id, email, nome, role: finalRole, perfil_cliente: finalRole === 'cliente' };
        }
      } catch { }
      return null;
    }
  }
};

export const Auth = {
  async login(email, password) {
    const r = await fetch(apiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await handleResponse(r, 'auth', 'LOGIN');
    try {
      localStorage.setItem('authToken', data.token);
      const role = data?.user?.role || null;
      const perfilCliente = data?.user?.perfil_cliente === true || role === 'cliente';
      if (role) localStorage.setItem('appRole', String(role));
      localStorage.setItem('perfilCliente', String(perfilCliente));
      // Persistir dados básicos do usuário para fallback
      if (email) localStorage.setItem('userEmail', String(email));
      localStorage.setItem('lastLoginEmail', String(email || ''));
      const nome = data?.user?.nome || '';
      if (nome) localStorage.setItem('userName', String(nome));
      const id = data?.user?.id;
      if (id !== undefined) localStorage.setItem('userId', String(id));
      try { localStorage.setItem('userJson', JSON.stringify(data?.user || {})); } catch { }
    } catch { }
    return data;
  },
  async register(email, password, nome) {
    const r = await fetch(apiUrl('/api/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nome })
    });
    const data = await handleResponse(r, 'auth', 'REGISTER');
    try { localStorage.setItem('authToken', data.token); } catch { }
    return data;
  },
  logout() { try { localStorage.removeItem('authToken'); localStorage.removeItem('token'); } catch { } }
};