import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

dotenv.config();

const { Pool } = pg;

const DEFAULT_CSV_PATH = 'C:/Users/Michael Rocha/Desktop/import/RelatorioSaida.csv';

function maybeFixMojibake(value) {
  if (typeof value !== 'string') return value;
  if (!/[ÃÂ]/.test(value)) return value;

  try {
    const fixed = Buffer.from(value, 'latin1').toString('utf8');
    const originalArtifacts = (value.match(/Ã|Â/g) || []).length;
    const fixedArtifacts = (fixed.match(/Ã|Â/g) || []).length;
    if (fixedArtifacts < originalArtifacts && !fixed.includes('�')) {
      return fixed;
    }
  } catch {
    // keep original
  }

  return value;
}

function toNullableText(value) {
  if (value === null || value === undefined) return null;
  const s = maybeFixMojibake(String(value)).trim();
  if (!s || s.toLowerCase() === 'null') return null;
  return s;
}

function toDate(value) {
  const s = toNullableText(value);
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function toTimestamp(value) {
  const s = toNullableText(value);
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function parseJsonValue(value, fallback) {
  const s = toNullableText(value);
  if (!s) return fallback;
  try {
    const parsed = JSON.parse(s);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function parseJsonObject(value) {
  const parsed = parseJsonValue(value, {});
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
}

function parseJsonArray(value) {
  const parsed = parseJsonValue(value, []);
  return Array.isArray(parsed) ? parsed : [];
}

function normalizeForSearch(v) {
  const s = toNullableText(v);
  if (!s) return null;
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function splitCandidateTerms(text) {
  const s = normalizeForSearch(text);
  if (!s) return [];

  const terms = new Set();
  terms.add(s);
  for (const part of s.split(/[|;\/,\-]/)) {
    const p = part.trim();
    if (p.length >= 3) terms.add(p);
  }

  return Array.from(terms).slice(0, 12);
}

function parseCsv(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_quotes: true,
  });
}

async function connectDb() {
  const isProductionRuntime = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);
  const dbTarget = (process.env.DB_TARGET || '').toLowerCase();

  const selectedUrl = (() => {
    if (dbTarget === 'local') return process.env.DATABASE_URL_LOCAL;
    if (dbTarget === 'remote') return process.env.DATABASE_URL;
    if (isProductionRuntime) return process.env.DATABASE_URL;
    return process.env.DATABASE_URL_LOCAL || process.env.DATABASE_URL;
  })();

  const fallbackUrl = selectedUrl === process.env.DATABASE_URL_LOCAL
    ? process.env.DATABASE_URL
    : process.env.DATABASE_URL_LOCAL;

  const urlsToTry = [selectedUrl, fallbackUrl].filter(Boolean);
  if (!urlsToTry.length) throw new Error('DATABASE_URL/DATABASE_URL_LOCAL não configuradas no .env');

  const forcePgSsl = (process.env.PG_FORCE_SSL || '').toLowerCase() === 'true';
  const disablePgSsl = (process.env.PG_DISABLE_SSL || '').toLowerCase() === 'true';

  let lastError = null;

  for (const url of urlsToTry) {
    const host = (() => {
      try { return (new URL(url).hostname || '').toLowerCase(); } catch { return ''; }
    })();

    const sslmode = (() => {
      try { return ((new URL(url)).searchParams.get('sslmode') || '').toLowerCase(); } catch { return ''; }
    })();

    const useSsl = (() => {
      if (disablePgSsl) return false;
      if (forcePgSsl) return true;
      if (sslmode) return true;
      if (host === 'localhost' || host === '127.0.0.1') return false;
      if (dbTarget === 'local') return false;
      return isProductionRuntime || dbTarget === 'remote';
    })();

    try {
      const pool = new Pool({
        connectionString: url,
        ssl: useSsl ? { rejectUnauthorized: false } : false,
        max: process.env.PG_MAX_CLIENTS ? parseInt(process.env.PG_MAX_CLIENTS, 10) : 10,
        idleTimeoutMillis: process.env.PG_IDLE_TIMEOUT_MS ? parseInt(process.env.PG_IDLE_TIMEOUT_MS, 10) : 30000,
        connectionTimeoutMillis: process.env.PG_CONN_TIMEOUT_MS ? parseInt(process.env.PG_CONN_TIMEOUT_MS, 10) : 10000,
      });

      await pool.query('SELECT 1');
      console.log(`🔌 Banco conectado em ${host || 'host-desconhecido'} (ssl=${useSsl ? 'on' : 'off'})`);
      return pool;
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(lastError?.message || 'Falha ao conectar no banco de dados');
}

async function empreendimentoExists(pool, id) {
  const { rows } = await pool.query('SELECT id FROM public.empreendimentos WHERE id = $1', [id]);
  return rows.length ? rows[0].id : null;
}

async function unidadeExists(pool, id) {
  const { rows } = await pool.query('SELECT id, id_empreendimento FROM public.unidades_empreendimento WHERE id = $1', [id]);
  return rows[0] || null;
}

async function resolveIds(pool, record, cache) {
  const rawEmp = toNullableText(record.id_empreendimento);
  const rawUni = toNullableText(record.id_unidade);

  if (rawUni && /^\d+$/.test(rawUni)) {
    const foundUnit = await unidadeExists(pool, Number(rawUni));
    if (foundUnit) {
      return {
        id_unidade: Number(foundUnit.id),
        id_empreendimento: Number(foundUnit.id_empreendimento),
        strategy: 'id_unidade_numero',
      };
    }
  }

  if (rawEmp && /^\d+$/.test(rawEmp)) {
    const foundEmp = await empreendimentoExists(pool, Number(rawEmp));
    if (foundEmp) {
      const unitCandidates = splitCandidateTerms(record.unidade_exibicao);
      if (unitCandidates.length) {
        for (const term of unitCandidates) {
          const key = `unit-by-term:${foundEmp}:${term}`;
          if (cache.has(key)) {
            return {
              id_unidade: cache.get(key),
              id_empreendimento: foundEmp,
              strategy: 'id_empreendimento_numero+unidade_texto_cache',
            };
          }
          const { rows } = await pool.query(
            `SELECT id
               FROM public.unidades_empreendimento
              WHERE id_empreendimento = $1
                AND lower(coalesce(unidade_empreendimento, '')) LIKE $2
              ORDER BY id DESC
              LIMIT 1`,
            [foundEmp, `%${term}%`]
          );
          if (rows.length) {
            cache.set(key, Number(rows[0].id));
            return {
              id_unidade: Number(rows[0].id),
              id_empreendimento: foundEmp,
              strategy: 'id_empreendimento_numero+unidade_texto',
            };
          }
        }
      }
    }
  }

  const unitTerms = [
    ...splitCandidateTerms(record.unidade_exibicao),
    ...splitCandidateTerms(record.locatario),
    ...splitCandidateTerms(record.nome_arquivo),
    ...splitCandidateTerms(record.nome_relatorio),
  ];

  for (const term of unitTerms) {
    const key = `unit-any:${term}`;
    if (cache.has(key)) {
      return {
        id_unidade: cache.get(key).id_unidade,
        id_empreendimento: cache.get(key).id_empreendimento,
        strategy: 'texto_cache',
      };
    }

    const { rows } = await pool.query(
      `SELECT u.id AS id_unidade, u.id_empreendimento
         FROM public.unidades_empreendimento u
         LEFT JOIN public.empreendimentos e ON e.id = u.id_empreendimento
        WHERE lower(coalesce(u.unidade_empreendimento, '')) LIKE $1
          OR lower(coalesce(u.cliente_unidade, '')) LIKE $1
          OR lower(coalesce(e.nome_empreendimento, '')) LIKE $1
          OR lower(coalesce(e.cli_empreendimento, '')) LIKE $1
        ORDER BY u.id DESC
        LIMIT 1`,
      [`%${term}%`]
    );

    if (rows.length) {
      const resolved = {
        id_unidade: Number(rows[0].id_unidade),
        id_empreendimento: Number(rows[0].id_empreendimento),
      };
      cache.set(key, resolved);
      return { ...resolved, strategy: 'texto_lookup' };
    }
  }

  return null;
}

function buildPayload(record, resolvedIds) {
  return {
    id_formulario: null,
    id_unidade: resolvedIds.id_unidade,
    id_empreendimento: resolvedIds.id_empreendimento,
    estrutura_formulario: parseJsonArray(record.estrutura_formulario),
    nome_relatorio: toNullableText(record.nome_relatorio) || 'Relatorio de Saida',
    nome_arquivo: toNullableText(record.nome_arquivo),
    data_saida: toDate(record.data_saida),
    data_relatorio: toDate(record.data_relatorio),
    consultor_responsavel: toNullableText(record.consultor_responsavel),
    locatario: toNullableText(record.locatario),
    endereco_capa: toNullableText(record.endereco_capa),
    subtitulo_capa: toNullableText(record.subtitulo_capa),
    unidade_exibicao: toNullableText(record.unidade_exibicao),
    representantes: toNullableText(record.representantes),
    texto_os_proposta: toNullableText(record.texto_os_proposta),
    revisao: toNullableText(record.revisao),
    respostas: parseJsonObject(record.respostas),
    fotos_secoes: parseJsonObject(record.fotos_secoes),
    status_saida: toNullableText(record.status_saida) || 'Em Andamento',
    observacoes_secoes: parseJsonObject(record.observacoes_secoes),
    checklist_inicial: parseJsonObject(record.checklist_inicial),
    descricao_geral_adequacoes: parseJsonObject(record.descricao_geral_adequacoes),
    detalhamento_adequacoes: parseJsonObject(record.detalhamento_adequacoes),
    declaracoes: parseJsonObject(record.declaracoes),
    assinaturas: parseJsonArray(record.assinaturas),
    created_at: toTimestamp(record.created_date),
    updated_at: toTimestamp(record.updated_date),
  };
}

async function findExisting(pool, payload) {
  const { rows } = await pool.query(
    `SELECT id
       FROM public.relatorios_saida
      WHERE id_unidade = $1
        AND id_empreendimento = $2
        AND nome_relatorio IS NOT DISTINCT FROM $3
        AND data_saida IS NOT DISTINCT FROM $4
      ORDER BY id DESC
      LIMIT 1`,
    [payload.id_unidade, payload.id_empreendimento, payload.nome_relatorio, payload.data_saida]
  );
  return rows[0]?.id || null;
}

async function insertRelatorioSaida(pool, payload) {
  const sql = `INSERT INTO public.relatorios_saida(
      id_formulario, id_unidade, id_empreendimento,
      estrutura_formulario, nome_relatorio, nome_arquivo,
      data_saida, data_relatorio, consultor_responsavel, locatario,
      endereco_capa, subtitulo_capa, unidade_exibicao, representantes,
      texto_os_proposta, revisao, respostas, fotos_secoes,
      status_saida, observacoes_secoes, checklist_inicial,
      descricao_geral_adequacoes, detalhamento_adequacoes,
      declaracoes, assinaturas, created_at, updated_at
    ) VALUES(
      $1, $2, $3,
      $4::jsonb, $5, $6,
      $7, $8, $9, $10,
      $11, $12, $13, $14,
      $15, $16, $17::jsonb, $18::jsonb,
      $19, $20::jsonb, $21::jsonb,
      $22::jsonb, $23::jsonb,
      $24::jsonb, $25::jsonb, COALESCE($26, now()), COALESCE($27, now())
    ) RETURNING id`;

  const params = [
    payload.id_formulario,
    payload.id_unidade,
    payload.id_empreendimento,
    JSON.stringify(payload.estrutura_formulario),
    payload.nome_relatorio,
    payload.nome_arquivo,
    payload.data_saida,
    payload.data_relatorio,
    payload.consultor_responsavel,
    payload.locatario,
    payload.endereco_capa,
    payload.subtitulo_capa,
    payload.unidade_exibicao,
    payload.representantes,
    payload.texto_os_proposta,
    payload.revisao,
    JSON.stringify(payload.respostas),
    JSON.stringify(payload.fotos_secoes),
    payload.status_saida,
    JSON.stringify(payload.observacoes_secoes),
    JSON.stringify(payload.checklist_inicial),
    JSON.stringify(payload.descricao_geral_adequacoes),
    JSON.stringify(payload.detalhamento_adequacoes),
    JSON.stringify(payload.declaracoes),
    JSON.stringify(payload.assinaturas),
    payload.created_at,
    payload.updated_at,
  ];

  const { rows } = await pool.query(sql, params);
  return rows[0].id;
}

async function updateRelatorioSaida(pool, id, payload) {
  const sql = `UPDATE public.relatorios_saida SET
      id_formulario = $1,
      id_unidade = $2,
      id_empreendimento = $3,
      estrutura_formulario = $4::jsonb,
      nome_relatorio = $5,
      nome_arquivo = $6,
      data_saida = $7,
      data_relatorio = $8,
      consultor_responsavel = $9,
      locatario = $10,
      endereco_capa = $11,
      subtitulo_capa = $12,
      unidade_exibicao = $13,
      representantes = $14,
      texto_os_proposta = $15,
      revisao = $16,
      respostas = $17::jsonb,
      fotos_secoes = $18::jsonb,
      status_saida = $19,
      observacoes_secoes = $20::jsonb,
      checklist_inicial = $21::jsonb,
      descricao_geral_adequacoes = $22::jsonb,
      detalhamento_adequacoes = $23::jsonb,
      declaracoes = $24::jsonb,
      assinaturas = $25::jsonb,
      created_at = COALESCE($26, created_at),
      updated_at = COALESCE($27, now())
    WHERE id = $28`;

  const params = [
    payload.id_formulario,
    payload.id_unidade,
    payload.id_empreendimento,
    JSON.stringify(payload.estrutura_formulario),
    payload.nome_relatorio,
    payload.nome_arquivo,
    payload.data_saida,
    payload.data_relatorio,
    payload.consultor_responsavel,
    payload.locatario,
    payload.endereco_capa,
    payload.subtitulo_capa,
    payload.unidade_exibicao,
    payload.representantes,
    payload.texto_os_proposta,
    payload.revisao,
    JSON.stringify(payload.respostas),
    JSON.stringify(payload.fotos_secoes),
    payload.status_saida,
    JSON.stringify(payload.observacoes_secoes),
    JSON.stringify(payload.checklist_inicial),
    JSON.stringify(payload.descricao_geral_adequacoes),
    JSON.stringify(payload.detalhamento_adequacoes),
    JSON.stringify(payload.declaracoes),
    JSON.stringify(payload.assinaturas),
    payload.created_at,
    payload.updated_at,
    id,
  ];

  await pool.query(sql, params);
}

async function main() {
  const csvPath = process.argv[2] || DEFAULT_CSV_PATH;
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Arquivo CSV não encontrado: ${csvPath}`);
  }

  const rows = parseCsv(csvPath);
  if (!rows.length) {
    console.log('⚠️ CSV vazio. Nada para importar.');
    return;
  }

  const pool = await connectDb();
  const cache = new Map();

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  try {
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const resolved = await resolveIds(pool, row, cache);

      if (!resolved) {
        skipped += 1;
        console.warn(`⚠️ Linha ${i + 2} ignorada: não foi possível resolver id_unidade/id_empreendimento. nome_relatorio=${toNullableText(row.nome_relatorio) || '(sem nome)'}`);
        continue;
      }

      const payload = buildPayload(row, resolved);

      if (!payload.nome_relatorio || !payload.id_unidade || !payload.id_empreendimento) {
        skipped += 1;
        console.warn(`⚠️ Linha ${i + 2} ignorada: payload incompleto.`);
        continue;
      }

      const existingId = await findExisting(pool, payload);
      if (existingId) {
        await updateRelatorioSaida(pool, existingId, payload);
        updated += 1;
        console.log(`♻️ Atualizado relatorio_saida id=${existingId} (linha ${i + 2}, estrategia=${resolved.strategy})`);
      } else {
        const newId = await insertRelatorioSaida(pool, payload);
        inserted += 1;
        console.log(`✅ Inserido relatorio_saida id=${newId} (linha ${i + 2}, estrategia=${resolved.strategy})`);
      }
    }

    console.log('\n📦 Importação finalizada');
    console.log(`- Linhas CSV: ${rows.length}`);
    console.log(`- Inseridos: ${inserted}`);
    console.log(`- Atualizados: ${updated}`);
    console.log(`- Ignorados: ${skipped}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ Falha na importação de relatorios_saida:', err.message || err);
  process.exit(1);
});
