import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const connectionString = (process.env.DATABASE_URL || '')
  .replace('sslmode=require', 'sslmode=verify-full');

console.log('🔗 Origem:', process.env.DATABASE_URL?.substring(0, 50) + '...');
console.log('🔗 Tentando com sslmode=verify-full...');

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testConnection() {
  try {
    console.log('📡 Testando conexão com SSL (ignorando validação de certificado)...');
    const res = await pool.query('SELECT version()');
    console.log('✅ Conexão bem-sucedida!');
    console.log('🗄️ PostgreSQL:', res.rows[0].version.substring(0, 80));

    // Listar tabelas
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📋 Tabelas encontradas:');
    if (tables.rows.length === 0) {
      console.log('(nenhuma tabela encontrada)');
    } else {
      tables.rows.forEach(t => console.log(`  • ${t.table_name}`));
    }

  } catch (err) {
    console.error('❌ Erro na conexão:');
    console.error(err.message);
  } finally {
    await pool.end();
  }
}

testConnection();
