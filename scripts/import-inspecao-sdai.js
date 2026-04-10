import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

dotenv.config();

const { Pool } = pg;

const DEFAULT_CSV_PATH = 'C:/Users/Michael Rocha/Desktop/import/InspecaoSDAI.csv';

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
    // Keep original when conversion fails.
  }

  return value;
}

function deepFixStrings(input) {
  if (Array.isArray(input)) return input.map(deepFixStrings);
  if (input && typeof input === 'object') {
    const out = {};
    Object.entries(input).forEach(([k, v]) => {
      out[k] = deepFixStrings(v);
    });
    return out;
  }
  return maybeFixMojibake(input);
}

function parseCsv(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf-8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_quotes: true,
  });
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

function splitCandidateTerms(text) {
  const s = toNullableText(text);
  if (!s) return [];
  return s
    .split(/[|;/,-]/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3)
    .slice(0, 6);
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
      console.log(`Banco conectado em ${host || 'host-desconhecido'} (ssl=${useSsl ? 'on' : 'off'})`);
      return pool;
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(lastError?.message || 'Falha ao conectar no banco de dados');
}

async function empreendimentoExists(pool, id) {
  const { rows } = await pool.query('SELECT 1 FROM public.empreendimentos WHERE id = $1', [id]);
  return rows.length > 0;
}

async function resolveEmpreendimentoId(pool, record, cache) {
  const raw = toNullableText(record.id_empreendimento);

  if (raw && /^\d+$/.test(raw)) {
    const id = Number(raw);
    if (await empreendimentoExists(pool, id)) return id;
  }

  const candidates = [
    ...splitCandidateTerms(record.cliente),
    ...splitCandidateTerms(record.nome_arquivo),
    ...splitCandidateTerms(record.titulo_relatorio),
  ];

  for (const term of candidates) {
    if (cache.has(term)) return cache.get(term);

    const { rows } = await pool.query(
      `SELECT id
         FROM public.empreendimentos
        WHERE nome_empreendimento ILIKE $1
           OR cli_empreendimento ILIKE $1
        ORDER BY id DESC
        LIMIT 1`,
      [`%${term}%`]
    );

    if (rows.length >= 1) {
      cache.set(term, rows[0].id);
      return rows[0].id;
    }
  }

  return null;
}

function buildPayload(record, idEmpreendimento) {
  return {
    id_empreendimento: idEmpreendimento,
    data_inspecao: toDate(record.data_inspecao),
    titulo_relatorio: toNullableText(record.titulo_relatorio),
    subtitulo_relatorio: toNullableText(record.subtitulo_relatorio),
    cliente: toNullableText(record.cliente),
    revisao: toNullableText(record.revisao),
    eng_responsavel: toNullableText(record.eng_responsavel),
    nome_arquivo: toNullableText(record.nome_arquivo),
    itens_documentacao: parseJsonArray(record.itens_documentacao),
    centrais: parseJsonArray(record.centrais),
    instalacoes: parseJsonArray(record.instalacoes),
    ordem_secoes: parseJsonArray(record.ordem_secoes),
    itens_instalacao: parseJsonArray(record.itens_instalacao),
    comentarios_instalacao: toNullableText(record.comentarios_instalacao),
    observacoes_gerais: toNullableText(record.observacoes_gerais),
    assinaturas: parseJsonArray(record.assinaturas),
  };
}

async function alreadyImported(pool, payload) {
  const { rows } = await pool.query(
    `SELECT id
       FROM public.inspecoes_sdai
      WHERE id_empreendimento = $1
        AND nome_arquivo IS NOT DISTINCT FROM $2
        AND data_inspecao IS NOT DISTINCT FROM $3
      LIMIT 1`,
    [payload.id_empreendimento, payload.nome_arquivo, payload.data_inspecao]
  );
  return rows.length > 0;
}

async function insertInspecao(pool, payload) {
  const sql = `INSERT INTO public.inspecoes_sdai (
      id_empreendimento, data_inspecao, titulo_relatorio, subtitulo_relatorio, cliente,
      revisao, eng_responsavel, nome_arquivo, itens_documentacao, centrais,
      instalacoes, ordem_secoes, itens_instalacao, comentarios_instalacao,
      observacoes_gerais, assinaturas
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14,$15,$16::jsonb
    ) RETURNING id`;

  const params = [
    payload.id_empreendimento,
    payload.data_inspecao,
    payload.titulo_relatorio,
    payload.subtitulo_relatorio,
    payload.cliente,
    payload.revisao,
    payload.eng_responsavel,
    payload.nome_arquivo,
    JSON.stringify(payload.itens_documentacao),
    JSON.stringify(payload.centrais),
    JSON.stringify(payload.instalacoes),
    JSON.stringify(payload.ordem_secoes),
    JSON.stringify(payload.itens_instalacao),
    payload.comentarios_instalacao,
    payload.observacoes_gerais,
    JSON.stringify(payload.assinaturas),
  ];

  const { rows } = await pool.query(sql, params);
  return rows[0]?.id;
}

async function main() {
  const csvArg = process.argv[2];
  const inputPath = csvArg ? csvArg.trim().replace(/['"]/g, '') : DEFAULT_CSV_PATH;
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

      await insertInspecao(pool, payload);
      inserted += 1;
    } catch (err) {
      failures += 1;
      console.log(`Linha ${i + 2}: ${err.message}`);
    }
  }

  await pool.end();

  console.log('\nResultado da importacao de Inspecao SDAI');
  console.log(`Inseridos: ${inserted}`);
  console.log(`Duplicados ignorados: ${skippedDuplicates}`);
  console.log(`Sem empreendimento: ${skippedSemEmpreendimento}`);
  console.log(`Falhas: ${failures}`);
}

main().catch((err) => {
  console.error('Erro fatal:', err.message);
  process.exit(1);
});
