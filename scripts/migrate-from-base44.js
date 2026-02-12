import pg from 'pg';
import dotenv from 'dotenv';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

dotenv.config();

const { Pool } = pg;

// Interface para input do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Mapeamento de entidades Base44 → Tabelas PostgreSQL
const ENTITY_TABLE_MAP = {
  'Empreendimentos': 'empreendimentos',
  'Unidades': 'unidades_empreendimento',
  'Usuarios': 'usuarios',
  'RegistrosUnidade': 'registros_unidade',
  'RegistrosGerais': 'registros_gerais',
  'DisciplinasGerais': 'disciplinas_gerais',
  'FormulariosVistoria': 'formularios_vistoria',
  'Vistorias': 'vistorias',
  'RelatoriosSemanais': 'relatorios_semanais',
  'AprovacaoAmostra': 'aprovacoes_amostra'
};

async function loadBase44Export() {
  console.log('\n📊 MIGRAÇÃO DE DADOS - Base44 → Render PostgreSQL\n');
  console.log('Este script importa dados exportados do Base44 (formato CSV).\n');

  const exportPath = await question('📁 Cole o caminho da pasta com os arquivos CSV exportados do Base44:\n(exemplo: C:\\exports\\base44)\n> ');

  const normalizedPath = exportPath.trim().replace(/['"]/g, '');

  if (!fs.existsSync(normalizedPath)) {
    console.error('❌ Pasta não encontrada:', normalizedPath);
    process.exit(1);
  }

  console.log('✅ Pasta encontrada!\n');
  return normalizedPath;
}

async function connectToRender() {
  const renderUrl = process.env.DATABASE_URL;

  if (!renderUrl) {
    console.error('❌ DATABASE_URL não configurada!');
    console.log('Configure a variável DATABASE_URL no arquivo .env');
    console.log('\n💡 Exemplo:');
    console.log('DATABASE_URL=postgresql://user:password@host:5432/database\n');
    process.exit(1);
  }

  // Mostra informações da conexão (sem mostrar senha)
  const urlParts = renderUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^\/]+)\/(.+)/);
  if (urlParts) {
    console.log(`📡 Conectando em: ${urlParts[3]} (usuário: ${urlParts[1]})`);
  }

  // Tenta conectar sem SSL primeiro
  try {
    console.log('🔌 Tentando conectar sem SSL...');
    const renderPool = new Pool({
      connectionString: renderUrl,
      ssl: false
    });

    await renderPool.query('SELECT 1');
    console.log('✅ Conectado ao PostgreSQL (sem SSL)!\n');
    return renderPool;
  } catch (errorNoSSL) {
    console.log('⚠️  Falhou sem SSL, tentando com SSL...');

    // Se falhar, tenta com SSL
    try {
      const renderPool = new Pool({
        connectionString: renderUrl,
        ssl: { rejectUnauthorized: false }
      });

      await renderPool.query('SELECT 1');
      console.log('✅ Conectado ao PostgreSQL (com SSL)!\n');
      return renderPool;
    } catch (errorSSL) {
      console.error('❌ Erro ao conectar no banco de dados:', errorSSL.message);
      console.error('\n💡 Verifique:');
      console.error('   1. DATABASE_URL está correta no .env');
      console.error('   2. Banco de dados está ativo');
      console.error('   3. Credenciais estão corretas');
      console.error('   4. Firewall/rede permite a conexão');
      process.exit(1);
    }
  }
}

async function loadCSVFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true
    });
    return records;
  } catch (error) {
    console.error(`   ⚠️  Erro ao ler ${filePath}:`, error.message);
    return null;
  }
}

// Cache de colunas válidas por tabela
const tableColumnsCache = {};

async function getTableColumns(pool, tableName) {
  if (tableColumnsCache[tableName]) {
    return tableColumnsCache[tableName];
  }

  try {
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    const columns = result.rows.map(row => ({
      name: row.column_name,
      type: row.data_type
    }));
    tableColumnsCache[tableName] = columns;
    return columns;
  } catch (error) {
    console.error(`   ⚠️  Erro ao obter colunas de ${tableName}:`, error.message);
    return [];
  }
}

function isValidForDataType(value, dataType) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const strValue = String(value).trim();

  // Valores inválidos genéricos
  if (strValue === '' ||
    strValue.toLowerCase() === 'null' ||
    strValue.toLowerCase() === 'n/a' ||
    strValue.toLowerCase() === 'none') {
    return null;
  }

  // INTEGER e BIGINT
  if (dataType === 'integer' || dataType === 'bigint') {
    // Detecta ObjectIds do MongoDB (hexadecimal de 24 caracteres)
    if (/^[0-9a-f]{24}$/i.test(strValue)) {
      return null;
    }

    // Detecta números decimais para campos INTEGER
    if (strValue.includes('.') || strValue.includes(',')) {
      return null;
    }

    // Tenta converter para número
    const num = Number(strValue);
    if (isNaN(num)) {
      return null;
    }

    return Math.floor(num); // Garante INTEGER
  }

  // JSON e JSONB
  if (dataType === 'json' || dataType === 'jsonb') {
    if (typeof strValue === 'string' && (strValue.startsWith('{') || strValue.startsWith('['))) {
      try {
        JSON.parse(strValue);
        return strValue;
      } catch {
        return null;
      }
    }
    return null;
  }

  // DATE e TIMESTAMP
  if (dataType.includes('date') || dataType.includes('timestamp')) {
    const date = new Date(strValue);
    if (isNaN(date.getTime())) {
      return null;
    }
    return strValue;
  }

  // BOOLEAN
  if (dataType === 'boolean') {
    const lower = strValue.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 't') return true;
    if (lower === 'false' || lower === '0' || lower === 'f') return false;
    return null;
  }

  // TEXT, VARCHAR, etc - aceita qualquer coisa
  return strValue;
}

function mapBase44ToPostgres(entityName, base44Data, validColumns = null) {
  const mapped = { ...base44Data };

  // Remove campos de sistema do Base44 e MongoDB
  delete mapped._id;
  delete mapped.__v;
  delete mapped.createdBy;
  delete mapped.updatedBy;
  delete mapped.id; // ID do MongoDB (ObjectId como string)

  // Renomeia campos de timestamp
  if (mapped.created) {
    mapped.created_at = mapped.created;
    delete mapped.created;
  }

  if (mapped.updated) {
    mapped.updated_at = mapped.updated;
    delete mapped.updated;
  }

  // Cria mapa de colunas para lookup rápido
  const columnMap = validColumns ?
    new Map(validColumns.map(col => [col.name, col.type])) :
    null;

  // Remove campos que não existem no PostgreSQL
  if (validColumns) {
    const columnNames = validColumns.map(c => c.name);
    const invalidFields = Object.keys(mapped).filter(key => !columnNames.includes(key));
    if (invalidFields.length > 0) {
      invalidFields.forEach(field => delete mapped[field]);
    }
  }

  // Valida e converte valores baseado no tipo de dados
  Object.keys(mapped).forEach(key => {
    const value = mapped[key];
    const dataType = columnMap ? columnMap.get(key) : null;

    if (dataType) {
      // Usa validação específica por tipo
      const validatedValue = isValidForDataType(value, dataType);
      mapped[key] = validatedValue;
    } else {
      // Fallback: converte strings vazias para NULL
      if (value === '' || value === null || value === undefined) {
        mapped[key] = null;
      }
      // Trata campos JSON que vêm como strings inválidas
      else if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
        try {
          JSON.parse(value);
          // Se válido, mantém como string
        } catch {
          mapped[key] = null;
        }
      }
    }
  });

  // === MAPEAMENTOS ESPECÍFICOS ===
  if (entityName === 'Empreendimentos') {
    // Remove campos extras do Base44 que não existem no PostgreSQL
    delete mapped.quantidade_conjuntos;
  }

  return mapped;
}

async function importEntity(renderPool, entityName, tableName, exportPath) {
  try {
    console.log(`\n📦 Importando: ${entityName} → ${tableName}`);

    // Procura arquivo CSV
    const possibleFiles = [
      path.join(exportPath, `${entityName}.csv`),
      path.join(exportPath, `${tableName}.csv`),
      path.join(exportPath, `${entityName.toLowerCase()}.csv`)
    ];

    let csvData = null;
    let usedFile = null;

    for (const file of possibleFiles) {
      if (fs.existsSync(file)) {
        csvData = await loadCSVFile(file);
        usedFile = file;
        break;
      }
    }

    if (!csvData) {
      console.log(`   ⚠️  Arquivo não encontrado - pulando`);
      return { entity: entityName, migrated: 0, skipped: true };
    }

    const records = Array.isArray(csvData) ? csvData : [csvData];
    console.log(`   📊 ${records.length} registros encontrados em ${path.basename(usedFile)}`);

    if (records.length === 0) {
      console.log(`   ✅ Nenhum dado para importar`);
      return { entity: entityName, migrated: 0, skipped: false };
    }

    console.log(`   ⏳ Importando...`);

    // Obtém colunas válidas da tabela
    const validColumns = await getTableColumns(renderPool, tableName);
    console.log(`   ℹ️  Colunas disponíveis: ${validColumns.length}`);

    // Importa registros
    let migrated = 0;
    let errors = 0;
    let firstRecord = true;
    const errorTypes = new Map(); // Agrupa erros por tipo {message: {count, samples: []}}

    for (const record of records) {
      try {
        const mapped = mapBase44ToPostgres(entityName, record, validColumns);

        // Mostra campos ignorados apenas no primeiro registro
        if (firstRecord) {
          const allFields = Object.keys(record);
          const keptFields = Object.keys(mapped);
          const columnNames = validColumns.map(c => c.name);
          const ignoredFields = allFields.filter(f => !columnNames.includes(f) && f !== '_id' && f !== '__v' && f !== 'id');

          if (ignoredFields.length > 0) {
            console.log(`   ℹ️  Campos ignorados: ${ignoredFields.join(', ')}`);
          }
          firstRecord = false;
        }

        const fields = Object.keys(mapped);
        const values = Object.values(mapped);

        if (fields.length === 0) {
          const errorMsg = 'Nenhum campo válido encontrado';
          if (!errorTypes.has(errorMsg)) {
            errorTypes.set(errorMsg, { count: 0, samples: [] });
          }
          errorTypes.get(errorMsg).count++;
          errors++;
          continue;
        }

        const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

        const sql = `
          INSERT INTO ${tableName} (${fields.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT DO NOTHING
        `;

        await renderPool.query(sql, values);
        migrated++;
      } catch (error) {
        // Agrupa erros por tipo com samples
        const errorKey = error.message.split(':')[0]; // Pega só o tipo do erro

        if (!errorTypes.has(errorKey)) {
          errorTypes.set(errorKey, { count: 0, samples: [] });
        }

        const errorInfo = errorTypes.get(errorKey);
        errorInfo.count++;

        // Coleta até 3 samples por tipo de erro
        if (errorInfo.samples.length < 3) {
          errorInfo.samples.push(error.message);
        }

        errors++;
      }
    }

    // Mostra resumo de erros por tipo
    if (errorTypes.size > 0) {
      console.log(`\n   📋 Resumo de erros:`);
      errorTypes.forEach((info, errorType) => {
        console.log(`      • ${errorType}: ${info.count}x`);
        if (info.samples.length > 0) {
          info.samples.forEach((sample, idx) => {
            console.log(`         ${idx + 1}. ${sample.substring(0, 100)}`);
          });
        }
      });
    }

    if (errors > 0) {
      console.log(`   ⚠️  ${migrated} registros importados, ${errors} erros`);
    } else {
      console.log(`   ✅ ${migrated} registros importados`);
    }
    return { entity: entityName, migrated, skipped: false, errors };

  } catch (error) {
    console.error(`   ❌ Erro em ${entityName}:`, error.message);
    return { entity: entityName, migrated: 0, error: error.message };
  }
}

async function main() {
  try {
    // Carrega export do Base44
    const exportPath = await loadBase44Export();
    const renderPool = await connectToRender();

    console.log('🚀 Iniciando importação automática...\n');

    // Importa cada entidade
    const results = [];
    for (const [entityName, tableName] of Object.entries(ENTITY_TABLE_MAP)) {
      const result = await importEntity(renderPool, entityName, tableName, exportPath);
      results.push(result);
    }

    // Resumo
    console.log('\n\n📊 RESUMO DA IMPORTAÇÃO:\n');
    console.log('┌─────────────────────────────────┬────────────┬──────────────┐');
    console.log('│ Entidade                        │ Importados │ Status       │');
    console.log('├─────────────────────────────────┼────────────┼──────────────┤');

    for (const result of results) {
      let status = '✅ OK';
      if (result.error) {
        status = '❌ Erro';
      } else if (result.skipped) {
        status = '⏭️  Pulado';
      } else if (result.errors && result.errors > 0) {
        status = `⚠️  ${result.errors} erros`;
      }

      const name = result.entity.padEnd(30);
      const count = String(result.migrated).padStart(9);
      const statusPadded = status.padEnd(12);
      console.log(`│ ${name} │ ${count} │ ${statusPadded} │`);
    }

    console.log('└─────────────────────────────────┴────────────┴──────────────┘');

    const totalMigrated = results.reduce((sum, r) => sum + (r.migrated || 0), 0);
    console.log(`\n✅ Total de registros importados: ${totalMigrated}`);

    // Mostra total de erros se houver
    const totalErrors = results.reduce((sum, r) => sum + (r.errors || 0), 0);
    if (totalErrors > 0) {
      console.log(`⚠️  Total de erros: ${totalErrors}`);
    }

    // Fecha conexão
    await renderPool.end();
    rl.close();

    console.log('\n🎉 Importação concluída!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erro fatal:', error);
    rl.close();
    process.exit(1);
  }
}

main();
