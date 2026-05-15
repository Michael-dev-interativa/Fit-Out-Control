// Cliente local: wrappers que chamam nosso backend Express
import { apiUrl } from './config';
import { base44 } from './base44Client';
import { cacheGet, cachePut, cacheClearPrefix, isOnline, queuePush, shadowPut, shadowGetAll, shadowDelete } from '@/lib/offlineDb';

// Gera hash SHA-256 da senha + email (salt) para armazenamento seguro offline
async function hashPassword(email, password) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${email.toLowerCase().trim()}:${password}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

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
  const err = new Error(`${action} ${resource} failed`);
  err.status = r.status;
  err.payload = payload;
  throw err;
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

// Aplica shadow updates (edições feitas offline) sobre uma lista de itens.
// Para cada shadow de kind 'update', encontra o item pelo id e mescla o delta.
function applyShadowUpdates(items, shadowRows) {
  const updates = shadowRows.filter((s) => s?.kind === 'update' && s?.id != null);
  if (updates.length === 0) return items;
  // Se múltiplos updates para o mesmo id, usa o mais recente
  const updateMap = {};
  for (const s of updates) {
    const key = String(s.id);
    if (!updateMap[key] || s.timestamp > updateMap[key].timestamp) updateMap[key] = s;
  }
  return items.map((item) => {
    const shadow = updateMap[String(item?.id)];
    if (!shadow) return item;
    return { ...item, ...shadow.data, offline: true, queued: true };
  });
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
      if (cached) { console.log(`[offline] servindo cache: ${cacheKey}`); return applyShadowUpdates(mergeShadowCreates(cached, shadows), shadows); }
      return applyShadowUpdates(mergeShadowCreates([], shadows), shadows);
    }
    try {
      const r = await fetch(url, { headers: getAuthHeaders() });
      const data = await handleResponse(r, resource, 'LIST');
      cachePut(cacheKey, data).catch(() => {});
      const shadows = await shadowGetAll(resource);
      return applyShadowUpdates(mergeShadowCreates(data, shadows), shadows);
    } catch (err) {
      const cached = await cacheGet(cacheKey);
      const shadows = await shadowGetAll(resource);
      if (cached) { console.log(`[offline] fallback cache: ${cacheKey}`); return applyShadowUpdates(mergeShadowCreates(cached, shadows), shadows); }
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
      const shadows = await shadowGetAll(resource);
      if (cached) return applyShadowUpdates(cached, shadows);
      return [];
    }
    try {
      const r = await fetch(url, { headers: getAuthHeaders() });
      const data = await handleResponse(r, resource, 'FILTER');
      cachePut(cacheKey, data).catch(() => {});
      const shadows = await shadowGetAll(resource);
      return applyShadowUpdates(data, shadows);
    } catch (err) {
      const cached = await cacheGet(cacheKey);
      const shadows = await shadowGetAll(resource);
      if (cached) return applyShadowUpdates(cached, shadows);
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
      const shadows = await shadowGetAll(resource);
      const updateShadow = shadows.find((s) => s?.kind === 'update' && String(s?.id) === String(id));
      if (cached) {
        const merged = updateShadow ? { ...cached, ...updateShadow.data, offline: true, queued: true } : cached;
        console.log(`[offline] servindo cache: ${cacheKey}`);
        return merged;
      }
      if (updateShadow) return { ...updateShadow.data, id, offline: true, queued: true };
      return null;
    }
    try {
      const r = await fetch(url, { headers: getAuthHeaders() });
      const data = await handleResponse(r, resource, `GET ${id}`);
      cachePut(cacheKey, data).catch(() => {});
      const shadows = await shadowGetAll(resource);
      const updateShadow = shadows.find((s) => s?.kind === 'update' && String(s?.id) === String(id));
      return updateShadow ? { ...data, ...updateShadow.data, offline: true, queued: true } : data;
    } catch (err) {
      const cached = await cacheGet(cacheKey);
      const shadows = await shadowGetAll(resource);
      const updateShadow = shadows.find((s) => s?.kind === 'update' && String(s?.id) === String(id));
      if (cached) return updateShadow ? { ...cached, ...updateShadow.data, offline: true, queued: true } : cached;
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
    const shadowKey = `${resource}:update:${id}`;
    if (!isOnline()) {
      await shadowPut({ key: shadowKey, resource, kind: 'update', id, data, timestamp: Date.now() });
      await queuePush('PUT', url, data, { resource, shadowKey, kind: 'update' });
      // Não limpa caches — o shadow record garante UI optimista nas leituras
      return { ...data, id, queued: true, offline: true, action: 'UPDATE', resource };
    }
    try {
      const r = await fetch(url, {
        method: 'PUT', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(data)
      });
      const result = await handleResponse(r, resource, `UPDATE ${id}`);
      // Limpa shadow de update pendente (caso existisse de sessão offline anterior)
      shadowDelete(shadowKey).catch(() => {});
      // Invalida caches para forçar releitura fresca
      cacheClearPrefix(`GET:${resource}:${id}`).catch(() => {});
      cacheClearPrefix(`LIST:${resource}`).catch(() => {});
      cacheClearPrefix(`FILTER:${resource}`).catch(() => {});
      return result;
    } catch (err) {
      if (!shouldQueueWriteError(err)) throw err;
      await shadowPut({ key: shadowKey, resource, kind: 'update', id, data, timestamp: Date.now() });
      await queuePush('PUT', url, data, { resource, shadowKey, kind: 'update' });
      // Não limpa caches — o shadow record garante UI optimista nas leituras
      return { ...data, id, queued: true, offline: true, action: 'UPDATE', resource };
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
export const NaoConformidade = makeEntity('nao-conformidades');
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
// Novo relatório: Vistoria de Obra Padrão
export const InspecaoVistoriaObraPadrao = makeEntity('inspecoes-vistoria-obra-padrao');

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
  base44.entities.NaoConformidade = NaoConformidade;
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

    // --- Tentativa ONLINE ---
    let data;
    let r;
    try {
      r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
    } catch (networkErr) {
      // Sem conexão — tentar autenticação OFFLINE
      console.log('📴 Auth.login() - Sem rede, tentando autenticação offline...');
      const storedEmail = (localStorage.getItem('userEmail') || localStorage.getItem('lastLoginEmail') || '').toLowerCase().trim();
      const storedHash = localStorage.getItem('offlinePasswordHash');
      const storedUserJson = localStorage.getItem('userJson');

      if (!storedHash || storedEmail !== email.toLowerCase().trim()) {
        console.log('❌ Auth.login() - Offline: usuário não encontrado ou sem hash salvo');
        throw new Error('Sem conexão com o servidor. Faça login online ao menos uma vez para habilitar o acesso offline.');
      }

      const inputHash = await hashPassword(email, password);
      if (!inputHash || inputHash !== storedHash) {
        console.log('❌ Auth.login() - Offline: senha incorreta');
        throw new Error('Credenciais inválidas (offline).');
      }

      console.log('✅ Auth.login() - Autenticação offline bem-sucedida');
      let offlineUser = null;
      try { offlineUser = JSON.parse(storedUserJson); } catch { }
      if (!offlineUser) {
        const role = (localStorage.getItem('appRole') || '').toLowerCase() || 'user';
        const perfilCliente = localStorage.getItem('perfilCliente') === 'true';
        offlineUser = {
          id: Number(localStorage.getItem('userId')) || null,
          email: storedEmail,
          nome: localStorage.getItem('userName') || storedEmail.split('@')[0],
          role,
          perfil_cliente: perfilCliente,
        };
      }
      // Retorna estrutura compatível sem alterar o localStorage
      return { token: localStorage.getItem('authToken') || '', user: offlineUser, offline: true };
    }

    if (!r.ok) {
      if (r.status === 429) {
        const retryAfterRaw = r.headers.get('retry-after');
        const retryAfterSec = Number.parseInt(retryAfterRaw || '0', 10);
        const retryAfterMin = Number.isFinite(retryAfterSec) && retryAfterSec > 0
          ? Math.ceil(retryAfterSec / 60)
          : null;
        throw new Error(
          retryAfterMin
            ? `Muitas tentativas de login. Aguarde ${retryAfterMin} minuto(s) e tente novamente.`
            : 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.'
        );
      }

      if (r.status === 401) {
        throw new Error('Usuário ou senha inválidos.');
      }

      data = await handleResponse(r, 'auth', 'LOGIN');
    } else {
      data = await r.json();
    }

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

      // Salvar hash da senha para autenticação offline futura
      hashPassword(email, password).then(hash => {
        if (hash) {
          try { localStorage.setItem('offlinePasswordHash', hash); } catch { }
        }
      });

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
      localStorage.removeItem('offlinePasswordHash');
    } catch { }
  }
};