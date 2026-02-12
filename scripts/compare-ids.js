import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function compareIds() {
  const localPool = new Pool({
    connectionString: process.env.DATABASE_URL_LOCAL || 'postgres://postgres:IntEng%402025@localhost:5432/fitout',
    ssl: false
  });

  const renderPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Comparando IDs de unidades_empreendimento...\n');

    const localResult = await localPool.query(`
      SELECT id FROM unidades_empreendimento 
      ORDER BY id 
      LIMIT 10;
    `);

    const renderResult = await renderPool.query(`
      SELECT id FROM unidades_empreendimento 
      ORDER BY id 
      LIMIT 10;
    `);

    console.log('📊 Local (primeiros 10 IDs):');
    console.log(localResult.rows.map(r => r.id).join(', '));

    console.log('\n📊 Render (primeiros 10 IDs):');
    console.log(renderResult.rows.map(r => r.id).join(', '));

    // Verifica total de cada
    const localCount = await localPool.query('SELECT COUNT(*) FROM unidades_empreendimento');
    const renderCount = await renderPool.query('SELECT COUNT(*) FROM unidades_empreendimento');

    console.log(`\n📈 Total Local: ${localCount.rows[0].count}`);
    console.log(`📈 Total Render: ${renderCount.rows[0].count}`);

    // Verifica quais IDs do Render NÃO existem no Local
    const missingResult = await renderPool.query(`
      SELECT id FROM unidades_empreendimento 
      WHERE id NOT IN (SELECT id FROM unidades_empreendimento_local)
      LIMIT 5;
    `).catch(() => null);

    if (missingResult) {
      console.log('\n🔍 IDs do Render que NÃO existem no Local (amostra):');
      console.log(missingResult.rows.map(r => r.id).join(', '));
    }

    await localPool.end();
    await renderPool.end();
  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

compareIds();
