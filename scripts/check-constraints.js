import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function checkConstraints() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL_LOCAL || 'postgres://postgres:IntEng%402025@localhost:5432/fitout',
    ssl: false
  });

  try {
    console.log('🔍 Verificando constraints de unidades_empreendimento...\n');

    const result = await pool.query(`
      SELECT 
        conname as constraint_name,
        contype as constraint_type,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'unidades_empreendimento'::regclass 
      ORDER BY contype;
    `);

    console.log('Constraints encontradas:');
    result.rows.forEach(row => {
      const type = {
        'p': 'PRIMARY KEY',
        'f': 'FOREIGN KEY',
        'u': 'UNIQUE',
        'c': 'CHECK'
      }[row.constraint_type] || row.constraint_type;

      console.log(`\n  ${row.constraint_name} (${type}):`);
      console.log(`    ${row.definition}`);
    });

    await pool.end();
  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

checkConstraints();
