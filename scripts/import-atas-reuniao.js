import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

dotenv.config();

const { Pool } = pg;

const DEFAULT_CSV_PATH = 'C:/Users/Michael Rocha/Desktop/import/AtaReuniao.csv';

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

function parseJsonArray(value) {
  const parsed = parseJsonValue(value, []);
  return Array.isArray(parsed) ? parsed : [];
}

function parseJsonObject(value) {
  const parsed = parseJsonValue(value, {});
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  return {};
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
    ...splitCandidateTerms(record.empreendimento),
    ...splitCandidateTerms(record.obra_nome),
    ...splitCandidateTerms(record.cliente),
    ...splitCandidateTerms(record.locatario),
    ...splitCandidateTerms(record.nome_arquivo),
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
  return {
    id_empreendimento: idEmpreendimento,
    titulo_reuniao: toNullableText(record.titulo_reuniao) || toNullableText(record.titulo) || toNullableText(record.titulo_relatorio),
    subtitulo_reuniao: toNullableText(record.subtitulo_reuniao) || toNullableText(record.subtitulo) || toNullableText(record.subtitulo_relatorio),
    data_reuniao: toDate(record.data_reuniao) || toDate(record.data_relatorio),
    hora_inicio: toNullableText(record.hora_inicio),
    hora_termino: toNullableText(record.hora_termino),
    local_reuniao: toNullableText(record.local_reuniao) || toNullableText(record.local),
    tipo_reuniao: toNullableText(record.tipo_reuniao),
    edificio: toNullableText(record.edificio),
    nome_arquivo: toNullableText(record.nome_arquivo),
    locatario: toNullableText(record.locatario),
    titulo_capa: toNullableText(record.titulo_capa),
    subtitulo_capa: toNullableText(record.subtitulo_capa),
    texto_rodape_capa: toNullableText(record.texto_rodape_capa),
    participantes: parseJsonArray(record.participantes),
    informacoes_obra: parseJsonObject(record.informacoes_obra),
    itens_discutidos: parseJsonArray(record.itens_discutidos),
    observacoes: toNullableText(record.observacoes) || toNullableText(record.observacoes_gerais),
    arquivo_ata: toNullableText(record.arquivo_ata),
    responsavel_reuniao: toNullableText(record.responsavel_reuniao) || toNullableText(record.responsavel),
    assinaturas: parseJsonArray(record.assinaturas),
    status: toNullableText(record.status) || toNullableText(record.status_documento) || 'Rascunho',
  };
}

async function findExisting(pool, payload) {
  const { rows } = await pool.query(
    `SELECT id
       FROM public.atas_reuniao
      WHERE id_empreendimento = $1
        AND nome_arquivo IS NOT DISTINCT FROM $2
        AND data_reuniao IS NOT DISTINCT FROM $3
      LIMIT 1`,
    [payload.id_empreendimento, payload.nome_arquivo, payload.data_reuniao]
  );
  return rows[0]?.id || null;
}

async function insertAtaReuniao(pool, payload) {
  const sql = `INSERT INTO public.atas_reuniao(
      id_empreendimento, titulo_reuniao, subtitulo_reuniao, data_reuniao,
      hora_inicio, hora_termino, local_reuniao, tipo_reuniao,
      edificio, nome_arquivo, locatario, titulo_capa, subtitulo_capa, texto_rodape_capa,
      participantes, informacoes_obra, itens_discutidos,
      observacoes, arquivo_ata, responsavel_reuniao, assinaturas, status
    ) VALUES(
      $1, $2, $3, $4,
      $5, $6, $7, $8,
      $9, $10, $11, $12, $13, $14,
      $15::jsonb, $16::jsonb, $17::jsonb,
      $18, $19, $20, $21::jsonb, $22
    ) RETURNING id`;

  const params = [
    payload.id_empreendimento,
    payload.titulo_reuniao,
    payload.subtitulo_reuniao,
    payload.data_reuniao,
    payload.hora_inicio,
    payload.hora_termino,
    payload.local_reuniao,
    payload.tipo_reuniao,
    payload.edificio,
    payload.nome_arquivo,
    payload.locatario,
    payload.titulo_capa,
    payload.subtitulo_capa,
    payload.texto_rodape_capa,
    JSON.stringify(payload.participantes || []),
    JSON.stringify(payload.informacoes_obra || {}),
    JSON.stringify(payload.itens_discutidos || []),
    payload.observacoes,
    payload.arquivo_ata,
    payload.responsavel_reuniao,
    JSON.stringify(payload.assinaturas || []),
    payload.status,
  ];

  const { rows } = await pool.query(sql, params);
  return rows[0]?.id;
}

async function updateAtaReuniao(pool, id, payload) {
  const sql = `UPDATE public.atas_reuniao SET
      titulo_reuniao = $1,
      subtitulo_reuniao = $2,
      data_reuniao = $3,
      hora_inicio = $4,
      hora_termino = $5,
      local_reuniao = $6,
      tipo_reuniao = $7,
      edificio = $8,
      nome_arquivo = $9,
      locatario = $10,
      titulo_capa = $11,
      subtitulo_capa = $12,
      texto_rodape_capa = $13,
      participantes = $14::jsonb,
      informacoes_obra = $15::jsonb,
      itens_discutidos = $16::jsonb,
      observacoes = $17,
      arquivo_ata = $18,
      responsavel_reuniao = $19,
      assinaturas = $20::jsonb,
      status = $21,
      updated_at = now()
    WHERE id = $22`;

  const params = [
    payload.titulo_reuniao,
    payload.subtitulo_reuniao,
    payload.data_reuniao,
    payload.hora_inicio,
    payload.hora_termino,
    payload.local_reuniao,
    payload.tipo_reuniao,
    payload.edificio,
    payload.nome_arquivo,
    payload.locatario,
    payload.titulo_capa,
    payload.subtitulo_capa,
    payload.texto_rodape_capa,
    JSON.stringify(payload.participantes || []),
    JSON.stringify(payload.informacoes_obra || {}),
    JSON.stringify(payload.itens_discutidos || []),
    payload.observacoes,
    payload.arquivo_ata,
    payload.responsavel_reuniao,
    JSON.stringify(payload.assinaturas || []),
    payload.status,
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
        console.log(`⚠️  Linha ${i + 2}: empreendimento não resolvido (nome_arquivo="${toNullableText(record.nome_arquivo) || ''}")`);
        continue;
      }

      const payload = buildPayload(record, idEmp);
      const existingId = await findExisting(pool, payload);

      if (existingId) {
        await updateAtaReuniao(pool, existingId, payload);
        updated += 1;
      } else {
        await insertAtaReuniao(pool, payload);
        inserted += 1;
      }
    } catch (err) {
      failures += 1;
      console.log(`❌ Linha ${i + 2}: ${err.message}`);
    }
  }

  await pool.end();

  console.log('\n📌 Resultado da importação de Atas de Reunião');
  console.log(`   ✅ Inseridos: ${inserted}`);
  console.log(`   ♻️  Atualizados: ${updated}`);
  console.log(`   ⚠️  Sem empreendimento: ${skippedSemEmpreendimento}`);
  console.log(`   ❌ Falhas: ${failures}`);
}

main().catch((err) => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
