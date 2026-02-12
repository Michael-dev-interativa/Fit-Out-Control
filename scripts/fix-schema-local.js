import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function fixSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL_LOCAL || 'postgres://postgres:IntEng%402025@localhost:5432/fitout',
    ssl: false
  });

  try {
    console.log('🔧 Ajustando schema do banco LOCAL...\n');

    // Permite NULL em id_empreendimento
    console.log('1️⃣ Removendo constraint NOT NULL de id_empreendimento...');
    await pool.query(`
      ALTER TABLE unidades_empreendimento 
      ALTER COLUMN id_empreendimento DROP NOT NULL;
    `);
    console.log('   ✅ Feito!\n');

    // Permite NULL em created_at e updated_at
    console.log('2️⃣ Removendo constraint NOT NULL de created_at...');
    await pool.query(`
      ALTER TABLE unidades_empreendimento 
      ALTER COLUMN created_at DROP NOT NULL;
    `);
    console.log('   ✅ Feito!\n');

    console.log('3️⃣ Removendo constraint NOT NULL de updated_at...');
    await pool.query(`
      ALTER TABLE unidades_empreendimento 
      ALTER COLUMN updated_at DROP NOT NULL;
    `);
    console.log('   ✅ Feito!\n');

    console.log('🎉 Schema ajustado com sucesso!\n');
    console.log('Agora você pode rodar: npm run sync:local\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

fixSchema();
