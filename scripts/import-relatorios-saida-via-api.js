import fs from 'fs';
import { parse } from 'csv-parse/sync';

const CSV_PATH = process.argv[2] || 'C:/Users/Michael Rocha/Desktop/import/RelatorioSaida.csv';
const API_BASE = process.env.IMPORT_API_BASE || 'https://backend-fitout.onrender.com';
const DEFAULT_UNIT_ID = Number(process.env.IMPORT_DEFAULT_UNIDADE_ID || 530);

function toNullableText(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
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

function parseJsonValue(value, fallback) {
  const s = toNullableText(value);
  if (!s) return fallback;
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
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

function buildPayload(row, unit) {
  return {
    id_formulario: null,
    id_unidade: Number(unit.id),
    id_empreendimento: Number(unit.id_empreendimento),
    estrutura_formulario: parseJsonValue(row.estrutura_formulario, []),
    nome_relatorio: toNullableText(row.nome_relatorio) || 'Relatorio de Saida',
    nome_arquivo: toNullableText(row.nome_arquivo),
    data_saida: toDate(row.data_saida),
    data_relatorio: toDate(row.data_relatorio),
    consultor_responsavel: toNullableText(row.consultor_responsavel),
    locatario: toNullableText(row.locatario),
    endereco_capa: toNullableText(row.endereco_capa),
    subtitulo_capa: toNullableText(row.subtitulo_capa),
    unidade_exibicao: toNullableText(row.unidade_exibicao),
    representantes: toNullableText(row.representantes),
    texto_os_proposta: toNullableText(row.texto_os_proposta),
    revisao: toNullableText(row.revisao),
    respostas: parseJsonValue(row.respostas, {}),
    fotos_secoes: parseJsonValue(row.fotos_secoes, {}),
    status_saida: toNullableText(row.status_saida) || 'Em Andamento',
    observacoes_secoes: parseJsonValue(row.observacoes_secoes, {}),
    checklist_inicial: parseJsonValue(row.checklist_inicial, {}),
    descricao_geral_adequacoes: parseJsonValue(row.descricao_geral_adequacoes, {}),
    detalhamento_adequacoes: parseJsonValue(row.detalhamento_adequacoes, {}),
    declaracoes: parseJsonValue(row.declaracoes, {}),
    assinaturas: parseJsonValue(row.assinaturas, []),
  };
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GET ${url} falhou (${res.status})`);
  }
  return res.json();
}

function asArray(v) {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  return [v];
}

function chooseUnit(row, units, defaultUnit) {
  const loc = normalize(row.locatario);
  const uni = normalize(row.unidade_exibicao);

  if (loc.includes('souto')) {
    const found = units.find((u) => normalize(u.cliente_unidade).includes('souto') && u.id_empreendimento);
    if (found) return { unit: found, strategy: 'locatario:souto' };
  }

  if (uni) {
    const found = units.find((u) => normalize(u.unidade_empreendimento).includes(uni) && u.id_empreendimento);
    if (found) return { unit: found, strategy: 'unidade_exibicao' };
  }

  if (defaultUnit) {
    return { unit: defaultUnit, strategy: 'fallback_default_unidade' };
  }

  return null;
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) throw new Error(`CSV não encontrado: ${CSV_PATH}`);

  const csv = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parse(csv, { columns: true, skip_empty_lines: true, trim: true, bom: true, relax_quotes: true });

  if (!rows.length) {
    console.log('CSV vazio.');
    return;
  }

  const allUnits = asArray(await getJson(`${API_BASE}/api/unidades-empreendimento?order=-created_date`));
  const defaultUnit = allUnits.find((u) => Number(u.id) === DEFAULT_UNIT_ID) || null;

  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const chosen = chooseUnit(row, allUnits, defaultUnit);

    if (!chosen) {
      skipped += 1;
      console.log(`⚠️ Linha ${i + 2} sem mapeamento de unidade.`);
      continue;
    }

    const payload = buildPayload(row, chosen.unit);

    const existing = asArray(await getJson(`${API_BASE}/api/relatorios-saida?id_empreendimento=${payload.id_empreendimento}&order=-created_date`));
    const dup = existing.find((x) =>
      Number(x.id_unidade) === payload.id_unidade
      && (x.nome_relatorio || '') === (payload.nome_relatorio || '')
      && ((x.data_saida || '').slice(0, 10)) === (payload.data_saida || '')
    );

    if (dup) {
      console.log(`⏭️ Linha ${i + 2} já existe (id=${dup.id}, strategy=${chosen.strategy}).`);
      continue;
    }

    const res = await fetch(`${API_BASE}/api/relatorios-saida`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      skipped += 1;
      console.log(`❌ Linha ${i + 2} falhou (${res.status}): ${body}`);
      continue;
    }

    const out = await res.json();
    inserted += 1;
    console.log(`✅ Inserido id=${out.id} (linha ${i + 2}, strategy=${chosen.strategy}, unidade=${payload.id_unidade}, empreendimento=${payload.id_empreendimento})`);
  }

  console.log('\nResumo importacao relatorios_saida via API');
  console.log(`- Linhas CSV: ${rows.length}`);
  console.log(`- Inseridos: ${inserted}`);
  console.log(`- Ignorados/Falhas: ${skipped}`);
}

main().catch((err) => {
  console.error('Erro na importacao via API:', err.message || err);
  process.exit(1);
});
