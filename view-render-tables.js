import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pkg;

// Remove sslmode=require da URL para evitar conflicts
const dbUrl = (process.env.DATABASE_URL || '').replace('?sslmode=require', '').replace('&sslmode=require', '');

const client = new Client({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false  // Ignora validação de certificado
  }
});

async function viewTables() {
  try {
    console.log('🔗 Conectando ao Render DB...');
    await client.connect();
    console.log('✅ Conectado!\n');

    // Listar tabelas
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 TABELAS DO BANCO:');
    console.log('─'.repeat(50));
    if (tables.rows.length === 0) {
      console.log('(nenhuma tabela encontrada)');
    } else {
      tables.rows.forEach((t, i) => {
        console.log(`${i + 1}. ${t.table_name}`);
      });
    }

    // Mostrar contagem de registros de cada tabela
    console.log('\n📊 CONTAGEM DE REGISTROS:');
    console.log('─'.repeat(50));
    for (const row of tables.rows) {
      const count = await client.query(`SELECT COUNT(*) FROM ${row.table_name}`);
      console.log(`${row.table_name}: ${count.rows[0].count} registros`);
    }

  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await client.end();
    console.log('\n✅ Desconectado');
  }
}

viewTables();
