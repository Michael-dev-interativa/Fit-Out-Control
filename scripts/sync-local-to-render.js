import pg from 'pg';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const { Pool } = pg;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Tabelas a copiar (na ordem correta por dependências)
const TABLES_TO_COPY = [
  'usuarios',
  'empreendimentos',
  'unidades_empreendimento',
  'registros_unidade',
  'registros_gerais',
  'disciplinas_gerais',
  'formularios_vistoria',
  'vistorias',
  'relatorios_semanais',
  'aprovacoes_amostra',
  'arquivos'
];

async function connectToLocal() {
  console.log('🔌 Conectando ao PostgreSQL LOCAL...');

  const localUrl = process.env.DATABASE_URL_LOCAL || 'postgres://postgres:postgres@localhost:5432/fitout';

  const pool = new Pool({
    connectionString: localUrl,
    ssl: false
  });

  try {
    await pool.query('SELECT 1');
    console.log('✅ Conectado ao PostgreSQL LOCAL!\n');
    return pool;
  } catch (error) {
    console.error('❌ Erro ao conectar no PostgreSQL local:', error.message);
    console.error('\n💡 Configure DATABASE_URL_LOCAL no .env');
    console.error('   Exemplo: DATABASE_URL_LOCAL=postgres://postgres:postgres@localhost:5432/fitout\n');
    process.exit(1);
  }
}

async function connectToRender() {
  console.log('🔌 Conectando ao PostgreSQL do RENDER...');

  const renderUrl = process.env.DATABASE_URL;

  if (!renderUrl) {
    console.error('❌ DATABASE_URL não configurada!');
    console.error('Configure a DATABASE_URL do Render no arquivo .env\n');
    process.exit(1);
  }

  try {
    const pool = new Pool({
      connectionString: renderUrl,
      ssl: { rejectUnauthorized: false }
    });

    await pool.query('SELECT 1');
    console.log('✅ Conectado ao PostgreSQL do RENDER!\n');
    return pool;
  } catch (error) {
    console.error('❌ Erro ao conectar no Render:', error.message);
    process.exit(1);
  }
}

async function getTableCount(pool, tableName) {
  try {
    const result = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
    return parseInt(result.rows[0].count);
  } catch (error) {
    return 0;
  }
}

async function copyTable(localPool, renderPool, tableName) {
  try {
    console.log(`\n📋 Tabela: ${tableName}`);

    // Conta registros no local
    const localCount = await getTableCount(localPool, tableName);
    console.log(`   📊 Local: ${localCount} registros`);

    if (localCount === 0) {
      console.log(`   ⏭️  Pulando (vazia)`);
      return { table: tableName, copied: 0, skipped: true };
    }

    // Conta registros no Render
    const renderCount = await getTableCount(renderPool, tableName);
    console.log(`   📊 Render: ${renderCount} registros`);

    // Busca dados do local
    const { rows } = await localPool.query(`SELECT * FROM ${tableName}`);

    if (rows.length === 0) {
      console.log(`   ⏭️  Nenhum dado para copiar`);
      return { table: tableName, copied: 0, skipped: true };
    }

    // Insere no Render
    let copied = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        const fields = Object.keys(row);
        const values = Object.values(row);
        const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

        const sql = `
          INSERT INTO ${tableName} (${fields.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT DO NOTHING
        `;

        await renderPool.query(sql, values);
        copied++;
      } catch (error) {
        errors++;
      }
    }

    if (errors > 0) {
      console.log(`   ⚠️  ${copied} copiados, ${errors} erros (provavelmente duplicados)`);
    } else {
      console.log(`   ✅ ${copied} registros copiados`);
    }

    return { table: tableName, copied, errors };

  } catch (error) {
    console.error(`   ❌ Erro ao copiar ${tableName}:`, error.message);
    return { table: tableName, copied: 0, error: error.message };
  }
}

async function main() {
  try {
    console.log('\n🔄 SINCRONIZAÇÃO: PostgreSQL Local → Render\n');
    console.log('⚠️  Este script copia dados do banco LOCAL para o RENDER');
    console.log('   Dados existentes no Render NÃO serão sobrescritos.\n');

    const confirm = await question('Deseja continuar? (s/N): ');
    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Operação cancelada.');
      rl.close();
      process.exit(0);
    }

    const localPool = await connectToLocal();
    const renderPool = await connectToRender();

    console.log('🚀 Iniciando cópia...\n');

    const results = [];
    for (const tableName of TABLES_TO_COPY) {
      const result = await copyTable(localPool, renderPool, tableName);
      results.push(result);
    }

    // Resumo
    console.log('\n\n📊 RESUMO DA SINCRONIZAÇÃO:\n');
    console.log('┌─────────────────────────────────┬────────────┬──────────────┐');
    console.log('│ Tabela                          │ Copiados   │ Status       │');
    console.log('├─────────────────────────────────┼────────────┼──────────────┤');

    for (const result of results) {
      let status = '✅ OK';
      if (result.error) {
        status = '❌ Erro';
      } else if (result.skipped) {
        status = '⏭️  Pulado';
      } else if (result.errors && result.errors > 0) {
        status = `⚠️  ${result.errors} dup`;
      }

      const name = result.table.padEnd(30);
      const count = String(result.copied).padStart(9);
      const statusPadded = status.padEnd(12);
      console.log(`│ ${name} │ ${count} │ ${statusPadded} │`);
    }

    console.log('└─────────────────────────────────┴────────────┴──────────────┘');

    const totalCopied = results.reduce((sum, r) => sum + (r.copied || 0), 0);
    console.log(`\n✅ Total de registros copiados: ${totalCopied}`);

    // Fecha conexões
    await localPool.end();
    await renderPool.end();
    rl.close();

    console.log('\n🎉 Sincronização concluída!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erro fatal:', error);
    rl.close();
    process.exit(1);
  }
}

main();
