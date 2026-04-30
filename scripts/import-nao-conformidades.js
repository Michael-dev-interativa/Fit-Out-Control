import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

dotenv.config();

const { Pool } = pg;

const DEFAULT_CSV_PATH = 'C:/Users/Michael Rocha/Desktop/import/NaoConformidade.csv';

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
    // Keep original if conversion fails.
  }

  return value;
}

function deepFixStrings(input) {
  if (Array.isArray(input)) return input.map(deepFixStrings);
  if (input && typeof input === 'object') {
    const out = {};
    Object.entries(input).forEach(([key, val]) => {
      out[key] = deepFixStrings(val);
    });
    return out;
  }
  return maybeFixMojibake(input);
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

function parseJsonArray(value) {
  const s = toNullableText(value);
  if (!s) return [];
  try {
    const parsed = JSON.parse(s);
    if (!Array.isArray(parsed)) return [];
    return deepFixStrings(parsed);
  } catch {
    return [];
  }
}

function parseJsonObject(value) {
  const s = toNullableText(value);
  if (!s) return {};
  try {
    const parsed = JSON.parse(s);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return deepFixStrings(parsed);
  } catch {
    return {};
  }
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

  for (const part of s.split(/[|;\/,-]/)) {
    const p = part.trim();
    if (p.length >= 3) terms.add(p);
  }

  return Array.from(terms).slice(0, 12);
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
  if (!urlsToTry.length) throw new Error('DATABASE_URL/DATABASE_URL_LOCAL nao configuradas no .env');

  const forcePgSsl = (process.env.PG_FORCE_SSL || '').toLowerCase() === 'true';
  const disablePgSsl = (process.env.PG_DISABLE_SSL || '').toLowerCase() === 'true';

  let lastError = null;
  const attempts = [];

  for (const url of urlsToTry) {
    const safeUserHost = (() => {
      try {
        const u = new URL(url);
        return `${u.username || 'sem-usuario'}@${u.hostname || 'sem-host'}:${u.port || 'sem-porta'}`;
      } catch {
        return 'url-invalida';
      }
    })();

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
      console.log(`Tentando conexao em ${safeUserHost} (ssl=${useSsl ? 'on' : 'off'})`);
      const pool = new Pool({
        connectionString: url,
        ssl: useSsl ? { rejectUnauthorized: false } : false,
        max: process.env.PG_MAX_CLIENTS ? parseInt(process.env.PG_MAX_CLIENTS, 10) : 10,
        idleTimeoutMillis: process.env.PG_IDLE_TIMEOUT_MS ? parseInt(process.env.PG_IDLE_TIMEOUT_MS, 10) : 30000,
        connectionTimeoutMillis: process.env.PG_CONN_TIMEOUT_MS ? parseInt(process.env.PG_CONN_TIMEOUT_MS, 10) : 10000,
      });

      await pool.query('SELECT 1');
      console.log(`Banco conectado em ${host || 'host-desconhecido'} (ssl=${useSsl ? 'on' : 'off'})`);
      return pool;
    } catch (err) {
      lastError = err;
      attempts.push(`${safeUserHost}: ${err.message}`);
    }
  }

  const details = attempts.length ? ` Tentativas: ${attempts.join(' | ')}` : '';
  throw new Error((lastError?.message || 'Falha ao conectar no banco de dados') + details);
}

async function empreendimentoExists(pool, id) {
  const { rows } = await pool.query('SELECT id FROM public.empreendimentos WHERE id = $1', [id]);
  return rows[0]?.id || null;
}

async function resolveEmpreendimentoId(pool, record, cache) {
  const raw = toNullableText(record.id_empreendimento);

  if (raw && /^\d+$/.test(raw)) {
    const found = await empreendimentoExists(pool, Number(raw));
    if (found) return Number(found);
  }

  const candidates = [
    ...splitCandidateTerms(record.cliente),
    ...splitCandidateTerms(record.nome_arquivo),
    ...splitCandidateTerms(record.titulo_relatorio),
    ...splitCandidateTerms(record.titulo_capa),
  ];

  for (const term of candidates) {
    if (cache.has(term)) return cache.get(term);

    const { rows } = await pool.query(
      `SELECT id
         FROM public.empreendimentos
        WHERE lower(coalesce(nome_empreendimento, '')) LIKE $1
           OR lower(coalesce(cli_empreendimento, '')) LIKE $1
        ORDER BY id DESC
        LIMIT 1`,
      [`%${term}%`]
    );

    if (rows.length) {
      const id = Number(rows[0].id);
      cache.set(term, id);
      return id;
    }
  }

  return null;
}

function normalizeRevisao(value) {
  const s = toNullableText(value);
  if (!s) return null;
  if (/^\d+$/.test(s) && s.length < 2) return s.padStart(2, '0');
  return s;
}

function buildPayload(record, idEmpreendimento) {
  const secoes = parseJsonArray(record.secoes);
  const assinaturasArray = parseJsonArray(record.assinaturas);
  const assinaturasObject = parseJsonObject(record.assinaturas);

  const assinaturas = assinaturasArray.length
    ? assinaturasArray
    : (Object.keys(assinaturasObject).length ? [assinaturasObject] : []);

  return {
    id_empreendimento: idEmpreendimento,
    data_vistoria: toDate(record.data_vistoria),
    titulo_capa: toNullableText(record.titulo_capa) || 'RELATORIO',
    subtitulo_capa: toNullableText(record.subtitulo_capa) || 'Gerenciamento de Obra',
    texto_rodape_capa: toNullableText(record.texto_rodape_capa),
    titulo_relatorio: toNullableText(record.titulo_relatorio),
    subtitulo_relatorio: toNullableText(record.subtitulo_relatorio),
    cliente: toNullableText(record.cliente),
    revisao: normalizeRevisao(record.revisao),
    eng_obra: toNullableText(record.eng_obra),
    nome_arquivo: toNullableText(record.nome_arquivo),
    secoes,
    assinaturas,
  };
}

async function alreadyImported(pool, payload) {
  const { rows } = await pool.query(
    `SELECT id
       FROM public.nao_conformidades
      WHERE id_empreendimento = $1
        AND nome_arquivo IS NOT DISTINCT FROM $2
        AND data_vistoria IS NOT DISTINCT FROM $3
      LIMIT 1`,
    [payload.id_empreendimento, payload.nome_arquivo, payload.data_vistoria]
  );
  return rows.length > 0;
}

async function insertNaoConformidade(pool, payload) {
  const sql = `INSERT INTO public.nao_conformidades (
      id_empreendimento, data_vistoria, titulo_capa, subtitulo_capa, texto_rodape_capa,
      titulo_relatorio, subtitulo_relatorio, cliente, revisao, eng_obra,
      nome_arquivo, secoes, assinaturas
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb
    ) RETURNING id`;

  const params = [
    payload.id_empreendimento,
    payload.data_vistoria,
    payload.titulo_capa,
    payload.subtitulo_capa,
    payload.texto_rodape_capa,
    payload.titulo_relatorio,
    payload.subtitulo_relatorio,
    payload.cliente,
    payload.revisao,
    payload.eng_obra,
    payload.nome_arquivo,
    JSON.stringify(payload.secoes),
    JSON.stringify(payload.assinaturas),
  ];

  const { rows } = await pool.query(sql, params);
  return rows[0]?.id;
}

async function main() {
  const csvArg = process.argv[2];
  const inputPath = csvArg ? csvArg.trim().replace(/["']/g, '') : DEFAULT_CSV_PATH;
  const csvPath = path.resolve(inputPath);

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV nao encontrado em: ${csvPath}`);
  }

  console.log(`CSV origem: ${csvPath}`);
  const records = parseCsv(csvPath);
  console.log(`Registros no CSV: ${records.length}`);

  const pool = await connectDb();
  const empreendimentoCache = new Map();

  let inserted = 0;
  let skippedDuplicates = 0;
  let skippedSemEmpreendimento = 0;
  let failures = 0;

  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    try {
      const idEmp = await resolveEmpreendimentoId(pool, record, empreendimentoCache);
      if (!idEmp) {
        skippedSemEmpreendimento += 1;
        console.log(`Linha ${i + 2}: empreendimento nao resolvido (cliente="${toNullableText(record.cliente) || ''}")`);
        continue;
      }

      const payload = buildPayload(record, idEmp);

      if (await alreadyImported(pool, payload)) {
        skippedDuplicates += 1;
        continue;
      }

      await insertNaoConformidade(pool, payload);
      inserted += 1;
    } catch (err) {
      failures += 1;
      console.log(`Linha ${i + 2}: ${err.message}`);
    }
  }

  await pool.end();

  console.log('\nResultado da importacao de Nao Conformidades');
  console.log(`Inseridos: ${inserted}`);
  console.log(`Duplicados ignorados: ${skippedDuplicates}`);
  console.log(`Sem empreendimento: ${skippedSemEmpreendimento}`);
  console.log(`Falhas: ${failures}`);
}

main().catch((err) => {
  console.error('Erro fatal:', err.message);
  process.exit(1);
});
