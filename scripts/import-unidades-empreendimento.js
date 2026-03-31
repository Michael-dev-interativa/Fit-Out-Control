import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

dotenv.config();

const { Pool } = pg;

const DEFAULT_UNIDADES_CSV = 'C:/Users/Michael Rocha/Desktop/import/UnidadeEmpreendimento.csv';
const DEFAULT_EMPREENDIMENTOS_CSV = 'C:/Users/Michael Rocha/Desktop/import/Empreendimento.csv';

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

function toNumeric(value) {
  const s = toNullableText(value);
  if (!s) return null;
  const num = parseFloat(s);
  if (Number.isNaN(num)) return null;
  return num;
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

function parseJsonObject(value) {
  const s = toNullableText(value);
  if (!s) return null;
  try {
    const parsed = JSON.parse(s);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}

async function queryWithRetry(pool, sql, params, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await pool.query(sql, params);
    } catch (err) {
      if (attempt === maxRetries) throw err;
      if (!err.message.includes('Connection terminated') && !err.message.includes('Connection refused')) {
        throw err;
      }
      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

function parseCsv(csvPath, delimiter = ',') {
  const content = fs.readFileSync(csvPath, 'utf-8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_quotes: true,
    delimiter,
  });
}

// Build legacy-to-nome mapping from Empreendimento.csv
function buildLegacyMap(records) {
  const map = new Map();
  records.forEach((record) => {
    const legacyId = toNullableText(record.id);
    const nome = toNullableText(record.nome_empreendimento);
    const cliente = toNullableText(record.cli_empreendimento);
    
    if (legacyId && nome) {
      map.set(legacyId, { nome, cliente });
    }
  });
  return map;
}

async function connectDb() {
  const isProductionRuntime = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);
  const dbTarget = (process.env.DB_TARGET || '').toLowerCase();
  const DATABASE_URL_SELECTED = (() => {
    if (dbTarget === 'local') return process.env.DATABASE_URL_LOCAL;
    if (dbTarget === 'remote') return process.env.DATABASE_URL;
    if (isProductionRuntime) return process.env.DATABASE_URL;
    return process.env.DATABASE_URL_LOCAL || process.env.DATABASE_URL;
  })();
  
  if (!DATABASE_URL_SELECTED) {
    throw new Error('DATABASE_URL/DATABASE_URL_LOCAL não configuradas no .env');
  }

  const forcePgSsl = (process.env.PG_FORCE_SSL || '').toLowerCase() === 'true';
  const disablePgSsl = (process.env.PG_DISABLE_SSL || '').toLowerCase() === 'true';
  const usePgSsl = (() => {
    if (disablePgSsl) return false;
    if (forcePgSsl) return true;
    try {
      const u = new URL(DATABASE_URL_SELECTED);
      const host = (u.hostname || '').toLowerCase();
      const sslmode = (u.searchParams.get('sslmode') || '').toLowerCase();
      if (sslmode) return true;
      if (host === 'localhost' || host === '127.0.0.1') return false;
      if (dbTarget === 'local') return false;
      return isProductionRuntime || dbTarget === 'remote';
    } catch {
      return isProductionRuntime;
    }
  })();

  const pool = new Pool({
    connectionString: DATABASE_URL_SELECTED,
    ssl: usePgSsl ? { rejectUnauthorized: false } : false,
    max: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
    statement_timeout: 60000,
  });

  try {
    const u = new URL(DATABASE_URL_SELECTED);
    console.log(`🔌 Banco conectado: ${u.hostname} (ssl=${usePgSsl ? 'on' : 'off'})`);
  } catch {}

  return pool;
}

async function resolveEmpreendimentoId(pool, record, legacyMap, cache) {
  const legacyId = toNullableText(record.id_empreendimento);
  
  // Primary: Try using the new 'empreendimentos' column with direct name match
  const empreendimentoNome = toNullableText(record.empreendimentos);
  if (empreendimentoNome) {
    if (cache.has(empreendimentoNome)) return cache.get(empreendimentoNome);

    const { rows } = await queryWithRetry(pool,
      `SELECT id FROM public.empreendimentos 
       WHERE nome_empreendimento ILIKE $1
       ORDER BY id DESC LIMIT 1`,
      [`%${empreendimentoNome}%`]
    );

    if (rows.length >= 1) {
      cache.set(empreendimentoNome, rows[0].id);
      return rows[0].id;
    }
  }

  // Fallback: Try to resolve using legacy map
  if (!legacyId) return null;

  if (legacyMap.has(legacyId)) {
    const { nome } = legacyMap.get(legacyId);
    
    if (cache.has(nome)) return cache.get(nome);

    const { rows } = await queryWithRetry(pool,
      `SELECT id FROM public.empreendimentos 
       WHERE nome_empreendimento ILIKE $1
       ORDER BY id DESC LIMIT 1`,
      [`%${nome}%`]
    );

    if (rows.length >= 1) {
      cache.set(nome, rows[0].id);
      return rows[0].id;
    }
  }

  return null;
}

function buildPayload(record, idEmpreendimento) {
  return {
    id_empreendimento: idEmpreendimento,
    unidade_empreendimento: toNullableText(record.unidade_empreendimento),
    cliente_unidade: toNullableText(record.cliente_unidade),
    metragem_unidade: toNumeric(record.metragem_unidade),
    escopo_unidade: toNullableText(record.escopo_unidade),
    contatos: parseJsonObject(record.contatos) || parseJsonArray(record.contatos) || null,
  };
}

async function findExisting(pool, payload) {
  const { rows } = await queryWithRetry(pool,
    `SELECT id FROM public.unidades_empreendimento
      WHERE id_empreendimento = $1 
        AND unidade_empreendimento IS NOT DISTINCT FROM $2
        AND cliente_unidade IS NOT DISTINCT FROM $3
      LIMIT 1`,
    [payload.id_empreendimento, payload.unidade_empreendimento, payload.cliente_unidade]
  );
  return rows[0]?.id || null;
}

async function insertUnidade(pool, payload) {
  // Let DB auto-generate the id (SERIAL), don't try to specify it from legacy data
  const sql = `INSERT INTO public.unidades_empreendimento(
      id_empreendimento, unidade_empreendimento, cliente_unidade, metragem_unidade, escopo_unidade, contatos
    ) VALUES(
      $1, $2, $3, $4, $5, $6::jsonb
    ) RETURNING id`;

  const params = [
    payload.id_empreendimento,
    payload.unidade_empreendimento,
    payload.cliente_unidade,
    payload.metragem_unidade,
    payload.escopo_unidade,
    payload.contatos ? JSON.stringify(payload.contatos) : null,
  ];

  const { rows } = await queryWithRetry(pool, sql, params);
  return rows[0]?.id;
}

async function updateUnidade(pool, id, payload) {
  const sql = `UPDATE public.unidades_empreendimento SET
      cliente_unidade = $1,
      metragem_unidade = $2,
      escopo_unidade = $3,
      contatos = $4::jsonb,
      updated_at = now()
    WHERE id = $5`;

  const params = [
    payload.cliente_unidade,
    payload.metragem_unidade,
    payload.escopo_unidade,
    payload.contatos ? JSON.stringify(payload.contatos) : null,
    id,
  ];

  await queryWithRetry(pool, sql, params);
}

async function main() {
  const unidadesArg = process.argv[2];
  const empreendimentosArg = process.argv[3];

  const unidadesPath = path.resolve(unidadesArg ? unidadesArg.trim().replace(/['"]/g, '') : DEFAULT_UNIDADES_CSV);
  const empreendimentosPath = path.resolve(empreendimentosArg ? empreendimentosArg.trim().replace(/['"]/g, '') : DEFAULT_EMPREENDIMENTOS_CSV);

  if (!fs.existsSync(unidadesPath)) {
    throw new Error(`CSV de unidades não encontrado em: ${unidadesPath}`);
  }
  if (!fs.existsSync(empreendimentosPath)) {
    throw new Error(`CSV de empreendimentos não encontrado em: ${empreendimentosPath}`);
  }

  console.log(`📄 CSV de unidades: ${unidadesPath}`);
  console.log(`📄 CSV de empreendimentos (mapa): ${empreendimentosPath}`);

  const unidadesRecords = parseCsv(unidadesPath, ';'); // Semicolon delimiter
  const empreendimentosRecords = parseCsv(empreendimentosPath, ','); // Comma delimiter
  
  console.log(`📊 Registros de unidades: ${unidadesRecords.length}`);
  console.log(`📊 Registros de empreendimentos (mapa): ${empreendimentosRecords.length}`);

  const legacyMap = buildLegacyMap(empreendimentosRecords);
  console.log(`📌 Mapa legado carregado: ${legacyMap.size} entradas`);

  let inserted = 0;
  let updated = 0;
  let skippedSemEmpreendimento = 0;
  let skippedSemUnidade = 0;
  let failures = 0;

  // Process in batches to avoid connection issues
  const BATCH_SIZE = 10;

  for (let batchStart = 0; batchStart < unidadesRecords.length; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, unidadesRecords.length);
    const pool = await connectDb(); // Fresh connection per batch

    try {
      const empreendimentoCache = new Map();

      for (let i = batchStart; i < batchEnd; i += 1) {
        const record = unidadesRecords[i];

        try {
          const unidadeNome = toNullableText(record.unidade_empreendimento);
          if (!unidadeNome) {
            skippedSemUnidade += 1;
            continue;
          }

          const idEmp = await resolveEmpreendimentoId(pool, record, legacyMap, empreendimentoCache);
          if (!idEmp) {
            skippedSemEmpreendimento += 1;
            const clienteInfo = toNullableText(record.cliente_unidade) || toNullableText(record.id_empreendimento) || 'desconhecido';
            // Suppress verbose logging to avoid timeouts
            continue;
          }

          const payload = buildPayload(record, idEmp);
          const existingId = await findExisting(pool, payload);

          if (existingId) {
            await updateUnidade(pool, existingId, payload);
            updated += 1;
          } else {
            await insertUnidade(pool, payload);
            inserted += 1;
          }
        } catch (err) {
          failures += 1;
          console.log(`❌ Linha ${i + 2}: ${err.message}`);
        }
      }
    } finally {
      await pool.end();
    }

    console.log(`✅ Lote ${Math.floor(batchStart / BATCH_SIZE) + 1}: ${batchEnd - batchStart} registros processados (inseridos: ${inserted}, atualizados: ${updated})`);
  }

  console.log('\n📌 Resultado final da importação de Unidades de Empreendimento');
  console.log(`   ✅ Inseridos: ${inserted}`);
  console.log(`   ♻️  Atualizados: ${updated}`);
  console.log(`   ⚠️  Sem empreendimento: ${skippedSemEmpreendimento}`);
  console.log(`   ⚠️  Sem unidade: ${skippedSemUnidade}`);
  console.log(`   ❌ Falhas: ${failures}`);
}

main().catch((err) => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
