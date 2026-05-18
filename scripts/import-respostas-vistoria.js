/**
 * import-respostas-vistoria.js
 * Importa RespostaVistoria.csv → public.respostas_vistoria (conexão direta PostgreSQL)
 *
 * Uso:
 *   node scripts/import-respostas-vistoria.js
 *   DB_TARGET=remote node scripts/import-respostas-vistoria.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

dotenv.config();

const { Pool } = pg;
const IMPORT_DIR = 'C:/Users/Michael Rocha/Desktop/import';
const CSV_FILE = 'RespostaVistoria.csv';

// ─── Utilitários ─────────────────────────────────────────────────────────────

function toText(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return !s || s.toLowerCase() === 'null' ? null : s;
}

function toDate(value) {
  const s = toText(value);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function toJson(value, fallback) {
  const s = toText(value);
  if (!s) return fallback;
  try { return JSON.parse(s) ?? fallback; } catch { return fallback; }
}

function toNumeric(value) {
  const s = toText(value);
  if (!s) return null;
  const n = parseFloat(s.replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

// Extrai timestamp de um MongoDB ObjectId hex (primeiros 4 bytes = unix seconds)
function mongoTimestamp(hexId) {
  if (!hexId || hexId.length < 8) return 0;
  return parseInt(hexId.substring(0, 8), 16);
}

// ─── Conexão ─────────────────────────────────────────────────────────────────

async function connectDb() {
  const target = (process.env.DB_TARGET || '').toLowerCase();
  const urls = [];
  if (target === 'local')  urls.push(process.env.DATABASE_URL_LOCAL);
  else if (target === 'remote') urls.push(process.env.DATABASE_URL);
  else { urls.push(process.env.DATABASE_URL_LOCAL); urls.push(process.env.DATABASE_URL); }

  for (const url of urls.filter(Boolean)) {
    let host = '';
    try { host = new URL(url).hostname.toLowerCase(); } catch { host = url.slice(0, 30); }
    const useSsl = !(host === 'localhost' || host === '127.0.0.1');
    try {
      const pool = new Pool({ connectionString: url, ssl: useSsl ? { rejectUnauthorized: false } : false, max: 5 });
      await pool.query('SELECT 1');
      console.log(`🔌 Conectado em ${host}`);
      return pool;
    } catch { /* tenta próximo */ }
  }
  throw new Error('Não foi possível conectar ao banco de dados. Verifique DATABASE_URL no .env');
}

// ─── Mapeamento de empreendimentos (hex ObjectId → bigint) ───────────────────
// Estratégia em cascata:
//   1. Busca nome do empreendimento em nome_arquivo, participantes, escopo
//   2. Busca por cliente_unidade das unidades do banco
//   3. Extrai nomes de empreendimento de "(Nome Prédio)" nos participantes

async function buildEmpMap(pool, records) {
  const empMap = new Map();

  const hexIds = [...new Set(
    records.map(r => toText(r.id_empreendimento)).filter(h => h && !/^\d+$/.test(h))
  )];
  console.log(`  ${hexIds.length} hex empreendimento IDs únicos para resolver...`);

  // Pré-carrega todos os empreendimentos e unidades com cliente
  const { rows: allEmps } = await pool.query('SELECT id, nome_empreendimento, cli_empreendimento FROM public.empreendimentos');
  const { rows: allUnits } = await pool.query('SELECT id_empreendimento, cliente_unidade FROM public.unidades_empreendimento WHERE id_empreendimento IS NOT NULL AND cliente_unidade IS NOT NULL');

  function findEmpByTerm(term) {
    const t = term.toLowerCase();
    // Busca pelo nome do empreendimento
    const byEmp = allEmps.filter(e =>
      e.nome_empreendimento?.toLowerCase().includes(t) ||
      e.cli_empreendimento?.toLowerCase().includes(t)
    );
    if (byEmp.length === 1) return byEmp[0].id;
    if (byEmp.length > 1) return byEmp[byEmp.length - 1].id; // mais recente

    // Busca pelo cliente da unidade
    const byClient = allUnits.filter(u => u.cliente_unidade?.toLowerCase().includes(t));
    if (byClient.length > 0) return byClient[0].id_empreendimento;

    return null;
  }

  for (const hexId of hexIds) {
    const related = records.filter(r => toText(r.id_empreendimento) === hexId);

    // Junta todos os textos disponíveis
    const allText = related.flatMap(r => [
      r.nome_arquivo, r.participantes, r.nome_vistoria, r.texto_escopo_consultoria
    ].filter(Boolean)).join(' ');

    // Termos gerais (>= 4 chars)
    const terms = [...new Set(allText.split(/[\s\-_.,;/|()\[\]]+/).filter(w => w.length >= 4))];
    // Termos extraídos de "(Nome Prédio)" nos participantes (conteúdo entre parênteses)
    const parenTerms = [...allText.matchAll(/\(([^)]+)\)/g)].map(m => m[1].trim()).filter(Boolean);
    const allTerms = [...new Set([...terms, ...parenTerms])];

    for (const term of allTerms) {
      const found = findEmpByTerm(term);
      if (found) { empMap.set(hexId, found); break; }
    }

    if (!empMap.has(hexId))
      console.log(`  ⚠️  hex_emp ${hexId} não resolvido`);
  }

  return empMap;
}

// ─── Mapeamento de unidades (hex ObjectId → bigint) ──────────────────────────
// Estratégia:
//   1. Agrupa hex_units por hex_emp
//   2. Para cada grupo, resolve o emp_id numérico
//   3. Se 1 unidade no DB: atribui diretamente
//   4. Se múltiplas: tenta match por nome da unidade contra textos do CSV;
//      fallback: ordena hex_units por timestamp MongoDB, mapeia para db_units por id

async function buildUnitMap(pool, records, empMap) {
  const unitMap = new Map();

  const empUnits = new Map();
  for (const r of records) {
    const hexEmp  = toText(r.id_empreendimento);
    const hexUnit = toText(r.id_unidade);
    if (!hexEmp || !hexUnit) continue;
    if (!empUnits.has(hexEmp)) empUnits.set(hexEmp, new Set());
    empUnits.get(hexEmp).add(hexUnit);
  }

  for (const [hexEmp, hexUnitSet] of empUnits) {
    const numEmpId = empMap.get(hexEmp) ?? (/^\d+$/.test(hexEmp ?? '') ? Number(hexEmp) : null);
    if (!numEmpId) continue;

    const { rows: dbUnits } = await pool.query(
      `SELECT id, unidade_empreendimento FROM public.unidades_empreendimento
       WHERE id_empreendimento = $1 ORDER BY id`,
      [numEmpId]
    );
    const hexUnits = [...hexUnitSet];

    if (dbUnits.length === 0) {
      console.log(`  ⚠️  emp_id=${numEmpId}: nenhuma unidade no DB`);
      continue;
    }

    if (dbUnits.length === 1) {
      hexUnits.forEach(hu => unitMap.set(hu, dbUnits[0].id));
      continue;
    }

    // Múltiplas unidades: tenta match por nome contra textos da vistoria
    for (const hexUnit of hexUnits) {
      if (unitMap.has(hexUnit)) continue;
      const relTexts = records
        .filter(r => toText(r.id_unidade) === hexUnit)
        .flatMap(r => [r.nome_arquivo, r.texto_escopo_consultoria, r.nome_vistoria].filter(Boolean))
        .join(' ')
        .toLowerCase();

      let matched = false;
      for (const dbUnit of dbUnits) {
        const words = (dbUnit.unidade_empreendimento || '').toLowerCase()
          .split(/[\s\-_.,;/|()\[\]]+/).filter(w => w.length >= 3);
        if (words.some(w => relTexts.includes(w))) {
          unitMap.set(hexUnit, dbUnit.id); matched = true; break;
        }
      }

      if (!matched) {
        // Fallback cronológico: ordena hexIds por timestamp MongoDB → mapeia para dbUnits por id
        const sortedHex = [...hexUnits].sort((a, b) => mongoTimestamp(a) - mongoTimestamp(b));
        sortedHex.forEach((hu, idx) => {
          if (!unitMap.has(hu) && dbUnits[idx]) unitMap.set(hu, dbUnits[idx].id);
        });

        if (!unitMap.has(hexUnit))
          console.log(`  ⚠️  hex_unit ${hexUnit} (emp_id=${numEmpId}): não mapeado`);
      }
    }
  }

  return unitMap;
}

// ─── Upsert ───────────────────────────────────────────────────────────────────

const JSON_COLS = new Set(['participantes', 'observacoes_secoes', 'fotos_secoes', 'estrutura_formulario', 'respostas']);

async function upsert(pool, rec) {
  // Detecta duplicata por nome_arquivo + id_empreendimento
  const { rows: existing } = await pool.query(
    `SELECT id FROM public.respostas_vistoria
     WHERE id_empreendimento = $1 AND nome_arquivo IS NOT DISTINCT FROM $2 LIMIT 1`,
    [rec.id_empreendimento, rec.nome_arquivo]
  );

  const keys = Object.keys(rec);
  const ph  = (k, i) => JSON_COLS.has(k) ? `$${i + 1}::jsonb` : `$${i + 1}`;
  const val = (k)    => {
    const v = rec[k];
    if (v === null || v === undefined) return null;
    if (typeof v === 'object') return JSON.stringify(v);
    if (JSON_COLS.has(k)) return JSON.stringify(v); // wrap string/number as valid JSON
    return v;
  };

  if (existing.length > 0) {
    const sets   = keys.map((k, i) => `${k} = ${ph(k, i)}`).join(', ');
    const params = [...keys.map(val), existing[0].id];
    await pool.query(
      `UPDATE public.respostas_vistoria SET ${sets}, updated_at = now() WHERE id = $${params.length}`,
      params
    );
    return 'updated';
  }

  const cols = keys.join(', ');
  const phs  = keys.map((k, i) => ph(k, i)).join(', ');
  await pool.query(
    `INSERT INTO public.respostas_vistoria(${cols}) VALUES(${phs})`,
    keys.map(val)
  );
  return 'inserted';
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = path.resolve(IMPORT_DIR, CSV_FILE);
  if (!fs.existsSync(csvPath)) throw new Error(`CSV não encontrado: ${csvPath}`);

  const records = parse(fs.readFileSync(csvPath, 'utf-8'), {
    columns: true, skip_empty_lines: true, bom: true, relax_quotes: true, trim: true,
  });
  console.log(`📄 ${records.length} registros em ${CSV_FILE}\n`);

  const pool = await connectDb();

  console.log('\n🗺️  Mapeando empreendimentos...');
  const empMap = await buildEmpMap(pool, records);
  console.log(`   ✅ ${empMap.size} empreendimentos mapeados`);

  console.log('\n🗺️  Mapeando unidades...');
  const unitMap = await buildUnitMap(pool, records, empMap);
  console.log(`   ✅ ${unitMap.size} unidades mapeadas`);

  console.log('\n📥 Importando registros...\n');
  let inserted = 0, updated = 0, skipped = 0, failures = 0;

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    try {
      const hexEmp  = toText(row.id_empreendimento);
      const hexUnit = toText(row.id_unidade);

      const empId  = hexEmp  ? (empMap.get(hexEmp)  ?? (/^\d+$/.test(hexEmp)  ? Number(hexEmp)  : null)) : null;
      const unitId = hexUnit ? (unitMap.get(hexUnit) ?? (/^\d+$/.test(hexUnit) ? Number(hexUnit) : null)) : null;

      if (!empId) {
        skipped++;
        console.log(`  ⚠️  Linha ${i + 2}: empreendimento não resolvido (hex=${hexEmp})`);
        continue;
      }

      // participantes: tenta JSON, senão armazena como string (JSONB aceita primitiva string)
      const partRaw = toText(row.participantes);
      let participantes = null;
      if (partRaw) {
        try { participantes = JSON.parse(partRaw); }
        catch { participantes = partRaw; }
      }

      const rec = {
        id_empreendimento:     empId,
        id_unidade:            unitId,
        nome_arquivo:          toText(row.nome_arquivo),
        nome_vistoria:         toText(row.nome_vistoria),
        consultor_responsavel: toText(row.consultor_responsavel),
        texto_os_proposta:     toText(row.texto_os_proposta),
        texto_escopo_consultoria: toText(row.texto_escopo_consultoria),
        status_vistoria:       toText(row.status_vistoria),
        data_vistoria:         toDate(row.data_vistoria),
        data_relatorio:        toDate(row.data_relatorio),
        pontuacao_total:       toNumeric(row.pontuacao_total),
        pontuacao_maxima:      toNumeric(row.pontuacao_maxima),
        participantes,
        observacoes_secoes:    toJson(row.observacoes_secoes, {}),
        fotos_secoes:          toJson(row.fotos_secoes, {}),
        estrutura_formulario:  toJson(row.estrutura_formulario, []),
        respostas:             toJson(row.respostas, {}),
      };

      const result = await upsert(pool, rec);
      if (result === 'inserted') inserted++; else updated++;

      if ((i + 1) % 25 === 0)
        console.log(`  ... ${i + 1}/${records.length} processados`);

    } catch (err) {
      failures++;
      console.log(`  ❌ Linha ${i + 2}: ${err.message}`);
    }
  }

  await pool.end();
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Inseridos:       ${String(inserted).padStart(4)}
🔄 Atualizados:     ${String(updated).padStart(4)}
⚠️  Sem mapeamento: ${String(skipped).padStart(4)}
❌ Falhas:          ${String(failures).padStart(4)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
