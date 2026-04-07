/**
 * Import InspecaoHidraulica.csv → POST /api/inspecoes-hidraulica
 *
 * Usa o backend remoto (API HTTP) em vez de conectar diretamente ao banco,
 * contornando restrições de acesso externo ao PostgreSQL do Render.
 *
 * Uso:
 *   node scripts/import-inspecao-hidraulica-via-api.js [caminho-do-csv]
 *
 * Variáveis de ambiente opcionais:
 *   IMPORT_API_BASE  — URL base do backend (padrão: https://backend-fitout.onrender.com)
 *   IMPORT_JWT       — Bearer token se o endpoint exigir auth
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const CSV_PATH = process.argv[2] || 'C:/Users/Michael Rocha/Desktop/import/InspecaoHidraulica.csv';
const API_BASE = (process.env.IMPORT_API_BASE || 'https://backend-fitout.onrender.com').replace(/\/$/, '');
const JWT = process.env.IMPORT_JWT || null;

// ---------------------------------------------------------------------------
// Mojibake fix (UTF-8 bytes interpreted as Latin-1 by the exporter)
// ---------------------------------------------------------------------------
function maybeFixMojibake(value) {
  if (typeof value !== 'string') return value;
  if (!/[ÃÂ]/.test(value)) return value;
  try {
    const fixed = Buffer.from(value, 'latin1').toString('utf8');
    const before = (value.match(/Ã|Â/g) || []).length;
    const after = (fixed.match(/Ã|Â/g) || []).length;
    if (after < before && !fixed.includes('\ufffd')) return fixed;
  } catch { /* keep original */ }
  return value;
}

function deepFixStrings(input) {
  if (Array.isArray(input)) return input.map(deepFixStrings);
  if (input && typeof input === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(input)) out[k] = deepFixStrings(v);
    return out;
  }
  return maybeFixMojibake(input);
}

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------
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

function normalize(value) {
  const s = toNullableText(value) || '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function splitCandidateTerms(text) {
  const s = toNullableText(text);
  if (!s) return [];
  return s
    .split(/[|;/,-]/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 3)
    .slice(0, 6);
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------
function makeHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (JWT) h['Authorization'] = `Bearer ${JWT}`;
  return h;
}

async function getJson(url) {
  const res = await fetch(url, { headers: makeHeaders() });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status} ${await res.text()}`);
  return res.json();
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: makeHeaders(),
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

// ---------------------------------------------------------------------------
// Empreendimento resolution — searches loaded list by normalized name
// ---------------------------------------------------------------------------
function resolveEmpreendimentoId(record, empreendimentos, cache) {
  const candidates = [
    ...splitCandidateTerms(record.cliente),
    ...splitCandidateTerms(record.texto_rodape_capa),
    ...splitCandidateTerms(record.nome_arquivo),
    ...splitCandidateTerms(record.titulo_relatorio),
    ...splitCandidateTerms(record.subtitulo_relatorio),
  ];

  for (const term of candidates) {
    const key = term.toLowerCase();
    if (cache.has(key)) return cache.get(key);

    const normTerm = normalize(term);
    const found = empreendimentos.find((e) => {
      const nome = normalize(e.nome_empreendimento || '');
      const cli = normalize(e.cli_empreendimento || e.cliente || '');
      return nome.includes(normTerm) || cli.includes(normTerm);
    });

    if (found) {
      cache.set(key, Number(found.id));
      return Number(found.id);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Payload builder
// ---------------------------------------------------------------------------
function buildPayload(record, idEmpreendimento) {
  return {
    id_empreendimento: idEmpreendimento,
    data_inspecao: toDate(record.data_inspecao),
    titulo_capa: toNullableText(record.titulo_capa),
    subtitulo_capa: toNullableText(record.subtitulo_capa),
    texto_rodape_capa: toNullableText(record.texto_rodape_capa),
    titulo_relatorio: toNullableText(record.titulo_relatorio),
    subtitulo_relatorio: toNullableText(record.subtitulo_relatorio),
    cliente: toNullableText(record.cliente),
    revisao: toNullableText(record.revisao),
    eng_responsavel: toNullableText(record.eng_responsavel),
    nome_arquivo: toNullableText(record.nome_arquivo),
    itens_documentacao: parseJsonArray(record.itens_documentacao),
    comentarios_documentacao: toNullableText(record.comentarios_documentacao),
    locais: parseJsonArray(record.locais),
    observacoes_gerais: toNullableText(record.observacoes_gerais),
    conclusao_r01: toNullableText(record.conclusao_r01),
    conclusao_r02: toNullableText(record.conclusao_r02),
    assinaturas: parseJsonArray(record.assinaturas),
  };
}

// ---------------------------------------------------------------------------
// Duplicate detection
// ---------------------------------------------------------------------------
function alreadyImported(existing, payload) {
  return existing.some((x) => {
    const sameEmp = Number(x.id_empreendimento) === payload.id_empreendimento;
    const sameArq = (x.nome_arquivo || null) === (payload.nome_arquivo || null);
    const sameData = ((x.data_inspecao || '').slice(0, 10)) === (payload.data_inspecao || '');
    return sameEmp && sameArq && sameData;
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const csvPath = path.resolve(CSV_PATH);
  if (!fs.existsSync(csvPath)) throw new Error(`CSV não encontrado: ${csvPath}`);

  console.log(`📄 CSV: ${csvPath}`);
  console.log(`🌐 API base: ${API_BASE}`);

  const csv = fs.readFileSync(csvPath, 'utf8');
  const records = parse(csv, { columns: true, skip_empty_lines: true, trim: true, bom: true, relax_quotes: true });
  console.log(`📊 Registros no CSV: ${records.length}`);
  if (!records.length) { console.log('CSV vazio.'); return; }

  // Load all empreendimentos for ID resolution
  console.log('🔍 Carregando empreendimentos...');
  const empreendimentos = await getJson(`${API_BASE}/api/empreendimentos`);
  const empArray = Array.isArray(empreendimentos) ? empreendimentos : (empreendimentos.results || empreendimentos.data || []);
  console.log(`   → ${empArray.length} empreendimentos carregados`);

  const empCache = new Map();

  let inserted = 0;
  let skippedDuplicates = 0;
  let skippedSemEmp = 0;
  let failures = 0;

  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    const lineNum = i + 2;
    try {
      const idEmp = resolveEmpreendimentoId(record, empArray, empCache);
      if (!idEmp) {
        skippedSemEmp += 1;
        console.log(`⚠️  Linha ${lineNum}: empreendimento não resolvido (cliente="${toNullableText(record.cliente) || ''}")`);
        continue;
      }

      const payload = buildPayload(record, idEmp);

      // Check duplicates via GET
      const existing = await getJson(`${API_BASE}/api/inspecoes-hidraulica?id_empreendimento=${idEmp}`);
      const existingArr = Array.isArray(existing) ? existing : [];
      if (alreadyImported(existingArr, payload)) {
        skippedDuplicates += 1;
        console.log(`⏭️  Linha ${lineNum}: já importado (nome_arquivo="${payload.nome_arquivo || ''}")`);
        continue;
      }

      const { status, body } = await postJson(`${API_BASE}/api/inspecoes-hidraulica`, payload);
      if (status === 200 || status === 201) {
        inserted += 1;
        console.log(`✅ Linha ${lineNum}: inserido id=${body.id} (nome_arquivo="${payload.nome_arquivo || ''}") [emp=${idEmp}]`);
      } else {
        failures += 1;
        console.log(`❌ Linha ${lineNum}: status ${status} → ${JSON.stringify(body).slice(0, 200)}`);
      }
    } catch (err) {
      failures += 1;
      console.log(`❌ Linha ${lineNum}: ${err.message}`);
    }
  }

  console.log('\n📌 Resultado da importação de Inspeção Hidráulica (via API)');
  console.log(`   ✅ Inseridos:              ${inserted}`);
  console.log(`   ⏭️  Duplicados ignorados:   ${skippedDuplicates}`);
  console.log(`   ⚠️  Sem empreendimento:     ${skippedSemEmp}`);
  console.log(`   ❌ Falhas:                 ${failures}`);
}

main().catch((err) => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
