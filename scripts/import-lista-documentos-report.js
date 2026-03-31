import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

dotenv.config();

const { Pool } = pg;

const DEFAULT_CSV_PATH = 'C:/Users/Michael Rocha/Desktop/import/ListadeDocumentos.csv';

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

function parseJsonArray(value) {
  const s = toNullableText(value);
  if (!s) return [];
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : [];
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
    .slice(0, 8);
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

function mapDocumentos(record) {
  const ocorrencias = parseJsonArray(record.ocorrencias);
  const atividades = parseJsonArray(record.atividades_realizadas);

  const source = atividades.length >= ocorrencias.length ? atividades : ocorrencias;
  if (!source.length) return [];

  return source.map((item, index) => ({
    codigo: toNullableText(item.codigo) || toNullableText(item.numero) || String(index + 1),
    rev: toNullableText(item.rev) || '',
    titulo: toNullableText(item.titulo) || toNullableText(item.descricao) || '',
    observacoes: toNullableText(item.observacoes) || '',
  }));
}

function mapAssinaturas(record) {
  const nome = toNullableText(record.responsavel);
  if (!nome) return [];

  return [{
    parte: 'Responsável',
    nome,
    assinatura_imagem: '',
  }];
}

function buildPayload(record, idEmpreendimento) {
  const tipoDocumento = toNullableText(record.tipo_documento) || 'Lista de Documentos';
  const tituloPadrao = tipoDocumento.toUpperCase();
  const numeroRelatorio = toNullableText(record.numero_relatorio);

  return {
    id_empreendimento: idEmpreendimento,
    cliente: toNullableText(record.contratada),
    empreendimento: toNullableText(record.obra_nome),
    titulo: tituloPadrao,
    numero_documento: numeroRelatorio,
    revisao: null,
    data_aviso: toDate(record.data_relatorio),
    documentos: mapDocumentos(record),
    assinaturas: mapAssinaturas(record),
    observacoes_gerais: toNullableText(record.observacoes),
    status_documento: toNullableText(record.status_documento) || 'Rascunho',
  };
}

async function alreadyImported(pool, payload) {
  const { rows } = await pool.query(
    `SELECT id
       FROM public.lista_documentos_report
      WHERE id_empreendimento = $1
        AND numero_documento IS NOT DISTINCT FROM $2
        AND data_aviso IS NOT DISTINCT FROM $3
      LIMIT 1`,
    [payload.id_empreendimento, payload.numero_documento, payload.data_aviso]
  );
  return rows[0]?.id || null;
}

async function updateListaDocumentos(pool, id, payload) {
  const sql = `UPDATE public.lista_documentos_report SET
      cliente = $1,
      empreendimento = $2,
      titulo = $3,
      numero_documento = $4,
      revisao = $5,
      data_aviso = $6,
      documentos = $7::jsonb,
      assinaturas = $8::jsonb,
      observacoes_gerais = $9,
      status_documento = $10,
      updated_at = now()
    WHERE id = $11`;

  const params = [
    payload.cliente,
    payload.empreendimento,
    payload.titulo,
    payload.numero_documento,
    payload.revisao,
    payload.data_aviso,
    JSON.stringify(payload.documentos || []),
    JSON.stringify(payload.assinaturas || []),
    payload.observacoes_gerais,
    payload.status_documento,
    id,
  ];

  await pool.query(sql, params);
}

async function insertListaDocumentos(pool, payload) {
  const sql = `INSERT INTO public.lista_documentos_report(
      id_empreendimento, cliente, empreendimento, titulo, numero_documento, revisao, data_aviso,
      documentos, assinaturas, observacoes_gerais, status_documento
    ) VALUES(
      $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11
    ) RETURNING id`;

  const params = [
    payload.id_empreendimento,
    payload.cliente,
    payload.empreendimento,
    payload.titulo,
    payload.numero_documento,
    payload.revisao,
    payload.data_aviso,
    JSON.stringify(payload.documentos || []),
    JSON.stringify(payload.assinaturas || []),
    payload.observacoes_gerais,
    payload.status_documento,
  ];

  const { rows } = await pool.query(sql, params);
  return rows[0]?.id;
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
  let skippedDuplicates = 0;
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

      const existingId = await alreadyImported(pool, payload);
      if (existingId) {
        await updateListaDocumentos(pool, existingId, payload);
        updated += 1;
        continue;
      }

      await insertListaDocumentos(pool, payload);
      inserted += 1;
    } catch (err) {
      failures += 1;
      console.log(`❌ Linha ${i + 2}: ${err.message}`);
    }
  }

  await pool.end();

  console.log('\n📌 Resultado da importação de Lista de Documentos Report');
  console.log(`   ✅ Inseridos: ${inserted}`);
  console.log(`   🔄 Atualizados: ${updated}`);
  console.log(`   ⏭️  Duplicados ignorados: ${skippedDuplicates}`);
  console.log(`   ⚠️  Sem empreendimento: ${skippedSemEmpreendimento}`);
  console.log(`   ❌ Falhas: ${failures}`);
}

main().catch((err) => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
