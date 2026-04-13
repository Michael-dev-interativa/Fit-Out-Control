// Cliente local: wrappers que chamam nosso backend Express
import { apiUrl } from './config';
import { base44 } from './base44Client';
import { cacheGet, cachePut, cacheClearPrefix, isOnline, queuePush, shadowPut, shadowGetAll } from '@/lib/offlineDb';
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

function shouldQueueWriteError(err) {
  const msg = String(err?.message || '').toLowerCase();
  return (
    !isOnline()
    || msg.includes('failed to fetch')
    || msg.includes('networkerror')
    || msg.includes('network error')
    || msg.includes('load failed')
  );
}

function makeOfflineId(resource) {
  return `offline_${resource}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function mergeShadowCreates(baseItems, shadowRows) {
  const items = Array.isArray(baseItems) ? [...baseItems] : [];
  for (const shadow of shadowRows) {
    if (shadow?.kind !== 'create' || !shadow?.data) continue;
    items.unshift(shadow.data);
  }
  return items;
}

const makeEntity = (resource) => ({
  async list(order) {
    const params = new URLSearchParams();
    if (order) params.append('order', order);
    const url = apiUrl(`/api/${resource}?${params.toString()}`);
    const cacheKey = `LIST:${resource}:${params.toString()}`;
    console.log(`[API] LIST ${resource} -> ${url}`);
    if (!isOnline()) {
      const cached = await cacheGet(cacheKey);
      const shadows = await shadowGetAll(resource);
      if (cached) { console.log(`[offline] servindo cache: ${cacheKey}`); return mergeShadowCreates(cached, shadows); }
      return mergeShadowCreates([], shadows);
    }
    try {
      const r = await fetch(url, { headers: getAuthHeaders() });
      const data = await handleResponse(r, resource, 'LIST');
      cachePut(cacheKey, data).catch(() => {});
      const shadows = await shadowGetAll(resource);
      return mergeShadowCreates(data, shadows);
    } catch (err) {
      const cached = await cacheGet(cacheKey);
      const shadows = await shadowGetAll(resource);
      if (cached) { console.log(`[offline] fallback cache: ${cacheKey}`); return mergeShadowCreates(cached, shadows); }
      throw err;
    }
  },
  async filter(criteria = {}, order) {
    const params = new URLSearchParams();
    Object.entries(criteria || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, v);
    });
    if (order) params.append('order', order);
    const url = apiUrl(`/api/${resource}?${params.toString()}`);
    const cacheKey = `FILTER:${resource}:${params.toString()}`;
    if (!isOnline()) {
      const cached = await cacheGet(cacheKey);
      if (cached) return cached;
      return [];
    }
    try {
      const r = await fetch(url, { headers: getAuthHeaders() });
      const data = await handleResponse(r, resource, 'FILTER');
      cachePut(cacheKey, data).catch(() => {});
      return data;
    } catch (err) {
      const cached = await cacheGet(cacheKey);
      if (cached) return cached;
      throw err;
    }
  },
  async get(id) {
    const url = apiUrl(`/api/${resource}/${id}`);
    const cacheKey = `GET:${resource}:${id}`;
    if (String(id).startsWith(`offline_${resource}_`)) {
      const shadows = await shadowGetAll(resource);
      const found = shadows.find((shadow) => shadow?.kind === 'create' && shadow?.data?.id === id);
      if (found?.data) return found.data;
    }
    if (!isOnline()) {
      const cached = await cacheGet(cacheKey);
      if (cached) { console.log(`[offline] servindo cache: ${cacheKey}`); return cached; }
      return null;
    }
    try {
      const r = await fetch(url, { headers: getAuthHeaders() });
      const data = await handleResponse(r, resource, `GET ${id}`);
      cachePut(cacheKey, data).catch(() => {});
      return data;
    } catch (err) {
      const cached = await cacheGet(cacheKey);
      if (cached) return cached;
      throw err;
    }
  },
  async create(data) {
    const url = apiUrl(`/api/${resource}`);
    if (!isOnline()) {
      const offlineId = makeOfflineId(resource);
      const offlineRecord = {
        ...data,
        id: offlineId,
        offline: true,
        queued: true,
        created_at: data?.created_at || new Date().toISOString(),
      };
      const shadowKey = `${resource}:create:${offlineId}`;
      await shadowPut({ key: shadowKey, resource, kind: 'create', data: offlineRecord, timestamp: Date.now() });
      await queuePush('POST', url, data, { resource, shadowKey, kind: 'create' });
      return offlineRecord;
    }
    try {
      const r = await fetch(url, {
        method: 'POST', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(data)
      });
      const result = await handleResponse(r, resource, 'CREATE');
      // Invalida cache de listagem após mutação
      cacheClearPrefix(`LIST:${resource}`).catch(() => {});
      cacheClearPrefix(`FILTER:${resource}`).catch(() => {});
      return result;
    } catch (err) {
      if (!shouldQueueWriteError(err)) throw err;
      const offlineId = makeOfflineId(resource);
      const offlineRecord = {
        ...data,
        id: offlineId,
        offline: true,
        queued: true,
        created_at: data?.created_at || new Date().toISOString(),
      };
      const shadowKey = `${resource}:create:${offlineId}`;
      await shadowPut({ key: shadowKey, resource, kind: 'create', data: offlineRecord, timestamp: Date.now() });
      await queuePush('POST', url, data, { resource, shadowKey, kind: 'create' });
      return offlineRecord;
    }
  },
  async update(id, data) {
    const url = apiUrl(`/api/${resource}/${id}`);
    if (!isOnline()) {
      await queuePush('PUT', url, data);
      cacheClearPrefix(`GET:${resource}:${id}`).catch(() => {});
      cacheClearPrefix(`LIST:${resource}`).catch(() => {});
      cacheClearPrefix(`FILTER:${resource}`).catch(() => {});
      return { queued: true, offline: true, action: 'UPDATE', resource, id, data };
    }
    try {
      const r = await fetch(url, {
        method: 'PUT', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(data)
      });
      const result = await handleResponse(r, resource, `UPDATE ${id}`);
      // Invalida cache do item e listagens
      cacheClearPrefix(`GET:${resource}:${id}`).catch(() => {});
      cacheClearPrefix(`LIST:${resource}`).catch(() => {});
      cacheClearPrefix(`FILTER:${resource}`).catch(() => {});
      return result;
    } catch (err) {
      if (!shouldQueueWriteError(err)) throw err;
      await queuePush('PUT', url, data);
      cacheClearPrefix(`GET:${resource}:${id}`).catch(() => {});
      cacheClearPrefix(`LIST:${resource}`).catch(() => {});
      cacheClearPrefix(`FILTER:${resource}`).catch(() => {});
      return { queued: true, offline: true, action: 'UPDATE', resource, id, data };
    }
  },
  async delete(id) {
    const url = apiUrl(`/api/${resource}/${id}`);
    if (!isOnline()) {
      await queuePush('DELETE', url);
      cacheClearPrefix(`GET:${resource}:${id}`).catch(() => {});
      cacheClearPrefix(`LIST:${resource}`).catch(() => {});
      cacheClearPrefix(`FILTER:${resource}`).catch(() => {});
      return { queued: true, offline: true, action: 'DELETE', resource, id };
    }
    try {
      const r = await fetch(url, { method: 'DELETE', headers: getAuthHeaders() });
      const result = await handleResponse(r, resource, `DELETE ${id}`);
      cacheClearPrefix(`GET:${resource}:${id}`).catch(() => {});
      cacheClearPrefix(`LIST:${resource}`).catch(() => {});
      cacheClearPrefix(`FILTER:${resource}`).catch(() => {});
      return result;
    } catch (err) {
      if (!shouldQueueWriteError(err)) throw err;
      await queuePush('DELETE', url);
      cacheClearPrefix(`GET:${resource}:${id}`).catch(() => {});
      cacheClearPrefix(`LIST:${resource}`).catch(() => {});
      cacheClearPrefix(`FILTER:${resource}`).catch(() => {});
      return { queued: true, offline: true, action: 'DELETE', resource, id };
    }
  }
});

export const Empreendimento = makeEntity('empreendimentos');
export const UnidadeEmpreendimento = makeEntity('unidades-empreendimento');
export const AP_unidade = makeEntity('aps-unidade');
export const KO_unidade = makeEntity('kos-unidade');
export const VO_unidade = makeEntity('vos-unidade');
export const FormularioVistoria = makeEntity('formularios-vistoria');
export const TermoDeAceite = makeEntity('termos-aceite');
// Respostas de vistoria são expostas como vistorias
export const RespostaVistoria = makeEntity('vistorias');
export const RelatorioSemanal = makeEntity('relatorios-semanais');
export const RelatorioSaida = makeEntity('relatorios-saida');
export const RelatorioAnaliseTecnica = makeEntity('relatorios-analise-tecnica');
export const VistoriaTecnica = makeEntity('vistorias-tecnicas');
export const RelatorioPrimeirosServicos = makeEntity('relatorios-primeiros-servicos');
export const AprovacaoAmostra = makeEntity('aprovacoes-amostra');
export const VistoriaTerminalidade = makeEntity('vistorias-terminalidade');
export const InspecaoHidrantes = makeEntity('inspecoes-hidrantes');
export const InspecaoHidraulica = makeEntity('inspecoes-hidraulica');
export const InspecaoSprinklers = makeEntity('inspecoes-sprinklers');
export const InspecaoAlarmeIncendio = makeEntity('inspecoes-alarme-incendio');
export const InspecaoArCondicionado = makeEntity('inspecoes-ar-condicionado');
export const InspecaoControleAcesso = makeEntity('inspecoes-controle-acesso');
export const InspecaoCFTV = makeEntity('inspecoes-cftv');
export const InspecaoSDAI = makeEntity('inspecoes-sdai');
export const InspecaoEletrica = makeEntity('inspecoes-eletrica');
export const InspecaoGas = makeEntity('inspecoes-gas');

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
const TIPO_REGISTRO_VISTORIA_OBRA = 'Vistoria de Obras';
const withTipoVistoriaObra = (criteria = {}) => ({
  ...(criteria || {}),
  tipo_registro: TIPO_REGISTRO_VISTORIA_OBRA,
});
const VISTORIA_OBRA_PADRAO_FORM_NAME = 'Vistoria de Obra Padrão';
const normalizeText = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const VISTORIA_OBRA_SKIP_SECTIONS = new Set([
  'ASSINATURAS',
]);

function mapFormularioToVistoriaObraItens(formulario) {
  const secoes = Array.isArray(formulario?.secoes) ? formulario.secoes : [];
  const mapped = [];

  secoes.forEach((secao, secaoIdx) => {
    const disciplina = String(secao?.nome_secao || '').trim();
    if (!disciplina || VISTORIA_OBRA_SKIP_SECTIONS.has(disciplina.toUpperCase())) return;

    const perguntas = Array.isArray(secao?.perguntas) ? secao.perguntas : [];
    let numeracao = 1;

    perguntas.forEach((perg, pergIdx) => {
      const textoPergunta = String(perg?.pergunta || '').trim();
      if (!textoPergunta) return;

      mapped.push({
        id: `${formulario?.id || 'form'}:${secaoIdx}:${pergIdx}`,
        tipo_registro: TIPO_REGISTRO_VISTORIA_OBRA,
        disciplina,
        numeracao: numeracao++,
        descricao_registro: textoPergunta,
        emissao_registro: formulario?.updated_date || formulario?.created_date || new Date().toISOString(),
        id_formulario: formulario?.id || null,
        nome_formulario: formulario?.nome_formulario || VISTORIA_OBRA_PADRAO_FORM_NAME,
      });
    });
  });

  return mapped;
}

async function loadVistoriaObraPadraoItens(order) {
  const forms = await FormularioVistoria.list(order);
  const list = Array.isArray(forms) ? forms : [];

  const exact = list.find((f) => normalizeText(f?.nome_formulario) === normalizeText(VISTORIA_OBRA_PADRAO_FORM_NAME));
  const loose = list.find((f) => {
    const n = normalizeText(f?.nome_formulario);
    return n.includes('vistoria de obra') && n.includes('padrao');
  });

  const selected = exact || loose || null;
  if (!selected) return [];

  return mapFormularioToVistoriaObraItens(selected);
}

export const VistoriaObraPadrao = {
  async list(order) {
    return loadVistoriaObraPadraoItens(order);
  },
  async filter(criteria = {}, order) {
    const items = await loadVistoriaObraPadraoItens(order);
    const filters = criteria || {};

    return items.filter((item) => Object.entries(filters).every(([key, value]) => {
      if (value === undefined || value === null || value === '') return true;
      return String(item?.[key] ?? '').toLowerCase().includes(String(value).toLowerCase());
    }));
  },
  async get(id) {
    const items = await loadVistoriaObraPadraoItens();
    return items.find((item) => String(item.id) === String(id)) || null;
  },
  async create(data = {}) {
    return RegistroGeral.create(withTipoVistoriaObra(data));
  },
  async update(id, data = {}) {
    return RegistroGeral.update(id, withTipoVistoriaObra(data));
  },
  async delete(id) {
    return RegistroGeral.delete(id);
  },
};
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
export const AtaReuniao = makeEntity('ata-reuniao');
// Expor também no objeto runtime `base44.entities` para compatibilidade com código que
// acessa `base44.entities.<Entity>` (ex: VisualizarAtaReuniao.jsx usa base44.entities.AtaReuniao)
try {
  base44.entities = base44.entities || {};
  base44.entities.AtaReuniao = AtaReuniao;
  // Mapear entidades relacionadas a inspeções para compatibilidade com código legado
  base44.entities.Empreendimento = Empreendimento;
  base44.entities.UnidadeEmpreendimento = UnidadeEmpreendimento;
  base44.entities.FormularioVistoria = FormularioVistoria;
  base44.entities.VistoriaObraPadrao = VistoriaObraPadrao;
  base44.entities.RelatorioSaida = RelatorioSaida;
  base44.entities.RelatorioAnaliseTecnica = RelatorioAnaliseTecnica;
  base44.entities.VistoriaTecnica = VistoriaTecnica;
  base44.entities.InspecaoEletrica = InspecaoEletrica;
  base44.entities.InspecaoArCondicionado = InspecaoArCondicionado;
  base44.entities.InspecaoHidrantes = InspecaoHidrantes;
  base44.entities.InspecaoGas = InspecaoGas;
} catch (e) { /* ignore in static build */ }

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
        // Se 401, token inválido/expirado — limpa token para redirecionar ao login
        if (r.status === 401) {
          try {
            localStorage.removeItem('authToken');
            localStorage.removeItem('token');
          } catch { }
          console.log('⚠️ User.me() - Token inválido (401), limpando token');
          return null;
        }
        url = apiUrl('/api/usuarios/me');
        r = await fetch(url, { headers: getAuthHeaders() });
        console.log('📡 /api/usuarios/me - Status:', r.status);
      }

      if (!r.ok) {
        // Se 401, token inválido/expirado
        if (r.status === 401) {
          try {
            localStorage.removeItem('authToken');
            localStorage.removeItem('token');
          } catch { }
          console.log('⚠️ User.me() - Token inválido (401) em /usuarios/me, limpando token');
          return null;
        }
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