import pg from 'pg';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const { Pool } = pg;

// Interface para input do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Tabelas a migrar (em ordem de dependência)
const TABLES = [
  'usuarios',
  'empreendimentos',
  'unidades_empreendimento',
  'registros_unidade',
  'registros_gerais',
  'disciplinas_gerais',
  'aps_unidade',
  'kos_unidade',
  'vos_unidade',
  'formularios_vistoria',
  'vistorias',
  'relatorios_semanais',
  'relatorios_primeiros_servicos',
  'aprovacoes_amostra',
  'vistorias_terminalidade',
  'inspecoes_hidrantes',
  'inspecoes_sprinklers',
  'inspecoes_alarme_incendio',
  'inspecoes_ar_condicionado',
  'inspecoes_controle_acesso',
  'inspecoes_cftv',
  'inspecoes_sdai',
  'inspecoes_eletrica',
  'diarios_obra'
];

async function connectToBase44() {
  console.log('\n📊 MIGRAÇÃO DE DADOS - Base44 → Render PostgreSQL\n');

  const base44Url = await question('Cole a URL de conexão do Base44/Supabase:\n(formato: postgresql://user:password@host:port/database)\n> ');

  try {
    const base44Pool = new Pool({
      connectionString: base44Url.trim(),
      ssl: { rejectUnauthorized: false }
    });

    await base44Pool.query('SELECT 1');
    console.log('✅ Conectado ao Base44!\n');
    return base44Pool;
  } catch (error) {
    console.error('❌ Erro ao conectar no Base44:', error.message);
    process.exit(1);
  }
}

async function connectToRender() {
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

async function getTableCount(pool, tableName) {
  try {
    const { rows } = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    return parseInt(rows[0].count);
  } catch (error) {
    return 0; // Tabela não existe
  }
}

async function migrateTable(base44Pool, renderPool, tableName) {
  try {
    console.log(`\n📦 Migrando tabela: ${tableName}`);

    // Conta registros na origem
    const sourceCount = await getTableCount(base44Pool, tableName);
    if (sourceCount === 0) {
      console.log(`   ⚠️  Tabela vazia ou não existe - pulando`);
      return { table: tableName, migrated: 0, skipped: true };
    }

    console.log(`   📊 ${sourceCount} registros encontrados`);

    // Conta registros no destino
    const destCount = await getTableCount(renderPool, tableName);

    const shouldMigrate = await question(`   ❓ Destino tem ${destCount} registros. Continuar? (s/N): `);
    if (shouldMigrate.toLowerCase() !== 's') {
      console.log(`   ⏭️  Pulando ${tableName}`);
      return { table: tableName, migrated: 0, skipped: true };
    }

    // Busca todos os dados
    const { rows: data } = await base44Pool.query(`SELECT * FROM ${tableName}`);

    if (data.length === 0) {
      console.log(`   ✅ Nenhum dado para migrar`);
      return { table: tableName, migrated: 0, skipped: false };
    }

    // Insere no destino
    let migrated = 0;
    const batchSize = 100;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      for (const row of batch) {
        try {
          const columns = Object.keys(row).filter(col => col !== 'id');
          const values = columns.map(col => row[col]);
          const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');

          const query = `
            INSERT INTO ${tableName} (${columns.join(', ')})
            VALUES (${placeholders})
            ON CONFLICT DO NOTHING
          `;

          await renderPool.query(query, values);
          migrated++;
        } catch (error) {
          console.error(`   ⚠️  Erro ao migrar registro:`, error.message);
        }
      }

      console.log(`   📈 Progresso: ${Math.min(i + batchSize, data.length)}/${data.length}`);
    }

    console.log(`   ✅ ${migrated} registros migrados com sucesso!`);
    return { table: tableName, migrated, skipped: false };

  } catch (error) {
    console.error(`   ❌ Erro ao migrar ${tableName}:`, error.message);
    return { table: tableName, migrated: 0, error: error.message };
  }
}

async function main() {
  try {
    // Conecta aos bancos
    const base44Pool = await connectToBase44();
    const renderPool = await connectToRender();

    console.log('🚀 Iniciando migração...\n');
    console.log('⚠️  ATENÇÃO: Esta operação irá copiar dados do Base44 para o Render.');
    console.log('   Certifique-se de ter backup dos dados antes de continuar.\n');

    const confirm = await question('Deseja continuar? (s/N): ');
    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Migração cancelada.');
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
