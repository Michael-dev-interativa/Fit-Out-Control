import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Configuração
const API_URL = process.env.API_URL || 'https://backend-fitout.onrender.com';   
const UNIDADES_CSV = process.env.UNIDADES_CSV || 'C:/Users/Michael Rocha/Desktop/import/UnidadeEmpreendimento.csv';
const EMPREENDIMENTOS_CSV = process.env.EMPREENDIMENTOS_CSV || 'C:/Users/Michael Rocha/Desktop/import/Empreendimento.csv';

function toNullableText(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
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

function buildLegacyMap(records) {
  const map = new Map();
  records.forEach((record) => {
    const legacyId = toNullableText(record.id);
    const nome = toNullableText(record.nome_empreendimento);
    if (legacyId && nome) {
      map.set(legacyId, { nome });
    }
  });
  return map;
}

async function resolveEmpreendimentoId(unidadeNome, empreendimentoNome, legacyMap, cache) {
  // Tentar buscar via API
  try {
    let searchName = empreendimentoNome || unidadeNome;
    if (!searchName) return null;

    // Já temos cacheado?
    if (cache.has(searchName)) return cache.get(searchName);

    const response = await fetch(`${API_URL}/api/empreendimentos`);
    if (!response.ok) throw new Error(`API retornou ${response.status}`);
    
    const empreendimentos = await response.json();
    
    // Procurar por nome similar
    const match = empreendimentos.find(e => 
      String(e.nome_empreendimento || '').toLowerCase().includes(searchName.toLowerCase()) ||
      searchName.toLowerCase().includes(String(e.nome_empreendimento || '').toLowerCase())
    );

    if (match) {
      cache.set(searchName, match.id);
      return match.id;
    }
  } catch (err) {
    console.warn(`  ⚠️  Erro ao buscar empreendimento "${empreendimentoNome}":`, err.message);
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

async function createUnidade(payload) {
  try {
    const response = await fetch(`${API_URL}/api/unidades-empreendimento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`${response.status}: ${error}`);
    }

    return { success: true, id: (await response.json()).id };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function main() {
  if (!fs.existsSync(UNIDADES_CSV)) {
    throw new Error(`CSV de unidades não encontrado em: ${UNIDADES_CSV}`);
  }
  if (!fs.existsSync(EMPREENDIMENTOS_CSV)) {
    throw new Error(`CSV de empreendimentos não encontrado em: ${EMPREENDIMENTOS_CSV}`);
  }

  console.log(`📄 CSV de unidades: ${UNIDADES_CSV}`);
  console.log(`📄 CSV de empreendimentos (mapa): ${EMPREENDIMENTOS_CSV}`);
  console.log(`🌐 API URL: ${API_URL}\n`);

  const unidadesRecords = parseCsv(UNIDADES_CSV, ';');
  const empreendimentosRecords = parseCsv(EMPREENDIMENTOS_CSV, ',');
  
  console.log(`📊 Registros de unidades: ${unidadesRecords.length}`);
  console.log(`📊 Registros de empreendimentos (mapa): ${empreendimentosRecords.length}`);

  const legacyMap = buildLegacyMap(empreendimentosRecords);
  console.log(`📌 Mapa legado carregado: ${legacyMap.size} entradas\n`);

  let inserted = 0;
  let updated = 0;
  let skippedSemEmpreendimento = 0;
  let skippedSemUnidade = 0;
  let failures = 0;

  const empreendimentoCache = new Map();
  let lastStatusPrint = 0;

  for (let i = 0; i < unidadesRecords.length; i += 1) {
    const record = unidadesRecords[i];

    try {
      const unidadeNome = toNullableText(record.unidade_empreendimento);
      if (!unidadeNome) {
        skippedSemUnidade += 1;
        continue;
      }

      // Resolver empreendimento
      const empreendimentoNome = toNullableText(record.empreendimentos);
      const idEmp = await resolveEmpreendimentoId(unidadeNome, empreendimentoNome, legacyMap, empreendimentoCache);
      
      if (!idEmp) {
        skippedSemEmpreendimento += 1;
        continue;
      }

      const payload = buildPayload(record, idEmp);
      const result = await createUnidade(payload);

      if (result.success) {
        inserted += 1;
      } else {
        failures += 1;
        console.log(`❌ Linha ${i + 2}: ${result.error}`);
      }

      // Status a cada 15 registros
      if (i + 1 - lastStatusPrint >= 15) {
        console.log(`  ✅ ${i + 1}/${unidadesRecords.length} processados...`);
        lastStatusPrint = i + 1;
      }
    } catch (err) {
      failures += 1;
      console.log(`❌ Linha ${i + 2}: ${err.message}`);
    }

    // pequeno delay para não sobrecarregar a API
    await new Promise(resolve => setTimeout(resolve, 50));
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
