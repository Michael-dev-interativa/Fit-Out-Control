import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function testConnections() {
  console.log('\n🧪 TESTE DE CONEXÕES\n');

  // Testa LOCAL
  console.log('📍 Testando PostgreSQL LOCAL...');
  console.log(`   URL: ${process.env.DATABASE_URL_LOCAL}\n`);

  try {
    const localPool = new Pool({
      connectionString: process.env.DATABASE_URL_LOCAL,
      ssl: false
    });

    await localPool.query('SELECT version()');
    console.log('✅ LOCAL: Conexão OK!\n');
    await localPool.end();
  } catch (error) {
    console.error('❌ LOCAL: Erro de conexão');
    console.error(`   Mensagem: ${error.message}\n`);
  }

  // Testa RENDER
  console.log('📍 Testando PostgreSQL RENDER...');
  console.log(`   URL: ${process.env.DATABASE_URL?.substring(0, 50)}...\n`);

  try {
    const renderPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    const result = await renderPool.query('SELECT version()');
    console.log('✅ RENDER: Conexão OK!');
    console.log(`   ${result.rows[0].version}\n`);
    await renderPool.end();
  } catch (error) {
    console.error('❌ RENDER: Erro de conexão');
    console.error(`   Mensagem: ${error.message}\n`);
  }

  process.exit(0);
}

testConnections();
