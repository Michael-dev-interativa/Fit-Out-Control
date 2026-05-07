import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

const url = process.env.DATABASE_URL;
console.log('Testando:', url?.replace(/:([^:@]+)@/, ':***@'));

const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

try {
  await client.connect();
  const r = await client.query('SELECT version(), current_database()');
  console.log('✅ Conectado!', r.rows[0].version.slice(0, 40), '| db:', r.rows[0].current_database);
} catch (e) {
  console.error('❌ ERRO:', e.message);
} finally {
  await client.end().catch(() => {});
}
