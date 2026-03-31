import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function testConnection() {
  const isProductionRuntime = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);
  const dbTarget = (process.env.DB_TARGET || '').toLowerCase();
  const DATABASE_URL_SELECTED = (() => {
    if (dbTarget === 'local') return process.env.DATABASE_URL_LOCAL;
    if (dbTarget === 'remote') return process.env.DATABASE_URL;
    if (isProductionRuntime) return process.env.DATABASE_URL;
    return process.env.DATABASE_URL_LOCAL || process.env.DATABASE_URL;
  })();
  
  if (!DATABASE_URL_SELECTED) {
    throw new Error('DATABASE_URL/DATABASE_URL_LOCAL não configuradas no .env');
  }

  const forcePgSsl = (process.env.PG_FORCE_SSL || '').toLowerCase() === 'true';
  const disablePgSsl = (process.env.PG_DISABLE_SSL || '').toLowerCase() === 'true';
  const usePgSsl = (() => {
    if (disablePgSsl) return false;
    if (forcePgSsl) return true;
    try {
      const u = new URL(DATABASE_URL_SELECTED);
      const host = (u.hostname || '').toLowerCase();
      const sslmode = (u.searchParams.get('sslmode') || '').toLowerCase();
      if (sslmode) return true;
      if (host === 'localhost' || host === '127.0.0.1') return false;
      if (dbTarget === 'local') return false;
      return isProductionRuntime || dbTarget === 'remote';
    } catch {
      return isProductionRuntime;
    }
  })();

  console.log('Configuração:');
  console.log(`  DB_TARGET: ${dbTarget || 'auto'}`);
  console.log(`  SSL: ${usePgSsl ? 'on' : 'off'}`);
  console.log(`  DATABASE_URL: ${DATABASE_URL_SELECTED.substring(0, 50)}...`);

  // Use exact same config as server.js
  const pool = new Pool({
    connectionString: DATABASE_URL_SELECTED,
    ssl: usePgSsl ? { rejectUnauthorized: false } : false,
    max: process.env.PG_MAX_CLIENTS ? parseInt(process.env.PG_MAX_CLIENTS, 10) : 10,
    idleTimeoutMillis: process.env.PG_IDLE_TIMEOUT_MS ? parseInt(process.env.PG_IDLE_TIMEOUT_MS, 10) : 30000,
    connectionTimeoutMillis: process.env.PG_CONN_TIMEOUT_MS ? parseInt(process.env.PG_CONN_TIMEOUT_MS, 10) : 10000,
  });

  try {
    console.log('\n🔍 Testando conexão simples...');
    const { rows: timeRows } = await pool.query('SELECT now() as current_time');
    console.log('✅ Conexão bem-sucedida. Time:', timeRows[0].current_time);

    console.log('\n🔍 Testando query às empreendimentos...');
    const { rows: empRows } = await pool.query('SELECT COUNT(*) as cnt FROM public.empreendimentos');
    console.log('✅ Empreendimentos encontrados:', empRows[0].cnt);

    console.log('\n🔍 Testando busca com ILIKE...');
    const { rows } = await pool.query(
      `SELECT id, nome_empreendimento FROM public.empreendimentos 
       WHERE nome_empreendimento ILIKE $1
       ORDER BY id DESC LIMIT 5`,
      ['%Nova%']
    );
    console.log('✅ Buscas encontradas:', rows.length);
    rows.forEach(r => console.log(`   - ${r.id}: ${r.nome_empreendimento}`));

  } catch (err) {
    console.error('❌ Erro:', err.message);
    console.error(err.stack);
  } finally {
    await pool.end();
    console.log('\n✅ Pool encerrado');
  }
}

testConnection().catch(err => {
  console.error('ERRO FATAL:', err.message);
  process.exit(1);
});
