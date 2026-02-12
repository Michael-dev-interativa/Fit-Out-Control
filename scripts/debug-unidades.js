import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function debugUnidades() {
  const localPool = new Pool({
    connectionString: process.env.DATABASE_URL_LOCAL || 'postgres://postgres:IntEng%402025@localhost:5432/fitout',
    ssl: false
  });

  const renderPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Debugando unidades_empreendimento...\n');

    // Verifica colunas no Render
    console.log('📊 Colunas no RENDER:');
    const renderCols = await renderPool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'unidades_empreendimento'
      ORDER BY ordinal_position;
    `);
    renderCols.rows.forEach(r => {
      console.log(`  ${r.column_name} (${r.data_type}) ${r.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // Verifica colunas no Local
    console.log('\n📊 Colunas no LOCAL:');
    const localCols = await localPool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'unidades_empreendimento'
      ORDER BY ordinal_position;
    `);
    localCols.rows.forEach(r => {
      console.log(`  ${r.column_name} (${r.data_type}) ${r.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // Busca 3 registros do Render para ver os dados
    console.log('\n📋 Amostra de 3 registros do RENDER:');
    const sample = await renderPool.query(`
      SELECT * FROM unidades_empreendimento 
      ORDER BY id 
      LIMIT 3;
    `);

    sample.rows.forEach((row, idx) => {
      console.log(`\n  Registro ${idx + 1}:`);
      Object.keys(row).forEach(key => {
        const value = row[key];
        console.log(`    ${key}: ${value === null ? 'NULL' : JSON.stringify(value)}`);
      });
    });

    // Conta quantas unidades têm id_empreendimento NULL no Render
    console.log('\n📈 Estatísticas do RENDER:');
    const nullCount = await renderPool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(id_empreendimento) as com_empreendimento,
        COUNT(*) - COUNT(id_empreendimento) as sem_empreendimento
      FROM unidades_empreendimento;
    `);
    console.log(`  Total: ${nullCount.rows[0].total}`);
    console.log(`  Com id_empreendimento: ${nullCount.rows[0].com_empreendimento}`);
    console.log(`  Sem id_empreendimento (NULL): ${nullCount.rows[0].sem_empreendimento}`);

    await localPool.end();
    await renderPool.end();
  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

debugUnidades();
