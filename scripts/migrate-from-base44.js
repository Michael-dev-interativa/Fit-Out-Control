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
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1
    `, [tableName]);

    const columns = result.rows.map(row => row.column_name);
    tableColumnsCache[tableName] = columns;
    return columns;
  } catch (error) {
    console.error(`   ⚠️  Erro ao obter colunas de ${tableName}:`, error.message);
    return [];
  }
}

function mapBase44ToPostgres(entityName, base44Data, validColumns = null) {
  const mapped = { ...base44Data };

  // Remove campos de sistema do Base44
  delete mapped._id;
  delete mapped.__v;
  delete mapped.createdBy;
  delete mapped.updatedBy;

  // Renomeia campos de timestamp
  if (mapped.created) {
    mapped.created_at = mapped.created;
    delete mapped.created;
  }

  if (mapped.updated) {
    mapped.updated_at = mapped.updated;
    delete mapped.updated;
  }

  // Remove campos que não existem no PostgreSQL
  if (validColumns) {
    const invalidFields = Object.keys(mapped).filter(key => !validColumns.includes(key));
    if (invalidFields.length > 0) {
      invalidFields.forEach(field => delete mapped[field]);
    }
  }

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

    for (const record of records) {
      try {
        const mapped = mapBase44ToPostgres(entityName, record, validColumns);

        // Mostra campos ignorados apenas no primeiro registro
        if (firstRecord) {
          const allFields = Object.keys(record);
          const keptFields = Object.keys(mapped);
          const ignoredFields = allFields.filter(f => !keptFields.includes(f) && f !== '_id' && f !== '__v');

          if (ignoredFields.length > 0) {
            console.log(`   ℹ️  Campos ignorados: ${ignoredFields.join(', ')}`);
          }
          firstRecord = false;
        }

        const fields = Object.keys(mapped);
        const values = Object.values(mapped);

        if (fields.length === 0) {
          console.error(`   ⚠️  Nenhum campo válido encontrado no registro`);
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
        console.error(`   ⚠️  Erro ao importar registro:`, error.message);
        errors++;
      }
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
    console.log(`\n✅ Total de registros importados: ${totalMigrated}`);

    // Fecha conexão
    await renderPool.end();
    rl.close();

    console.log('\n🎉 Importação concluída!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  }
}

main();
