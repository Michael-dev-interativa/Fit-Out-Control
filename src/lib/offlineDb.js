/**
 * offlineDb.js – Camada de cache offline via IndexedDB (usando `idb`)
 *
 * Uso:
 *   import { cacheGet, cachePut, cacheDelete, isOnline } from '@/lib/offlineDb';
 *
 * Stores:
 *   - api_cache   { key (url+params), data, timestamp }
 *   - sync_queue  { id (auto), method, url, body, timestamp }
 */

import { openDB } from 'idb';

const DB_NAME = 'fitout_offline';
const DB_VERSION = 1;
const CACHE_STORE = 'api_cache';
const QUEUE_STORE = 'sync_queue';
const SHADOW_STORE = 'shadow_records';

// TTL padrão: 24h em milissegundos
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(SHADOW_STORE)) {
          db.createObjectStore(SHADOW_STORE, { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

/** Verifica se o navegador está online */
export function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Salva dados no cache IndexedDB
 * @param {string} key  - identificador único (ex.: "GET:/api/empreendimentos")
 * @param {*} data      - dados a serem cacheados (object/array)
 * @param {number} ttl  - tempo de vida em ms (padrão: 24h)
 */
export async function cachePut(key, data, ttl = DEFAULT_TTL_MS) {
  try {
    const db = await getDb();
    await db.put(CACHE_STORE, { key, data, timestamp: Date.now(), ttl });
  } catch (err) {
    console.warn('[offlineDb] cachePut falhou:', err.message);
  }
}

/**
 * Recupera dados do cache IndexedDB
 * @param {string} key
 * @returns {*|null} dados ou null se não encontrado / expirado
 */
export async function cacheGet(key) {
  try {
    const db = await getDb();
    const entry = await db.get(CACHE_STORE, key);
    if (!entry) return null;
    const age = Date.now() - entry.timestamp;
    if (age > (entry.ttl ?? DEFAULT_TTL_MS)) {
      // Expirado — remove silenciosamente
      db.delete(CACHE_STORE, key).catch(() => {});
      return null;
    }
    return entry.data;
  } catch (err) {
    console.warn('[offlineDb] cacheGet falhou:', err.message);
    return null;
  }
}

/**
 * Remove uma entrada do cache
 */
export async function cacheDelete(key) {
  try {
    const db = await getDb();
    await db.delete(CACHE_STORE, key);
  } catch { /* silencioso */ }
}

/**
 * Remove todas as entradas que começam com um prefixo
 * Útil para invalidar cache de um recurso após mutação
 */
export async function cacheClearPrefix(prefix) {
  try {
    const db = await getDb();
    const all = await db.getAllKeys(CACHE_STORE);
    await Promise.all(
      all.filter(k => String(k).startsWith(prefix)).map(k => db.delete(CACHE_STORE, k))
    );
  } catch (err) {
    console.warn('[offlineDb] cacheClearPrefix falhou:', err.message);
  }
}

/**
 * Adiciona uma operação à fila de sincronização (para quando ficar online)
 */
export async function queuePush(method, url, body, meta = {}) {
  try {
    const db = await getDb();
    await db.add(QUEUE_STORE, { method, url, body, meta, timestamp: Date.now() });
    console.log('[offlineDb] Operação enfileirada:', method, url);
  } catch (err) {
    console.warn('[offlineDb] queuePush falhou:', err.message);
  }
}

export async function shadowPut(record) {
  try {
    const db = await getDb();
    await db.put(SHADOW_STORE, record);
  } catch (err) {
    console.warn('[offlineDb] shadowPut falhou:', err.message);
  }
}

export async function shadowGetAll(resource) {
  try {
    const db = await getDb();
    const rows = await db.getAll(SHADOW_STORE);
    return rows.filter((row) => row?.resource === resource);
  } catch (err) {
    console.warn('[offlineDb] shadowGetAll falhou:', err.message);
    return [];
  }
}

export async function shadowDelete(key) {
  try {
    const db = await getDb();
    await db.delete(SHADOW_STORE, key);
  } catch { /* silencioso */ }
}

/**
 * Retorna todas as operações pendentes na fila
 */
export async function queueGetAll() {
  try {
    const db = await getDb();
    return await db.getAll(QUEUE_STORE);
  } catch { return []; }
}

/**
 * Remove uma operação da fila por ID
 */
export async function queueDelete(id) {
  try {
    const db = await getDb();
    await db.delete(QUEUE_STORE, id);
  } catch { /* silencioso */ }
}

/**
 * Processa a fila de sincronização (chama fetch para cada operação pendente)
 * Chamado automaticamente quando o navegador volta online
 */
export async function processSyncQueue(getAuthHeaders) {
  const queue = await queueGetAll();
  if (queue.length === 0) return 0;

  console.log(`[offlineDb] Processando fila: ${queue.length} operações pendentes`);
  let processed = 0;
  const touchedResources = new Set();

  for (const op of queue) {
    try {
      const res = await fetch(op.url, {
        method: op.method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: op.body ? JSON.stringify(op.body) : undefined,
      });
      if (res.ok) {
        await queueDelete(op.id);
        if (op?.meta?.shadowKey) {
          await shadowDelete(op.meta.shadowKey);
        }
        try {
          const path = new URL(op.url).pathname;
          // Espera formato /api/<resource> ou /api/<resource>/<id>
          const m = path.match(/^\/api\/([^\/]+)/);
          if (m && m[1]) touchedResources.add(m[1]);
        } catch { /* silencioso */ }
        processed++;
      }
    } catch {
      // Se ainda offline / falhar, mantém na fila
    }
  }

  // Após sync, invalida cache relacionado aos recursos afetados
  if (touchedResources.size > 0) {
    await Promise.all(Array.from(touchedResources).flatMap((resource) => ([
      cacheClearPrefix(`LIST:${resource}`),
      cacheClearPrefix(`FILTER:${resource}`),
      cacheClearPrefix(`GET:${resource}`),
    ]))).catch(() => {});
  }

  console.log(`[offlineDb] ${processed}/${queue.length} operações sincronizadas`);
  return processed;
}
