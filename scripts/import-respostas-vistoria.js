import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const API_URL = process.env.API_URL || 'https://backend-fitout.onrender.com';
const IMPORT_API_KEY = process.env.IMPORT_API_KEY || '';
const CREATE_MISSING_UNITS = (process.env.CREATE_MISSING_UNITS || 'false').toLowerCase() === 'true';
const DEFAULT_CSV = 'C:/Users/Michael Rocha/Desktop/import/RespostaVistoria.csv';
const DEFAULT_EMPREENDIMENTOS_CSV = 'C:/Users/Michael Rocha/Desktop/import/Empreendimento.csv';
const DEFAULT_UNIDADES_CSV = 'C:/Users/Michael Rocha/Desktop/import/UnidadeEmpreendimento.csv';

// ------------------------------------------------------------------ //
// Helpers
// ------------------------------------------------------------------ //
function toNullableText(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s || s.toLowerCase() === 'null') return null;
  return s;
}

function maybeFixMojibake(value) {
  if (typeof value !== 'string') return value;
  if (!/[ÃÂ]/.test(value)) return value;
  try {
    const fixed = Buffer.from(value, 'latin1').toString('utf8');
    const orig = (value.match(/Ã|Â/g) || []).length;
    const fixd = (fixed.match(/Ã|Â/g) || []).length;
    if (fixd < orig && !fixed.includes('\ufffd')) return fixed;
  } catch { /* keep original */ }
  return value;
}

function fixText(value) {
  if (value === null || value === undefined) return null;
  return maybeFixMojibake(toNullableText(value));
}

function normalize(s) {
  const fixed = maybeFixMojibake(String(s || ''));
  return fixed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[º°]/g, 'o')
    .replace(/[ª]/g, 'a')
    .replace(/�/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function toNumeric(value) {
  const s = toNullableText(value);
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

function parseJsonField(value) {
  const s = toNullableText(value);
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
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

async function apiPost(endpoint, payload) {
  let lastErr = null;
  for (let attempt = 1; attempt <= 6; attempt++) {
    const headers = { 'Content-Type': 'application/json' };
    if (IMPORT_API_KEY) headers['x-import-key'] = IMPORT_API_KEY;
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const body = await response.text();
    if (response.ok) return JSON.parse(body);

    lastErr = new Error(`${response.status}: ${body}`);
    if (response.status !== 429 && response.status < 500) throw lastErr;

    const waitMs = 1200 * attempt;
    console.log(`   [retry] POST ${endpoint} tentativa ${attempt}/6 em ${waitMs}ms`);
    await new Promise(res => setTimeout(res, waitMs));
  }
  throw lastErr || new Error(`Falha POST ${endpoint}`);
}

async function apiGet(endpoint) {
  let lastErr = null;
  for (let attempt = 1; attempt <= 6; attempt++) {
    const headers = {};
    if (IMPORT_API_KEY) headers['x-import-key'] = IMPORT_API_KEY;
    const response = await fetch(`${API_URL}${endpoint}`, { headers });
    if (response.ok) return response.json();

    lastErr = new Error(`GET ${endpoint} retornou ${response.status}`);
    if (response.status !== 429 && response.status < 500) throw lastErr;

    const waitMs = 1200 * attempt;
    console.log(`   [retry] GET ${endpoint} tentativa ${attempt}/6 em ${waitMs}ms`);
    await new Promise(res => setTimeout(res, waitMs));
  }
  throw lastErr || new Error(`Falha GET ${endpoint}`);
}

// ------------------------------------------------------------------ //
// Fase 1: resolver empreendimentos (legacyId → dbId)
// ------------------------------------------------------------------ //
async function buildEmpreendimentosMap(empCsvPath) {
  const empByLegacyId = new Map();
  if (fs.existsSync(empCsvPath)) {
    const empRecords = parseCsv(empCsvPath, ',');
    empRecords.forEach(r => {
      const id = toNullableText(r.id);
      const nome = fixText(r.nome_empreendimento);
      if (id && nome) empByLegacyId.set(id, nome);
    });
    console.log(`   CSV legado empreendimentos: ${empByLegacyId.size} entradas`);
  }

  const dbEmpreendimentos = await apiGet('/api/empreendimentos');
  console.log(`   Empreendimentos no banco: ${dbEmpreendimentos.length}`);

  const resolved = new Map();
  for (const [legacyId, nomeCSV] of empByLegacyId) {
    const normCSV = normalize(maybeFixMojibake(nomeCSV));
    const match = dbEmpreendimentos.find(e => normalize(e.nome_empreendimento) === normCSV);
    if (match) {
      resolved.set(legacyId, match.id);
    } else {
      const partial = dbEmpreendimentos.find(e =>
        normalize(e.nome_empreendimento).includes(normCSV) ||
        normCSV.includes(normalize(e.nome_empreendimento))
      );
      if (partial) {
        resolved.set(legacyId, partial.id);
      } else {
        console.log(`   ⚠️  Sem match: "${nomeCSV}" (legacyId=${legacyId})`);
      }
    }
  }
  console.log(`   Empreendimentos resolvidos: ${resolved.size}/${empByLegacyId.size}`);
  return resolved;
}

// ------------------------------------------------------------------ //
// Fase 1b: resolver unidades (legacyUnidadeId → dbUnidadeId)
// ------------------------------------------------------------------ //
async function buildUnidadesMap(unidadesCsvPath, empMap, neededLegacyIds) {
  if (!fs.existsSync(unidadesCsvPath)) {
    console.log('   CSV de unidades não encontrado, id_unidade será null');
    return new Map();
  }

  // Carregar CSV de unidades (delimitador ;)
  const unidadesCSV = parseCsv(unidadesCsvPath, ';');
  // legacy unidade id → dados da unidade no CSV legado
  const legacyUnidades = new Map();
  for (const r of unidadesCSV) {
    const id = toNullableText(r.id);
    const nome = fixText(r.unidade_empreendimento);
    const legacyEmpId = toNullableText(r.id_empreendimento);
    if (id) {
      legacyUnidades.set(id, {
        nome,
        legacyEmpId,
        cliente_unidade: fixText(r.cliente_unidade),
        metragem_unidade: toNumeric(r.metragem_unidade),
        escopo_unidade: fixText(r.escopo_unidade),
        contatos: parseJsonField(r.contatos),
      });
    }
  }
  console.log(`   CSV legado unidades: ${legacyUnidades.size} entradas`);
  console.log(`   IDs de unidade realmente usados no RespostaVistoria.csv: ${neededLegacyIds.size}`);

  // Buscar todas as unidades uma vez para reduzir risco de rate limit.
  const allDbUnidades = await apiGet('/api/unidades-empreendimento');
  const dbUnidadesByEmp = new Map(); // dbEmpId → [{ id, unidade_empreendimento }]
  for (const u of allDbUnidades) {
    const key = String(u.id_empreendimento);
    if (!dbUnidadesByEmp.has(key)) dbUnidadesByEmp.set(key, []);
    dbUnidadesByEmp.get(key).push(u);
  }

  // Montar mapa: legacyUnidadeId → dbUnidadeId
  const resolved = new Map();
  let notFound = 0;
  let created = 0;
  for (const [legacyId, unidadeData] of legacyUnidades) {
    if (!neededLegacyIds.has(legacyId)) continue;
    const {
      nome,
      legacyEmpId,
      cliente_unidade,
      metragem_unidade,
      escopo_unidade,
      contatos,
    } = unidadeData;
    const dbEmpId = empMap.get(legacyEmpId);
    if (!dbEmpId) continue;
    const dbUnidades = dbUnidadesByEmp.get(String(dbEmpId)) || [];
    const normNome = normalize(maybeFixMojibake(nome || ''));
    const match = dbUnidades.find(u => normalize(u.unidade_empreendimento) === normNome);
    if (match) {
      resolved.set(legacyId, match.id);
    } else {
      const partial = dbUnidades.find(u =>
        normalize(u.unidade_empreendimento).includes(normNome) ||
        normNome.includes(normalize(u.unidade_empreendimento))
      );
      if (partial) {
        resolved.set(legacyId, partial.id);
      } else {
        if (!CREATE_MISSING_UNITS) {
          notFound += 1;
          if (notFound <= 10) {
            console.log(`   ⚠️  Unidade sem match (sem auto-criacao): "${nome}" (legacyId=${legacyId}, emp=${legacyEmpId})`);
          }
          continue;
        }
        // Se não existir no banco, criar unidade automaticamente para manter FK válida.
        try {
          const createdUnit = await apiPost('/api/unidades-empreendimento', {
            id_empreendimento: dbEmpId,
            unidade_empreendimento: nome || `Unidade ${legacyId.slice(0, 6)}`,
            cliente_unidade,
            metragem_unidade,
            escopo_unidade,
            contatos: contatos || [],
          });
          resolved.set(legacyId, createdUnit.id);
          if (!dbUnidadesByEmp.has(String(dbEmpId))) dbUnidadesByEmp.set(String(dbEmpId), []);
          dbUnidadesByEmp.get(String(dbEmpId)).push(createdUnit);
          created += 1;
          if (created <= 10) {
            console.log(`   ➕ Unidade criada: "${nome}" (legacyId=${legacyId}) -> id=${createdUnit.id}`);
          }
        } catch (err) {
          notFound += 1;
          if (notFound <= 10) {
            console.log(`   ⚠️  Unidade sem match e sem criação: "${nome}" (legacyId=${legacyId}, emp=${legacyEmpId}) -> ${err.message}`);
          }
        }
      }
    }
    await new Promise(res => setTimeout(res, 90));
  }
  console.log(`   Unidades resolvidas: ${resolved.size}/${neededLegacyIds.size}`);
  console.log(`   Unidades criadas automaticamente: ${created}`);
  return resolved;
}

// ------------------------------------------------------------------ //
// Fase 2: criar formulários (um por legacyId único)
// ------------------------------------------------------------------ //
async function buildFormulariosMap(records) {
  const groups = new Map();
  for (const r of records) {
    const legId = toNullableText(r.id_formulario) || '__sem_id__';
    if (!groups.has(legId)) groups.set(legId, r);
  }

  console.log(`\n[Fase 2] Criando ${groups.size} formulario(s)...`);
  const formularioIdMap = new Map();

  let existing = [];
  try {
    existing = await apiGet('/api/formularios-vistoria');
  } catch (err) {
    console.log(`   ⚠️  Não foi possível listar formulários existentes: ${err.message}`);
  }

  for (const [legId, r] of groups) {
    const already = existing.find(f => String(f.descricao_formulario || '').includes(`id_formulario=${legId}`));
    if (already) {
      formularioIdMap.set(legId, already.id);
      continue;
    }

    const secoes = parseJsonField(r.estrutura_formulario) || [];
    const nomeVistoria = fixText(r.nome_vistoria) || 'Vistoria';
    const nome = `Formulário - ${nomeVistoria}`;
    try {
      const result = await apiPost('/api/formularios-vistoria', {
        nome_formulario: nome,
        descricao_formulario: `Importado do legado (id_formulario=${legId})`,
        status_formulario: 'Ativo',
        secoes,
      });
      formularioIdMap.set(legId, result.id);
      console.log(`   ✅ id=${result.id} — "${nome}"`);
    } catch (err) {
      console.log(`   ❌ Falha legacyId=${legId}: ${err.message}`);
    }
    await new Promise(res => setTimeout(res, 150));
  }

  return formularioIdMap;
}

// ------------------------------------------------------------------ //
// Fase 3: importar vistorias
// ------------------------------------------------------------------ //
async function main() {
  const csvArg = process.argv[2];
  const csvPath = path.resolve(csvArg ? csvArg.trim().replace(/['"]/g, '') : DEFAULT_CSV);
  const empCsvPath = path.resolve(DEFAULT_EMPREENDIMENTOS_CSV);
  const unidadesCsvPath = path.resolve(DEFAULT_UNIDADES_CSV);

  if (!fs.existsSync(csvPath)) throw new Error(`CSV não encontrado: ${csvPath}`);

  console.log(`CSV: ${csvPath}`);
  console.log(`API: ${API_URL}\n`);
  console.log(`Criar unidades faltantes: ${CREATE_MISSING_UNITS ? 'sim' : 'nao'}\n`);

  const records = parseCsv(csvPath, ',');
  console.log(`Total de registros: ${records.length}\n`);

  console.log('[Fase 1] Resolvendo empreendimentos...');
  const empMap = await buildEmpreendimentosMap(empCsvPath);

  const formMap = await buildFormulariosMap(records);

  // Limita resolução de unidades apenas às que realmente aparecem nas respostas.
  const neededLegacyUnidades = new Set(
    records
      .map(r => toNullableText(r.id_unidade))
      .filter(Boolean)
  );

  console.log('\n[Fase 1b] Resolvendo unidades...');
  const unidadesMap = await buildUnidadesMap(unidadesCsvPath, empMap, neededLegacyUnidades);

  console.log('\n[Fase 3] Importando vistorias...');
  let inserted = 0;
  let skippedSemEmp = 0;
  let skippedSemForm = 0;
  let failures = 0;
  let unidadesNaoResolvidas = 0;

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    try {
      const legacyEmpId = toNullableText(r.id_empreendimento);
      const idEmp = empMap.get(legacyEmpId);
      if (!idEmp) {
        skippedSemEmp += 1;
        if (skippedSemEmp <= 5) {
          console.log(`  ⚠️  Linha ${i + 2}: empreendimento nao resolvido (${legacyEmpId})`);
        }
        continue;
      }

      const legacyFormId = toNullableText(r.id_formulario) || '__sem_id__';
      const idForm = formMap.get(legacyFormId);
      if (!idForm) {
        skippedSemForm += 1;
        console.log(`  ⚠️  Linha ${i + 2}: formulario nao resolvido (${legacyFormId})`);
        continue;
      }

      const legacyUnidadeId = toNullableText(r.id_unidade);
      const legacyUnidadeIdKey = legacyUnidadeId || '';
      const idUnidade = unidadesMap.get(legacyUnidadeIdKey) || null;
      if (!idUnidade) {
        unidadesNaoResolvidas += 1;
        if (unidadesNaoResolvidas <= 10) {
          console.log(`  ⚠️  Linha ${i + 2}: unidade nao resolvida (${legacyUnidadeId}) — pulando`);
        }
        continue;
      }

      // Participantes
      let participantes = [];
      const partRaw = toNullableText(r.participantes);
      if (partRaw) {
        const parsed = parseJsonField(partRaw);
        if (Array.isArray(parsed)) {
          participantes = parsed;
        } else {
          participantes = partRaw.split(',').map(s => s.trim()).filter(Boolean);
        }
      }

      const payload = {
        id_formulario: idForm,
        id_empreendimento: idEmp,
        id_unidade: idUnidade,
        nome_vistoria: fixText(r.nome_vistoria),
        nome_arquivo: fixText(r.nome_arquivo),
        data_vistoria: toNullableText(r.data_vistoria),
        data_relatorio: toNullableText(r.data_relatorio),
        consultor_responsavel: fixText(r.consultor_responsavel),
        participantes,
        texto_os_proposta: fixText(r.texto_os_proposta),
        texto_escopo_consultoria: fixText(r.texto_escopo_consultoria),
        status_vistoria: fixText(r.status_vistoria) || 'Em Andamento',
        respostas: parseJsonField(r.respostas) || {},
        fotos_secoes: parseJsonField(r.fotos_secoes) || [],
        observacoes_secoes: parseJsonField(r.observacoes_secoes) || {},
        estrutura_formulario: parseJsonField(r.estrutura_formulario) || [],
        pontuacao_total: toNumeric(r.pontuacao_total),
        pontuacao_maxima: toNumeric(r.pontuacao_maxima),
      };

      try {
        await apiPost('/api/vistorias', payload);
        inserted += 1;
      } catch (err) {
        failures += 1;
        console.log(`  ❌ Linha ${i + 2}: ${err.message}`);
      }

      if ((i + 1) % 20 === 0) {
        console.log(`  ... ${i + 1}/${records.length} processados`);
      }

      await new Promise(res => setTimeout(res, 80));
    } catch (err) {
      failures += 1;
      console.log(`  ❌ Linha ${i + 2}: ${err.message}`);
    }
  }

  console.log('\nResultado final:');
  console.log(`  ✅ Inseridos:              ${inserted}`);
  console.log(`  ⚠️  Sem empreendimento:    ${skippedSemEmp}`);
  console.log(`  ⚠️  Sem formulario:        ${skippedSemForm}`);
  console.log(`  ⚠️  Unidades nao resolvidas: ${unidadesNaoResolvidas} (pulados)`);
  console.log(`  ❌ Falhas:                ${failures}`);
}

main().catch(err => {
  console.error('Erro fatal:', err.message);
  process.exit(1);
});
