/**
 * import-all-csv.js
 * Importa todos os CSVs para suas respectivas tabelas no banco de dados.
 *
 * Uso:
 *   node scripts/import-all-csv.js                       (importa todas as tabelas)
 *   node scripts/import-all-csv.js rdos                  (importa apenas rdos)
 *   node scripts/import-all-csv.js rdos relatorios_semanais   (múltiplas tabelas)
 *   DB_TARGET=remote node scripts/import-all-csv.js      (banco remoto)
 *   DB_TARGET=local  node scripts/import-all-csv.js      (banco local — padrão)
 */

import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

dotenv.config();

const { Pool } = pg;

const IMPORT_DIR = 'C:/Users/Michael Rocha/Desktop/import';

// ─── Utilitários ────────────────────────────────────────────────────────────

function maybeFixMojibake(value) {
  if (typeof value !== 'string') return value;
  if (!/[ÃÂ]/.test(value)) return value;
  try {
    const fixed = Buffer.from(value, 'latin1').toString('utf8');
    const before = (value.match(/Ã|Â/g) || []).length;
    const after = (fixed.match(/Ã|Â/g) || []).length;
    if (after < before && !fixed.includes('')) return fixed;
  } catch { /* keep original */ }
  return value;
}

function toText(value) {
  if (value === null || value === undefined) return null;
  const s = maybeFixMojibake(String(value)).trim();
  if (!s || s.toLowerCase() === 'null') return null;
  return s;
}

function toDate(value) {
  const s = toText(value);
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

function toJson(value, fallback = []) {
  const s = toText(value);
  if (!s) return fallback;
  try {
    const parsed = JSON.parse(s);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function toNumeric(value) {
  const s = toText(value);
  if (!s) return null;
  const n = parseFloat(s.replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

function splitTerms(text) {
  const s = toText(text);
  if (!s) return [];
  return s.split(/[|;/,\-]/).map(p => p.trim()).filter(p => p.length >= 3).slice(0, 8);
}

function parseCsv(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf-8');
  return parse(content, { columns: true, skip_empty_lines: true, trim: true, bom: true, relax_quotes: true });
}

function resolveCsvPath(dir, basename) {
  const direct = path.resolve(dir, basename);
  if (fs.existsSync(direct)) return direct;
  const exportVariant = path.resolve(dir, basename.replace(/\.csv$/i, '_export.csv'));
  if (fs.existsSync(exportVariant)) return exportVariant;
  return direct;
}

// ─── Conexão ─────────────────────────────────────────────────────────────────

async function connectDb() {
  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);
  const target = (process.env.DB_TARGET || '').toLowerCase();
  const primary = (() => {
    if (target === 'local') return process.env.DATABASE_URL_LOCAL;
    if (target === 'remote') return process.env.DATABASE_URL;
    if (isProd) return process.env.DATABASE_URL;
    return process.env.DATABASE_URL_LOCAL || process.env.DATABASE_URL;
  })();
  const fallback = primary === process.env.DATABASE_URL_LOCAL ? process.env.DATABASE_URL : process.env.DATABASE_URL_LOCAL;
  const urls = [primary, fallback].filter(Boolean);
  if (!urls.length) throw new Error('Configure DATABASE_URL ou DATABASE_URL_LOCAL no .env');

  for (const url of urls) {
    const host = (() => { try { return new URL(url).hostname.toLowerCase(); } catch { return ''; } })();
    const sslmode = (() => { try { return new URL(url).searchParams.get('sslmode') || ''; } catch { return ''; } })();
    const useSsl = (process.env.PG_DISABLE_SSL || '').toLowerCase() === 'true' ? false
      : (process.env.PG_FORCE_SSL || '').toLowerCase() === 'true' ? true
      : sslmode ? true
      : host === 'localhost' || host === '127.0.0.1' ? false
      : target === 'local' ? false
      : isProd || target === 'remote';
    try {
      const pool = new Pool({ connectionString: url, ssl: useSsl ? { rejectUnauthorized: false } : false, max: 5 });
      await pool.query('SELECT 1');
      console.log(`🔌 Conectado em ${host || 'host'} (ssl=${useSsl ? 'on' : 'off'})`);
      return pool;
    } catch { /* try fallback */ }
  }
  throw new Error('Falha ao conectar no banco de dados');
}

// ─── Resolução de empreendimento ─────────────────────────────────────────────

async function resolveEmpId(pool, record, candidateFields, cache, legacyMap = new Map()) {
  const raw = toText(record.id_empreendimento);

  if (raw) {
    if (legacyMap.has(raw)) return legacyMap.get(raw);
    if (/^\d+$/.test(raw)) {
      const id = Number(raw);
      const { rows } = await pool.query('SELECT 1 FROM public.empreendimentos WHERE id = $1', [id]);
      if (rows.length > 0) return id;
    }
  }

  const terms = candidateFields
    .flatMap(f => splitTerms(record[f]))
    .filter(Boolean);

  for (const term of terms) {
    if (cache.has(term)) return cache.get(term);
    const { rows } = await pool.query(
      `SELECT id FROM public.empreendimentos
        WHERE nome_empreendimento ILIKE $1 OR cli_empreendimento ILIKE $1
        ORDER BY id DESC LIMIT 1`,
      [`%${term}%`]
    );
    if (rows.length > 0) {
      cache.set(term, rows[0].id);
      return rows[0].id;
    }
  }
  return null;
}

// ─── Mapa de IDs legados (hex ObjectId → postgres id) ───────────────────────

async function buildLegacyIdMap(pool) {
  const legacyMap = new Map();
  const nameCache = new Map();

  const seedCsvs = [
    { file: 'AtaReuniao.csv', nameFields: ['locatario', 'edificio'] },
    { file: 'RDO.csv', nameFields: ['obra_nome', 'obra_local', 'contratada'] },
    { file: 'NaoConformidade.csv', nameFields: ['cliente'] },
    { file: 'VistoriaTecnica.csv', nameFields: ['cliente'] },
    { file: 'InspecaoEletrica.csv', nameFields: ['cliente'] },
    { file: 'InspecaoArCondicionado.csv', nameFields: ['cliente'] },
    { file: 'InspecaoGas.csv', nameFields: ['cliente'] },
    { file: 'InspecaoSDAI.csv', nameFields: ['cliente'] },
    { file: 'InspecaoHidraulica.csv', nameFields: ['cliente'] },
    { file: 'InspecaoAlarmeIncendio.csv', nameFields: ['cliente'] },
    { file: 'InspecaoCFTV.csv', nameFields: ['cliente'] },
    { file: 'InspecaoControleAcesso.csv', nameFields: ['cliente'] },
    { file: 'InspecaoSprinklers.csv', nameFields: ['cliente'] },
    // arquivo_manual é uma URL — o filename contém o nome do empreendimento (ex: "Manualdeobras-PinheirosOne.pdf")
    { file: 'ManualGeral.csv', nameFields: ['nome_manual', 'arquivo_manual', 'descricao_manual'] },
    { file: 'RelatorioEntrada.csv', nameFields: ['locatario', 'nome_relatorio'] },
    { file: 'RelatorioSaida.csv', nameFields: ['locatario', 'nome_relatorio'] },
    { file: 'RespostaVistoria.csv', nameFields: ['nome_vistoria'] },
    { file: 'DiarioDeObra.csv', nameFields: ['unidade_texto'] },
  ];

  // Extração agressiva: URLs → extrai filename, depois split em delimitadores, CamelCase e palavras
  function aggressiveTerms(text) {
    const s = toText(text);
    if (!s) return [];

    // Para URLs, pega somente o último segmento do path (o filename)
    let source = s;
    if (s.startsWith('http')) {
      const seg = s.split('/').pop() || '';
      // Remove prefixo hash (ex: "fcb732368_") e extensão
      source = seg.replace(/^[0-9a-f]{8,}_/i, '').replace(/\.[^.]+$/, '');
    }

    // Split em delimitadores comuns + underscore
    const parts = source.split(/[|;/,\-()\[\]_]/).map(p => p.trim()).filter(p => p.length >= 4);

    // CamelCase split: "PinheirosOne" → "Pinheiros One", "SilvioRomero" → "Silvio Romero"
    const camelParts = parts.flatMap(p => {
      const expanded = p
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
      return expanded === p ? [p] : [p, expanded];
    });

    const words = camelParts.flatMap(p => p.split(/\s+/).filter(w => w.length >= 5));

    // Para tokens all-caps longos, tenta remover sufixos de ruído (FASE1, REV03, etc.)
    const noiseRe = /(?:FASE|REV|OBRA|MANUAL|PREDIO|TORRE|ANDAR|REF|PISO|BLOCO|DEUSO|EOPERAO|OPERAO)\d*[A-Z0-9]*$/;
    const stripped = parts.flatMap(p => {
      if (p === p.toUpperCase() && p.length >= 9) {
        const s = p.replace(noiseRe, '').trim();
        return s.length >= 5 && s !== p ? [s] : [];
      }
      return [];
    });

    const all = [...new Set([...parts, ...camelParts, ...words, ...stripped])].sort((a, b) => b.length - a.length);
    return all.slice(0, 25);
  }

  for (const seed of seedCsvs) {
    const csvPath = resolveCsvPath(IMPORT_DIR, seed.file);
    if (!fs.existsSync(csvPath)) continue;
    let records;
    try { records = parseCsv(csvPath); } catch { continue; }

    for (const row of records) {
      const hexId = toText(row.id_empreendimento);
      if (!hexId || /^\d+$/.test(hexId) || legacyMap.has(hexId)) continue;

      const terms = seed.nameFields.flatMap(f => aggressiveTerms(row[f])).filter(Boolean);
      for (const term of terms) {
        if (nameCache.has(term)) {
          const cached = nameCache.get(term);
          if (cached) { legacyMap.set(hexId, cached); break; }
          continue;
        }
        const { rows } = await pool.query(
          `SELECT id FROM public.empreendimentos WHERE nome_empreendimento ILIKE $1 OR cli_empreendimento ILIKE $1 ORDER BY id DESC LIMIT 1`,
          [`%${term}%`]
        );
        const empId = rows[0]?.id || null;
        nameCache.set(term, empId);
        if (empId) { legacyMap.set(hexId, empId); break; }
      }
    }
  }

  console.log(`🗺️  Legacy ID map: ${legacyMap.size} empreendimentos mapeados por hex-id`);
  return legacyMap;
}

// ─── Insert / findExisting genéricos ─────────────────────────────────────────

function buildRecord(row, idEmp, cfg) {
  const rec = { id_empreendimento: idEmp };
  for (const col of cfg.textCols || []) rec[col] = toText(row[col]);
  for (const col of cfg.dateCols || []) rec[col] = toDate(row[col]);
  for (const col of cfg.numericCols || []) rec[col] = toNumeric(row[col]);
  for (const [col, def] of Object.entries(cfg.jsonbCols || {})) rec[col] = toJson(row[col], def);
  for (const [srcCol, destCol] of Object.entries(cfg.renames || {})) {
    const jsonbDef = (cfg.jsonbCols || {})[destCol];
    rec[destCol] = jsonbDef !== undefined ? toJson(row[srcCol], jsonbDef) : toText(row[srcCol]);
  }
  return rec;
}

async function findExisting(pool, table, uniqueFields, rec) {
  const where = uniqueFields.map((f, i) => `${f} IS NOT DISTINCT FROM $${i + 1}`).join(' AND ');
  const vals = uniqueFields.map(f => rec[f] ?? null);
  const { rows } = await pool.query(`SELECT id FROM public.${table} WHERE ${where} LIMIT 1`, vals);
  return rows[0]?.id || null;
}

async function insertRecord(pool, table, rec) {
  const keys = Object.keys(rec);
  const cols = keys.join(', ');
  const placeholders = keys.map((k, i) => {
    const v = rec[k];
    return (v !== null && typeof v === 'object') ? `$${i + 1}::jsonb` : `$${i + 1}`;
  }).join(', ');
  const params = keys.map(k => {
    const v = rec[k];
    return (v !== null && typeof v === 'object') ? JSON.stringify(v) : v;
  });
  const { rows } = await pool.query(
    `INSERT INTO public.${table}(${cols}) VALUES(${placeholders}) RETURNING id`,
    params
  );
  return rows[0]?.id;
}

async function updateRecord(pool, table, id, rec, updatedAtCol = 'updated_at') {
  const keys = Object.keys(rec).filter(k => k !== 'id_empreendimento');
  if (!keys.length) return;
  const sets = keys.map((k, i) => {
    const v = rec[k];
    return `${k} = ${(v !== null && typeof v === 'object') ? `$${i + 1}::jsonb` : `$${i + 1}`}`;
  }).join(', ');
  const params = keys.map(k => {
    const v = rec[k];
    return (v !== null && typeof v === 'object') ? JSON.stringify(v) : v;
  });
  params.push(id);
  await pool.query(
    `UPDATE public.${table} SET ${sets}, ${updatedAtCol} = now() WHERE id = $${params.length}`,
    params
  );
}

// ─── Função de importação genérica ───────────────────────────────────────────

async function importTable(pool, cfg, legacyMap = new Map()) {
  const csvPath = resolveCsvPath(IMPORT_DIR, cfg.csvFile);
  if (!fs.existsSync(csvPath)) {
    console.log(`⚠️  [${cfg.table}] CSV não encontrado: ${csvPath}`);
    return;
  }

  const records = parseCsv(csvPath);
  console.log(`\n📄 [${cfg.table}] ${records.length} registros em ${cfg.csvFile}`);

  const cache = new Map();
  let inserted = 0, updated = 0, skipped = 0, failures = 0;
  const updatedAtCol = cfg.updatedAtCol || 'updated_at';

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    try {
      const idEmp = await resolveEmpId(pool, row, cfg.candidates, cache, legacyMap);
      if (!idEmp) {
        skipped++;
        const hint = (cfg.candidates || []).map(f => `${f}="${toText(row[f]) || ''}"`).join(', ');
        const hexHint = toText(row.id_empreendimento) || '';
        console.log(`  ⚠️  Linha ${i + 2}: empreendimento não resolvido (hex=${hexHint}${hint ? ', ' + hint : ''})`);
        continue;
      }

      const rec = buildRecord(row, idEmp, cfg);
      const existingId = await findExisting(pool, cfg.table, cfg.uniqueOn || ['id_empreendimento', 'nome_arquivo'], rec);

      if (existingId) {
        await updateRecord(pool, cfg.table, existingId, rec, updatedAtCol);
        updated++;
      } else {
        await insertRecord(pool, cfg.table, rec);
        inserted++;
      }
    } catch (err) {
      failures++;
      console.log(`  ❌ Linha ${i + 2}: ${err.message}`);
    }
  }

  console.log(`  ✅ Inseridos: ${inserted}  🔄 Atualizados: ${updated}  ⚠️ Sem emp.: ${skipped}  ❌ Falhas: ${failures}`);
}

// ─── Importação especial: formularios_vistoria (sem id_empreendimento) ────────

async function importFormulariosVistoria(pool, csvFile) {
  const csvPath = resolveCsvPath(IMPORT_DIR, csvFile);
  if (!fs.existsSync(csvPath)) {
    console.log(`⚠️  [formularios_vistoria] CSV não encontrado: ${csvPath}`);
    return;
  }

  const records = parseCsv(csvPath);
  console.log(`\n📄 [formularios_vistoria] ${records.length} registros em ${csvFile}`);

  let inserted = 0, updated = 0, failures = 0;

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    try {
      const rec = {
        nome_formulario: toText(row.nome_formulario),
        descricao_formulario: toText(row.descricao_formulario),
        status_formulario: toText(row.status_formulario) || 'Ativo',
        secoes: toJson(row.secoes, []),
      };

      if (!rec.nome_formulario) { failures++; continue; }

      const { rows: existing } = await pool.query(
        `SELECT id FROM public.formularios_vistoria WHERE nome_formulario IS NOT DISTINCT FROM $1 LIMIT 1`,
        [rec.nome_formulario]
      );

      if (existing.length > 0) {
        const keys = Object.keys(rec);
        const sets = keys.map((k, idx) => {
          const v = rec[k];
          return `${k} = ${(v !== null && typeof v === 'object') ? `$${idx + 1}::jsonb` : `$${idx + 1}`}`;
        }).join(', ');
        const params = [
          ...keys.map(k => { const v = rec[k]; return (v !== null && typeof v === 'object') ? JSON.stringify(v) : v; }),
          existing[0].id,
        ];
        await pool.query(`UPDATE public.formularios_vistoria SET ${sets}, updated_at = now() WHERE id = $${params.length}`, params);
        updated++;
      } else {
        const keys = Object.keys(rec);
        const cols = keys.join(', ');
        const placeholders = keys.map((k, idx) => {
          const v = rec[k];
          return (v !== null && typeof v === 'object') ? `$${idx + 1}::jsonb` : `$${idx + 1}`;
        }).join(', ');
        const params = keys.map(k => { const v = rec[k]; return (v !== null && typeof v === 'object') ? JSON.stringify(v) : v; });
        await pool.query(`INSERT INTO public.formularios_vistoria(${cols}) VALUES(${placeholders})`, params);
        inserted++;
      }
    } catch (err) {
      failures++;
      console.log(`  ❌ Linha ${i + 2}: ${err.message}`);
    }
  }

  console.log(`  ✅ Inseridos: ${inserted}  🔄 Atualizados: ${updated}  ❌ Falhas: ${failures}`);
}

// ─── Configurações de tabelas ─────────────────────────────────────────────────

const TABLES = {

  rdos: {
    csvFile: 'RDO.csv',
    table: 'rdos',
    candidates: ['obra_nome', 'obra_local', 'contratada'],
    uniqueOn: ['id_empreendimento', 'numero_relatorio', 'data_relatorio'],
    textCols: ['tipo_documento', 'numero_relatorio', 'dia_semana', 'obra_nome', 'obra_local',
      'contratada', 'responsavel', 'contrato', 'prazo_contratual', 'prazo_decorrido',
      'prazo_vencer', 'observacoes', 'status_documento'],
    dateCols: ['data_relatorio'],
    jsonbCols: {
      condicao_climatica: {},
      equipes_campo: {},
      atividades_realizadas: [],
      ocorrencias: [],
      documentos: [],
      fotos: [],
      assinaturas: [],
    },
  },

  lista_documentos_report: {
    csvFile: 'ListaDocumentosReport.csv',
    table: 'lista_documentos_report',
    candidates: ['cliente', 'empreendimento', 'titulo'],
    uniqueOn: ['id_empreendimento', 'numero_documento', 'revisao'],
    textCols: ['cliente', 'empreendimento', 'titulo', 'numero_documento', 'revisao',
      'observacoes_gerais', 'status_documento'],
    dateCols: ['data_aviso'],
    jsonbCols: { documentos: [], assinaturas: [] },
  },

  nao_conformidades: {
    csvFile: 'NaoConformidade.csv',
    table: 'nao_conformidades',
    candidates: ['cliente', 'nome_arquivo'],
    uniqueOn: ['id_empreendimento', 'nome_arquivo'],
    textCols: ['titulo_capa', 'subtitulo_capa', 'texto_rodape_capa', 'titulo_relatorio',
      'subtitulo_relatorio', 'cliente', 'revisao', 'eng_obra', 'nome_arquivo'],
    dateCols: ['data_vistoria'],
    jsonbCols: { secoes: [], assinaturas: [] },
  },

  relatorios_analise_tecnica: {
    csvFile: 'RelatorioAnaliseTecnica.csv',
    table: 'relatorios_analise_tecnica',
    candidates: ['consultor_responsavel', 'nome_arquivo'],
    uniqueOn: ['id_empreendimento', 'nome_arquivo', 'numero_os'],
    textCols: ['numero_os', 'metragem', 'edificio_pavimento', 'nome_arquivo', 'fase_emissao',
      'nota_geral', 'titulo_capa', 'subtitulo_capa', 'texto_rodape_capa', 'status_relatorio',
      'consultor_responsavel'],
    dateCols: ['data_emissao'],
    jsonbCols: {
      revisoes: [],
      lista_arquivos: [],
      projetos: [],
      instalacoes_eletricas: {},
      instalacoes_hidraulicas: {},
      projeto_legal_bombeiro: {},
      instalacoes_hvac: {},
      conclusao: {},
    },
  },

  relatorios_primeiros_servicos: {
    csvFile: 'RelatorioPrimeirosServicos.csv',
    table: 'relatorios_primeiros_servicos',
    candidates: ['cliente', 'obra', 'local'],
    uniqueOn: ['id_empreendimento', 'cliente', 'disciplina', 'data_relatorio'],
    textCols: ['cliente', 'local', 'solicitante', 'obra', 'disciplina', 'assunto_relatorio',
      'descricao_relatorio', 'status', 'comentarios_status'],
    dateCols: ['data_relatorio'],
    jsonbCols: { fotos: [], aprovacoes: [] },
  },

  relatorios_semanais: {
    csvFile: 'RelatorioSemanal.csv',
    table: 'relatorios_semanais',
    candidates: ['nome_arquivo'],
    uniqueOn: ['id_empreendimento', 'nome_arquivo', 'data_inicio_semana'],
    textCols: ['numero_relatorio', 'nome_arquivo'],
    numericCols: ['fisico_real_total'],
    dateCols: ['data_inicio_semana', 'data_fim_semana'],
    jsonbCols: {
      efetivo: {},
      avanco_fisico_acumulado: [],
      avanco_financeiro_acumulado: [],
      principais_atividades_semana: [],
      atividades_proxima_semana_tabela: [],
      caminho_critico: [],
      impedimentos: [],
      fotos: [],
      vistos: [],
    },
  },

  vistorias_tecnicas: {
    csvFile: 'VistoriaTecnica.csv',
    table: 'vistorias_tecnicas',
    candidates: ['cliente', 'titulo_vistoria', 'nome_arquivo'],
    uniqueOn: ['id_empreendimento', 'nome_arquivo'],
    textCols: ['titulo_capa', 'subtitulo_capa', 'texto_rodape_capa', 'titulo_vistoria',
      'descricao_vistoria', 'titulo_relatorio', 'subtitulo_relatorio', 'cliente', 'endereco',
      'revisao', 'eng_responsavel', 'nome_arquivo', 'foto_localizacao', 'objetivo',
      'instalacoes_geral', 'comentarios_documentacao', 'conclusao_final', 'conclusao'],
    dateCols: ['data_vistoria'],
    jsonbCols: {
      lista_documentos: [],
      normas_tecnicas: [],
      itens_documentacao: [],
      locais: [],
      quadros_gerais: [],
      elevadores_monta_carga: [],
      assinaturas: [],
      layout_proposto_imagens: [],
    },
    renames: { fotos_layout_proposto: 'layout_proposto_imagens' },
  },

  vistorias_terminalidade: {
    csvFile: 'VistoriaTerminalidade.csv',
    table: 'vistorias_terminalidade',
    candidates: ['cliente', 'nome_arquivo'],
    uniqueOn: ['id_empreendimento', 'cliente', 'data_vistoria', 'revisao'],
    textCols: ['titulo_relatorio', 'subtitulo_relatorio', 'cliente', 'revisao', 'eng_obra'],
    dateCols: ['data_vistoria'],
    jsonbCols: { secoes: [], assinaturas: [] },
  },

  inspecoes_alarme_incendio: {
    csvFile: 'InspecaoAlarmeIncendio.csv',
    table: 'inspecoes_alarme_incendio',
    candidates: ['cliente', 'nome_arquivo'],
    uniqueOn: ['id_empreendimento', 'nome_arquivo'],
    textCols: ['titulo_relatorio', 'subtitulo_relatorio', 'cliente', 'revisao',
      'eng_responsavel', 'nome_arquivo', 'observacoes_gerais'],
    dateCols: ['data_inspecao'],
    jsonbCols: { itens_documentacao: [], locais: [], assinaturas: [] },
  },

  inspecoes_ar_condicionado: {
    csvFile: 'InspecaoArCondicionado.csv',
    table: 'inspecoes_ar_condicionado',
    candidates: ['cliente', 'nome_arquivo'],
    uniqueOn: ['id_empreendimento', 'nome_arquivo'],
    textCols: ['projeto', 'titulo_secao_inspecao', 'titulo_relatorio', 'subtitulo_relatorio',
      'cliente', 'revisao', 'eng_responsavel', 'nome_arquivo', 'comentarios_documentacao',
      'observacoes_gerais', 'conclusao_r01', 'conclusao_r02'],
    dateCols: ['data_inspecao', 'data_projeto'],
    jsonbCols: {
      evaporadoras: [],
      condensadoras: [],
      itens_documentacao: [],
      inspecao_evaporadora: [],
      inspecao_valvulas: [],
      inspecao_condensadora: [],
      inspecao_eletrica: [],
      inspecao_sensores: [],
      locais: [],
      assinaturas: [],
    },
  },

  inspecoes_cftv: {
    csvFile: 'InspecaoCFTV.csv',
    table: 'inspecoes_cftv',
    candidates: ['cliente', 'nome_arquivo'],
    uniqueOn: ['id_empreendimento', 'nome_arquivo'],
    textCols: ['titulo_relatorio', 'subtitulo_relatorio', 'cliente', 'revisao',
      'eng_responsavel', 'nome_arquivo', 'observacoes_gerais'],
    dateCols: ['data_inspecao'],
    jsonbCols: { itens_documentacao: [], info_sistema: [], info_cameras: [], pavimentos: [], assinaturas: [] },
  },

  inspecoes_controle_acesso: {
    csvFile: 'InspecaoControleAcesso.csv',
    table: 'inspecoes_controle_acesso',
    candidates: ['cliente'],
    uniqueOn: ['id_empreendimento', 'cliente', 'data_inspecao'],
    textCols: ['projeto', 'titulo_secao_inspecao', 'label_local', 'titulo_relatorio',
      'subtitulo_relatorio', 'cliente', 'revisao', 'eng_responsavel', 'observacoes_gerais'],
    dateCols: ['data_inspecao', 'data_projeto'],
    jsonbCols: {
      equipamentos: [],
      info_sistema: [],
      info_sistema_labels: [],
      itens_documentacao: [],
      locais: [],
      assinaturas: [],
    },
  },

  inspecoes_gas: {
    csvFile: 'InspecaoGas.csv',
    table: 'inspecoes_gas',
    candidates: ['cliente', 'nome_arquivo'],
    uniqueOn: ['id_empreendimento', 'nome_arquivo'],
    textCols: ['titulo_capa', 'subtitulo_capa', 'texto_rodape_capa', 'titulo_relatorio',
      'subtitulo_relatorio', 'cliente', 'revisao', 'eng_responsavel', 'nome_arquivo',
      'comentarios_documentacao', 'observacoes_gerais', 'conclusao_r01', 'conclusao_r02'],
    dateCols: ['data_inspecao'],
    jsonbCols: { itens_documentacao: [], locais: [], assinaturas: [] },
  },

  inspecoes_hidrantes: {
    csvFile: 'InspecaoHidrantes.csv',
    table: 'inspecoes_hidrantes',
    candidates: ['cliente', 'nome_arquivo'],
    uniqueOn: ['id_empreendimento', 'nome_arquivo'],
    textCols: ['titulo_relatorio', 'subtitulo_relatorio', 'cliente', 'revisao',
      'eng_responsavel', 'nome_arquivo', 'comentarios_documentacao', 'observacoes_gerais'],
    dateCols: ['data_inspecao'],
    jsonbCols: { itens_documentacao: [], locais: [], assinaturas: [] },
  },

  inspecoes_sprinklers: {
    csvFile: 'InspecaoSprinklers.csv',
    table: 'inspecoes_sprinklers',
    candidates: ['cliente', 'nome_arquivo'],
    uniqueOn: ['id_empreendimento', 'nome_arquivo'],
    textCols: ['titulo_relatorio', 'subtitulo_relatorio', 'cliente', 'revisao',
      'eng_responsavel', 'nome_arquivo', 'observacoes_gerais'],
    dateCols: ['data_inspecao'],
    jsonbCols: { itens_documentacao: [], locais: [], assinaturas: [] },
  },

  // ── Novas tabelas adicionadas ─────────────────────────────────────────────

  projetos_originais: {
    csvFile: 'ProjetoOriginal.csv',
    table: 'projetos_originais',
    candidates: [],
    uniqueOn: ['id_empreendimento', 'nome_projeto', 'disciplina_projeto'],
    textCols: ['nome_projeto', 'disciplina_projeto', 'arquivo_projeto', 'descricao_projeto'],
  },

  manuais_gerais: {
    csvFile: 'ManualGeral.csv',
    table: 'manuais_gerais',
    candidates: [],
    uniqueOn: ['id_empreendimento', 'nome_manual'],
    textCols: ['arquivo_manual', 'nome_manual', 'tipo_manual', 'descricao_manual'],
  },

  diarios_obra: {
    csvFile: 'DiarioDeObra.csv',
    table: 'diarios_obra',
    candidates: [],
    uniqueOn: ['id_empreendimento', 'nome_arquivo', 'data_diario'],
    textCols: ['unidade_texto', 'nome_arquivo', 'numero_diario', 'condicao_climatica', 'periodo_trabalhado', 'principais_atividades', 'ocorrencias_observacoes'],
    numericCols: ['horas_paralisadas'],
    dateCols: ['data_diario'],
    jsonbCols: { efetivo: {}, fotos: [], vistos: [] },
  },

  termos_aceite: {
    csvFile: 'TermoDeAceite.csv',
    table: 'termos_aceite',
    candidates: [],
    uniqueOn: ['id_empreendimento', 'nome_arquivo'],
    textCols: ['id_formulario', 'nome_termo', 'nome_arquivo', 'consultor_responsavel',
      'texto_os_proposta', 'texto_escopo_consultoria', 'revisao', 'status_termo', 'participantes'],
    dateCols: ['data_termo', 'data_relatorio'],
    jsonbCols: { estrutura_formulario: [], respostas: {}, fotos_secoes: [], observacoes_secoes: {}, assinaturas: [] },
    updatedAtCol: 'updated_date',
  },

  // ── Tabelas com scripts individuais já existentes (incluídas aqui também) ──

  atas_reuniao: {
    csvFile: 'AtaReuniao.csv',
    table: 'atas_reuniao',
    candidates: ['locatario', 'edificio', 'nome_arquivo'],
    uniqueOn: ['id_empreendimento', 'nome_arquivo', 'data_reuniao'],
    textCols: ['titulo_reuniao', 'subtitulo_reuniao', 'hora_inicio', 'hora_termino',
      'local_reuniao', 'tipo_reuniao', 'edificio', 'nome_arquivo', 'locatario',
      'titulo_capa', 'subtitulo_capa', 'texto_rodape_capa', 'observacoes',
      'arquivo_ata', 'responsavel_reuniao', 'status'],
    dateCols: ['data_reuniao'],
    jsonbCols: { participantes: [], informacoes_obra: {}, itens_discutidos: [], assinaturas: [] },
  },

  inspecoes_eletrica: {
    csvFile: 'InspecaoEletrica.csv',
    table: 'inspecoes_eletrica',
    candidates: ['cliente', 'nome_arquivo'],
    uniqueOn: ['id_empreendimento', 'nome_arquivo'],
    textCols: ['titulo_capa', 'subtitulo_capa', 'texto_rodape_capa', 'titulo_inspecao',
      'descricao_inspecao', 'titulo_relatorio', 'subtitulo_relatorio', 'cliente', 'revisao',
      'eng_responsavel', 'nome_arquivo', 'titulo_secao_inspecao', 'label_local',
      'comentarios_documentacao', 'observacoes_gerais', 'conclusao', 'conclusao_r01', 'conclusao_r02'],
    dateCols: ['data_inspecao'],
    jsonbCols: { itens_documentacao: [], locais: [], distribuicao_eletrica: [], assinaturas: [] },
  },

  inspecoes_hidraulica: {
    csvFile: 'InspecaoHidraulica.csv',
    table: 'inspecoes_hidraulica',
    candidates: ['cliente', 'nome_arquivo'],
    uniqueOn: ['id_empreendimento', 'nome_arquivo'],
    textCols: ['titulo_capa', 'subtitulo_capa', 'texto_rodape_capa', 'titulo_relatorio',
      'subtitulo_relatorio', 'cliente', 'revisao', 'eng_responsavel', 'nome_arquivo',
      'comentarios_documentacao', 'observacoes_gerais', 'conclusao_r01', 'conclusao_r02'],
    dateCols: ['data_inspecao'],
    jsonbCols: { itens_documentacao: [], locais: [], assinaturas: [] },
  },

  inspecoes_sdai: {
    csvFile: 'InspecaoSDAI.csv',
    table: 'inspecoes_sdai',
    candidates: ['cliente', 'nome_arquivo'],
    uniqueOn: ['id_empreendimento', 'nome_arquivo'],
    textCols: ['titulo_relatorio', 'subtitulo_relatorio', 'cliente', 'revisao',
      'eng_responsavel', 'nome_arquivo', 'comentarios_instalacao', 'observacoes_gerais'],
    dateCols: ['data_inspecao'],
    jsonbCols: {
      itens_documentacao: [],
      instalacoes: [],
      centrais: [],
      itens_instalacao: [],
      ordem_secoes: [],
      assinaturas: [],
    },
  },
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const SPECIAL_TABLES = {
  formularios_vistoria: 'FormularioVistoria.csv',
};

async function main() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));

  const allNames = [...Object.keys(TABLES), ...Object.keys(SPECIAL_TABLES)];

  let tableNames;
  if (args.length === 0) {
    tableNames = allNames;
  } else {
    tableNames = args.filter(a => allNames.includes(a));
    const unknown = args.filter(a => !allNames.includes(a));
    if (unknown.length) {
      console.warn(`⚠️  Tabelas desconhecidas ignoradas: ${unknown.join(', ')}`);
      console.warn(`   Tabelas disponíveis: ${allNames.join(', ')}`);
    }
    if (!tableNames.length) {
      console.error('Nenhuma tabela válida especificada. Saindo.');
      process.exit(1);
    }
  }

  console.log(`\n🚀 Importando ${tableNames.length} tabela(s): ${tableNames.join(', ')}`);

  const pool = await connectDb();
  const legacyMap = await buildLegacyIdMap(pool);

  for (const name of tableNames) {
    if (SPECIAL_TABLES[name]) {
      await importFormulariosVistoria(pool, SPECIAL_TABLES[name]);
    } else {
      await importTable(pool, TABLES[name], legacyMap);
    }
  }

  await pool.end();
  console.log('\n✅ Importação concluída!');
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
