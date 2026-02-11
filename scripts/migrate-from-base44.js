import pg from 'pg';
import dotenv from 'dotenv';
import readline from 'readline';
import fs from 'fs';
import path from 'path';

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
  console.log('Este script importa dados exportados do Base44 (formato JSON).\n');

  const exportPath = await question('📁 Cole o caminho da pasta com os arquivos JSON exportados do Base44:\n(exemplo: C:\\exports\\base44)\n> ');

  const normalizedPath = exportPath.trim().replace(/['"]/g, '');

  if (!fs.existsSync(normalizedPath)) {
    console.error('❌ Pasta não encontrada:', normalizedPath);
    process.exit(1);
  }

  console.log('✅ Pasta encontrada!\n');
  return normalizedPath;
  const renderUrl = process.env.DATABASE_URL;

  if (!renderUrl) {
    console.error('❌ DATABASE_URL não configurada!');
    console.log('Configure a variável DATABASE_URL no arquivo .env');
    process.exit(1);
  }

  try {
    const renderPool = new Pool({
      connectionString: renderUrl,
      ssl: { rejectUnauthorized: false }
    });

    await renderPool.query('SELECT 1');
    console.log('✅ Conectado ao Render PostgreSQL!\n');
    return renderPool;
  } catch (error) {
    console.error('❌ Erro ao conectar no Render:', error.message);
    process.exit(1);
  }
}

async function loadJSONFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`   ⚠️  Erro ao ler ${filePath}:`, error.message);
    return null;
  }
}

function mapBase44ToPostgres(entityName, base44Data) {
  // Mapeia campos do Base44 para PostgreSQL
  // Ajuste conforme sua estrutura real

  const mapped = { ...base44Data };

  // Remove campos de sistema do Base44
  delete mapped._id;
  delete mapped.__v;
  delete mapped.createdBy;
  delete mapped.updatedBy;

  // Renomeia campos se necessário
  if (mapped.created) {
    mapped.created_at = mapped.created;
    delete mapped.created;
  }

  if (mapped.updated) {
    mapped.updated_at = mapped.updated;
    delete mapped.updated;
  }

  // === MAPEAMENTO ESPECÍFICO POR ENTIDADE ===
  // Descomente e adapte conforme necessário

  /*
  if (entityName === 'Empreendimentos') {
    // Exemplo: renomear campos
    if (base44Data.titulo) {
      mapped.nome_empreendimento = base44Data.titulo;
      delete mapped.titulo;
    }
    
    // Exemplo: converter tipos
    if (base44Data.valor) {
      mapped.valor_contratual = parseFloat(base44Data.valor);
      delete mapped.valor;
    }
    
    // Exemplo: valores padrão
    mapped.status = mapped.status || 'ativo';
  }
  
  if (entityName === 'Usuarios') {
    // Base44 pode usar 'username' enquanto PostgreSQL usa 'nome'
    if (base44Data.username) {
      mapped.nome = base44Data.username;
      delete mapped.username;
    }
    
    // Senha: Base44 pode ter hash diferente
    // Sugestão: gerar senha temporária ou deixar NULL para forçar reset
    if (base44Data.senha) {
      // mapped.senha = await bcrypt.hash('senhaTemporaria123', 10);
      delete mapped.senha; // Deixa NULL para forçar reset
    }
  }
  
  if (entityName === 'Unidades') {
    // Exemplo: prefixar valores
    if (base44Data.numero) {
      mapped.numero_unidade = `UN-${base44Data.numero}`;
      delete mapped.numero;
    }
  }
  */

  return mapped;
}

async function importEntity(renderPool, entityName, tableName, exportPath) {
  try {
    console.log(`\n📦 Importando: ${entityName} → ${tableName}`);

    // Procura arquivo JSON
    const possibleFiles = [
      path.join(exportPath, `${entityName}.json`),
      path.join(exportPath, `${tableName}.json`),
      path.join(exportPath, `${entityName.toLowerCase()}.json`)
    ];

    let jsonData = null;
    let usedFile = null;

    for (const file of possibleFiles) {
      if (fs.existsSync(file)) {
        jsonData = await loadJSONFile(file);
        usedFile = file;
        break;
      }
    }

    if (!jsonData) {
      console.log(`   ⚠️  Arquivo não encontrado - pulando`);
      return { entity: entityName, migrated: 0, skipped: true };
    }

    const records = Array.isArray(jsonData) ? jsonData : [jsonData];
    console.log(`   📊 ${records.length} registros encontrados em ${path.basename(usedFile)}`);

    if (records.length === 0) {
      console.log(`   ✅ Nenhum dado para importar`);
      return { entity: entityName, migrated: 0, skipped: false };
    }

    const shouldImport = await question(`   ❓ Importar ${records.length} registros? (s/N): `);
    if (shouldImport.toLowerCase() !== 's') {
      console.log(`   ⏭️  Pulando ${entityName}`);
      return { entity: entityName, migrated: 0, skipped: true };
    }

    // Importa registros
    let migrated = 0;
    // Carrega export do Base44
    const exportPath = await loadBase44Export();
    const renderPool = await connectToRender();

    console.log('🚀 Iniciando importação...\n');
    console.log('⚠️  ATENÇÃO: Esta operação irá importar dados para o Render PostgreSQL.');
    console.log('   Certifique-se de ter backup dos dados antes de continuar.\n');

    const confirm = await question('Deseja continuar? (s/N): ');
    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Importação cancelada.');
      process.exit(0);
    }

    // Importa cada entidade
    const results = [];
    for (const [entityName, tableName] of Object.entries(ENTITY_TABLE_MAP)) {
      const result = await importEntity(renderPool, entityName, tableName, exportPath);
      results.push(result);
    }

    // Resumo
    console.log('\n\n📊 RESUMO DA IMPORTAÇÃO:\n');
    console.log('┌─────────────────────────────────┬──────────┬────────┐');
    console.log('│ Entidade                        │ Importados │ Status │');
    console.log('├─────────────────────────────────┼──────────┼────────┤');

    for (const result of results) {
      const status = result.error ? '❌ Erro' : result.skipped ? '⏭️  Pulado' : '✅ OK';
      const name = result.entity.padEnd(30);
      const count = String(result.migrated).padStart(9);
      console.log(`│ ${name} │ ${count} │ ${status} │`);
    }

    console.log('└─────────────────────────────────┴──────────┴────────┘');

    const totalMigrated = results.reduce((sum, r) => sum + r.migrated, 0);
    console.log(`\n✅ Total de registros importados: ${totalMigrated}`);

    // Fecha conexão
    await renderPool.end();
    rl.close();

    console.log('\n🎉 Importação concluída!\n');❌ Migração cancelada.');
    process.exit(0);
  }

    // Migra cada tabela
    const results = [];
  for (const table of TABLES) {
    const result = await migrateTable(base44Pool, renderPool, table);
    results.push(result);
  }

  // Resumo
  console.log('\n\n📊 RESUMO DA MIGRAÇÃO:\n');
  console.log('┌─────────────────────────────────┬──────────┬────────┐');
  console.log('│ Tabela                          │ Migrados │ Status │');
  console.log('├─────────────────────────────────┼──────────┼────────┤');

  for (const result of results) {
    const status = result.error ? '❌ Erro' : result.skipped ? '⏭️  Pulado' : '✅ OK';
    const name = result.table.padEnd(30);
    const count = String(result.migrated).padStart(8);
    console.log(`│ ${name} │ ${count} │ ${status} │`);
  }

  console.log('└─────────────────────────────────┴──────────┴────────┘');

  const totalMigrated = results.reduce((sum, r) => sum + r.migrated, 0);
  console.log(`\n✅ Total de registros migrados: ${totalMigrated}`);

  // Fecha conexões
  await base44Pool.end();
  await renderPool.end();
  rl.close();

  console.log('\n🎉 Migração concluída!\n');

} catch (error) {
  console.error('\n❌ Erro fatal:', error);
  process.exit(1);
}
}

main();
