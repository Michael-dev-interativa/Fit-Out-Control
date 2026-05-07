import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

dotenv.config();

const { Pool } = pg;

const DEFAULT_CSV_PATH = 'C:/Users/Michael Rocha/Desktop/import/RDO.csv';

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
    // Keep original value when conversion fails.
  }

  return value;
}

function toNullableText(value) {
  if (value === null || value === undefined) return null;
  const s = maybeFixMojibake(String(value)).trim();
  if (!s || s.toLowerCase() === 'null') return null;
  return s;
}

function normalizeDate(value) {
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

function splitCandidateTerms(text) {
  const s = toNullableText(text);
  if (!s) return [];
  return s
    .split(/[|;/,-]/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3)
    .slice(0, 8);
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
    ...splitCandidateTerms(record.obra_nome),
    ...splitCandidateTerms(record.obra_local),
    ...splitCandidateTerms(record.contratada),
  ];

  for (const term of candidates) {
    if (cache.has(term)) return cache.get(term);

    const { rows } = await pool.query(
      `SELECT id
         FROM public.empreendimentos
        WHERE nome_empreendimento ILIKE $1
           OR cli_empreendimento ILIKE $1
        ORDER BY id DESC
        LIMIT 3`,
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
  const ocorrencias = parseJsonValue(record.ocorrencias, []);
  const atividades = parseJsonValue(record.atividades_realizadas, []);

  return {
    id_empreendimento: idEmpreendimento,
    tipo_documento: toNullableText(record.tipo_documento) || 'RDO',
    numero_relatorio: toNullableText(record.numero_relatorio),
    data_relatorio: normalizeDate(record.data_relatorio),
    dia_semana: toNullableText(record.dia_semana),
    obra_nome: toNullableText(record.obra_nome),
    obra_local: toNullableText(record.obra_local),
    contratada: toNullableText(record.contratada),
    responsavel: toNullableText(record.responsavel),
    contrato: toNullableText(record.contrato),
    prazo_contratual: toNullableText(record.prazo_contratual),
    prazo_decorrido: toNullableText(record.prazo_decorrido),
    prazo_vencer: toNullableText(record.prazo_vencer),
    condicao_climatica: parseJsonValue(record.condicao_climatica, {}),
    equipes_campo: parseJsonValue(record.equipes_campo, {}),
    atividades_realizadas: Array.isArray(atividades) ? atividades : [],
    ocorrencias: Array.isArray(ocorrencias) ? ocorrencias : [],
    documentos: [],
    fotos: parseJsonValue(record.fotos, []),
    assinaturas: [],
    observacoes: toNullableText(record.observacoes),
    status_documento: toNullableText(record.status_documento) || 'Rascunho',
  };
}

async function findExisting(pool, payload) {
  const { rows } = await pool.query(
    `SELECT id
       FROM public.rdos
      WHERE id_empreendimento = $1
        AND numero_relatorio IS NOT DISTINCT FROM $2
        AND data_relatorio IS NOT DISTINCT FROM $3
        AND tipo_documento IS NOT DISTINCT FROM $4
      LIMIT 1`,
    [payload.id_empreendimento, payload.numero_relatorio, payload.data_relatorio, payload.tipo_documento]
  );
  return rows[0]?.id || null;
}

async function insertRdo(pool, payload) {
  const sql = `INSERT INTO public.rdos(
      id_empreendimento, tipo_documento, numero_relatorio, data_relatorio, dia_semana,
      obra_nome, obra_local, contratada, responsavel, contrato,
      prazo_contratual, prazo_decorrido, prazo_vencer,
      condicao_climatica, equipes_campo, atividades_realizadas, ocorrencias,
      documentos, fotos, assinaturas, observacoes, status_documento
    ) VALUES(
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13,
      $14::jsonb, $15::jsonb, $16::jsonb, $17::jsonb,
      $18::jsonb, $19::jsonb, $20::jsonb, $21, $22
    ) RETURNING id`;

  const params = [
    payload.id_empreendimento,
    payload.tipo_documento,
    payload.numero_relatorio,
    payload.data_relatorio,
    payload.dia_semana,
    payload.obra_nome,
    payload.obra_local,
    payload.contratada,
    payload.responsavel,
    payload.contrato,
    payload.prazo_contratual,
    payload.prazo_decorrido,
    payload.prazo_vencer,
    JSON.stringify(payload.condicao_climatica || {}),
    JSON.stringify(payload.equipes_campo || {}),
    JSON.stringify(payload.atividades_realizadas || []),
    JSON.stringify(payload.ocorrencias || []),
    JSON.stringify(payload.documentos || []),
    JSON.stringify(payload.fotos || []),
    JSON.stringify(payload.assinaturas || []),
    payload.observacoes,
    payload.status_documento,
  ];

  const { rows } = await pool.query(sql, params);
  return rows[0]?.id;
}

async function updateRdo(pool, id, payload) {
  const sql = `UPDATE public.rdos SET
      tipo_documento = $1,
      numero_relatorio = $2,
      data_relatorio = $3,
      dia_semana = $4,
      obra_nome = $5,
      obra_local = $6,
      contratada = $7,
      responsavel = $8,
      contrato = $9,
      prazo_contratual = $10,
      prazo_decorrido = $11,
      prazo_vencer = $12,
      condicao_climatica = $13::jsonb,
      equipes_campo = $14::jsonb,
      atividades_realizadas = $15::jsonb,
      ocorrencias = $16::jsonb,
      documentos = $17::jsonb,
      fotos = $18::jsonb,
      assinaturas = $19::jsonb,
      observacoes = $20,
      status_documento = $21,
      updated_at = now()
    WHERE id = $22`;

  const params = [
    payload.tipo_documento,
    payload.numero_relatorio,
    payload.data_relatorio,
    payload.dia_semana,
    payload.obra_nome,
    payload.obra_local,
    payload.contratada,
    payload.responsavel,
    payload.contrato,
    payload.prazo_contratual,
    payload.prazo_decorrido,
    payload.prazo_vencer,
    JSON.stringify(payload.condicao_climatica || {}),
    JSON.stringify(payload.equipes_campo || {}),
    JSON.stringify(payload.atividades_realizadas || []),
    JSON.stringify(payload.ocorrencias || []),
    JSON.stringify(payload.documentos || []),
    JSON.stringify(payload.fotos || []),
    JSON.stringify(payload.assinaturas || []),
    payload.observacoes,
    payload.status_documento,
    id,
  ];

  await pool.query(sql, params);
}

async function main() {
  const csvArg = process.argv[2];
  const inputPath = csvArg ? csvArg.trim().replace(/['"]/g, '') : DEFAULT_CSV_PATH;
  const csvPath = path.resolve(inputPath);

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV não encontrado em: ${csvPath}`);
  }

  console.log(`📄 CSV origem: ${csvPath}`);
  const records = parseCsv(csvPath);
  console.log(`📊 Registros no CSV: ${records.length}`);

  const pool = await connectDb();
  const empreendimentoCache = new Map();

  let inserted = 0;
  let updated = 0;
  let skippedSemEmpreendimento = 0;
  let failures = 0;

  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    try {
      const idEmp = await resolveEmpreendimentoId(pool, record, empreendimentoCache);
      if (!idEmp) {
        skippedSemEmpreendimento += 1;
        console.log(`⚠️  Linha ${i + 2}: empreendimento não resolvido (obra_nome="${toNullableText(record.obra_nome) || ''}")`);
        continue;
      }

      const payload = buildPayload(record, idEmp);
      const existingId = await findExisting(pool, payload);

      if (existingId) {
        await updateRdo(pool, existingId, payload);
        updated += 1;
        continue;
      }

      await insertRdo(pool, payload);
      inserted += 1;
    } catch (err) {
      failures += 1;
      console.log(`❌ Linha ${i + 2}: ${err.message}`);
    }
  }

  await pool.end();

  console.log('\n📌 Resultado da importação para RDOs');
  console.log(`   ✅ Inseridos: ${inserted}`);
  console.log(`   🔄 Atualizados: ${updated}`);
  console.log(`   ⚠️  Sem empreendimento: ${skippedSemEmpreendimento}`);
  console.log(`   ❌ Falhas: ${failures}`);
}

main().catch((err) => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
