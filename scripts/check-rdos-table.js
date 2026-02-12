import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function checkRdosTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Verificando estrutura da tabela rdos...\n');

    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'rdos'
      ORDER BY ordinal_position;
    `);

    if (result.rows.length === 0) {
      console.log('❌ Tabela "rdos" não encontrada no banco de dados!');
      process.exit(1);
    }

    console.log('Colunas da tabela rdos:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    await pool.end();
  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

checkRdosTable();
