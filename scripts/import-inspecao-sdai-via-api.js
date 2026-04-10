/**
 * Import InspecaoSDAI.csv -> POST /api/inspecoes-sdai
 *
 * Usa backend remoto (HTTP) para gravar no banco do Render,
 * sem conexao direta ao PostgreSQL.
 *
 * Uso:
 *   node scripts/import-inspecao-sdai-via-api.js [caminho-do-csv]
 *
 * Env opcionais:
 *   IMPORT_API_BASE  (default: https://backend-fitout.onrender.com)
 *   IMPORT_JWT       (Bearer token se endpoint exigir auth)
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const CSV_PATH = process.argv[2] || 'C:/Users/Michael Rocha/Desktop/import/InspecaoSDAI.csv';
const API_BASE = (process.env.IMPORT_API_BASE || 'https://backend-fitout.onrender.com').replace(/\/$/, '');
const JWT = process.env.IMPORT_JWT || null;
const DEFAULT_EMP_ID = process.env.IMPORT_DEFAULT_EMPREENDIMENTO_ID
  ? Number(process.env.IMPORT_DEFAULT_EMPREENDIMENTO_ID)
  : null;

function loadEmpreendimentoMap() {
  const raw = process.env.IMPORT_EMPREENDIMENTO_MAP;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

function maybeFixMojibake(value) {
  if (typeof value !== 'string') return value;
  if (!/[ÃÂ]/.test(value)) return value;
  try {
    const fixed = Buffer.from(value, 'latin1').toString('utf8');
    const before = (value.match(/Ã|Â/g) || []).length;
    const after = (fixed.match(/Ã|Â/g) || []).length;
    if (after < before && !fixed.includes('\ufffd')) return fixed;
  } catch {
    // keep original
  }
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

function makeHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (JWT) h.Authorization = `Bearer ${JWT}`;
  return h;
}

async function getJson(url) {
  const res = await fetch(url, { headers: makeHeaders() });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${await res.text()}`);
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

function sanitizeForPayloadLimit(input, stats, maxStringLength = 60000) {
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeForPayloadLimit(item, stats, maxStringLength));
  }

  if (input && typeof input === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(input)) {
      out[k] = sanitizeForPayloadLimit(v, stats, maxStringLength);
    }
    return out;
  }

  if (typeof input === 'string') {
    if (input.startsWith('data:image')) {
      stats.dataUrlsRemoved += 1;
      return null;
    }

    if (input.length > maxStringLength) {
      stats.largeStringsTrimmed += 1;
      return input.slice(0, maxStringLength);
    }
  }

  return input;
}

function buildReducedPayload(payload) {
  const stats = { dataUrlsRemoved: 0, largeStringsTrimmed: 0 };
  const cloned = JSON.parse(JSON.stringify(payload));
  const reduced = sanitizeForPayloadLimit(cloned, stats);

  // Prioriza manter metadados de assinatura, sem imagem pesada
  if (Array.isArray(reduced.assinaturas)) {
    reduced.assinaturas = reduced.assinaturas.map((ass) => ({
      nome: ass?.nome || null,
      parte: ass?.parte || null,
      assinatura_imagem: typeof ass?.assinatura_imagem === 'string' && ass.assinatura_imagem.startsWith('http')
        ? ass.assinatura_imagem
        : null,
    }));
  }

  return { reduced, stats };
}

function buildCompactPayload(payload, level) {
  const p = JSON.parse(JSON.stringify(payload));

  // Level 1: limita listas extensas
  if (level >= 1) {
    if (Array.isArray(p.centrais)) p.centrais = p.centrais.slice(0, 40);
    if (Array.isArray(p.instalacoes)) p.instalacoes = p.instalacoes.slice(0, 80);
    if (Array.isArray(p.itens_instalacao)) p.itens_instalacao = p.itens_instalacao.slice(0, 120);
    if (Array.isArray(p.itens_documentacao)) p.itens_documentacao = p.itens_documentacao.slice(0, 80);
  }

  // Level 2: preserva metadados e remove blocos mais pesados
  if (level >= 2) {
    p.instalacoes = [];
    p.itens_instalacao = [];
    p.assinaturas = [];
    if (typeof p.comentarios_instalacao === 'string') p.comentarios_instalacao = p.comentarios_instalacao.slice(0, 4000);
    if (typeof p.observacoes_gerais === 'string') p.observacoes_gerais = p.observacoes_gerais.slice(0, 4000);
  }

  // Level 3: payload minimo para garantir registro
  if (level >= 3) {
    p.itens_documentacao = [];
    p.centrais = [];
    p.ordem_secoes = [];
    p.comentarios_instalacao = null;
    p.observacoes_gerais = null;
  }

  return p;
}

function resolveEmpreendimentoId(record, empreendimentos, cache, manualMap) {
  const explicit = toNullableText(record.id_empreendimento);

  if (explicit && manualMap[explicit]) {
    return Number(manualMap[explicit]);
  }

  const cliente = toNullableText(record.cliente);
  if (cliente) {
    const key = `cliente:${normalize(cliente)}`;
    if (manualMap[key]) return Number(manualMap[key]);
  }

  const subtitulo = toNullableText(record.subtitulo_relatorio);
  if (subtitulo) {
    const key = `subtitulo:${normalize(subtitulo)}`;
    if (manualMap[key]) return Number(manualMap[key]);
  }

  if (explicit && /^\d+$/.test(explicit)) {
    const n = Number(explicit);
    if (empreendimentos.some((e) => Number(e.id) === n)) return n;
  }

  const candidates = [
    ...splitCandidateTerms(record.cliente),
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
      const id = Number(found.id);
      cache.set(key, id);
      return id;
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

function alreadyImported(existing, payload) {
  return existing.some((x) => {
    const sameEmp = Number(x.id_empreendimento) === payload.id_empreendimento;
    const sameArq = (x.nome_arquivo || null) === (payload.nome_arquivo || null);
    const sameData = ((x.data_inspecao || '').slice(0, 10)) === (payload.data_inspecao || '');
    return sameEmp && sameArq && sameData;
  });
}

async function main() {
  const csvPath = path.resolve(CSV_PATH);
  if (!fs.existsSync(csvPath)) throw new Error(`CSV nao encontrado: ${csvPath}`);

  console.log(`CSV: ${csvPath}`);
  console.log(`API base: ${API_BASE}`);

  const content = fs.readFileSync(csvPath, 'utf8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_quotes: true,
  });

  console.log(`Registros no CSV: ${records.length}`);
  if (!records.length) return;

  const empreendimentos = await getJson(`${API_BASE}/api/empreendimentos`);
  const empArray = Array.isArray(empreendimentos) ? empreendimentos : (empreendimentos.results || empreendimentos.data || []);
  console.log(`Empreendimentos carregados: ${empArray.length}`);

  const empCache = new Map();
  const manualMap = loadEmpreendimentoMap();

  let inserted = 0;
  let skippedDuplicates = 0;
  let skippedSemEmp = 0;
  let failures = 0;
  let usedDefaultEmp = 0;

  for (let i = 0; i < records.length; i += 1) {
    const line = i + 2;
    const record = records[i];

    try {
      let idEmp = resolveEmpreendimentoId(record, empArray, empCache, manualMap);
      if (!idEmp && Number.isFinite(DEFAULT_EMP_ID) && DEFAULT_EMP_ID > 0) {
        idEmp = DEFAULT_EMP_ID;
        usedDefaultEmp += 1;
      }

      if (!idEmp) {
        skippedSemEmp += 1;
        console.log(`Linha ${line}: empreendimento nao resolvido (cliente="${toNullableText(record.cliente) || ''}")`);
        continue;
      }

      const payload = buildPayload(record, idEmp);

      const existing = await getJson(`${API_BASE}/api/inspecoes-sdai?id_empreendimento=${idEmp}`);
      const existingArr = Array.isArray(existing) ? existing : [];
      if (alreadyImported(existingArr, payload)) {
        skippedDuplicates += 1;
        console.log(`Linha ${line}: duplicado (nome_arquivo="${payload.nome_arquivo || ''}")`);
        continue;
      }

      let { status, body } = await postJson(`${API_BASE}/api/inspecoes-sdai`, payload);

      if (status === 413) {
        const { reduced, stats } = buildReducedPayload(payload);
        console.log(`Linha ${line}: payload grande (413), retry baseline (dataUrls removidas=${stats.dataUrlsRemoved}, strings reduzidas=${stats.largeStringsTrimmed})`);
        let retry = await postJson(`${API_BASE}/api/inspecoes-sdai`, reduced);
        status = retry.status;
        body = retry.body;

        for (let level = 1; status === 413 && level <= 3; level += 1) {
          const compact = buildCompactPayload(payload, level);
          console.log(`Linha ${line}: retry compact level ${level}`);
          retry = await postJson(`${API_BASE}/api/inspecoes-sdai`, compact);
          status = retry.status;
          body = retry.body;
        }
      }

      if (status === 200 || status === 201) {
        inserted += 1;
        console.log(`Inserido linha ${line}: id=${body.id} emp=${idEmp}`);
      } else {
        failures += 1;
        console.log(`Falha linha ${line}: status ${status} -> ${JSON.stringify(body).slice(0, 250)}`);
      }
    } catch (err) {
      failures += 1;
      console.log(`Falha linha ${line}: ${err.message}`);
    }
  }

  console.log('\nResultado da importacao SDAI via API');
  console.log(`Inseridos: ${inserted}`);
  console.log(`Duplicados ignorados: ${skippedDuplicates}`);
  console.log(`Sem empreendimento: ${skippedSemEmp}`);
  console.log(`Fallback por empreendimento padrao: ${usedDefaultEmp}`);
  console.log(`Falhas: ${failures}`);

  if (skippedSemEmp > 0) {
    console.log('\nDica: voce pode informar mapeamentos manuais via IMPORT_EMPREENDIMENTO_MAP.');
    console.log('Exemplo:');
    console.log('IMPORT_EMPREENDIMENTO_MAP={"6978f2de41d75590e229dc64":146,"cliente:edificio uniao continental":146}');
  }
}

main().catch((err) => {
  console.error('Erro fatal:', err.message || err);
  process.exit(1);
});
