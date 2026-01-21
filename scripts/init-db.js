import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

async function main() {
  const { DATABASE_URL } = process.env;
  if (!DATABASE_URL) {
    console.error('ERROR: DATABASE_URL not set in .env');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: DATABASE_URL });
  const schemaPath = path.resolve(process.cwd(), 'db', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('ERROR: db/schema.sql not found at', schemaPath);
    process.exit(1);
  }
  const sql = fs.readFileSync(schemaPath, 'utf8');
  try {
    const client = await pool.connect();
    try {
      await client.query(sql);
      console.log('Database schema applied successfully.');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Failed to apply schema:', err.code || '', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();