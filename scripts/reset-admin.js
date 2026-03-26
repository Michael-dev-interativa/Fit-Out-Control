import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function resetAdmin() {
  try {
    console.log('🔄 Resetting admin user to: admin@fitout.com / InterativaEng2024');
    
    const client = await pool.connect();
    try {
      // Delete existing admin if any
      await client.query('DELETE FROM public.usuarios WHERE email = $1', ['admin@fitout.com']);
      
      // Create new admin with standard test credentials
      await client.query(
        `INSERT INTO public.usuarios (email, nome, password_hash, role, perfil_cliente)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'admin@fitout.com',
          'Administrador',
          '29e90dc832cfa00a80ba4265fb999182:85ce483496460f289d20d750bb2503756598b1322e4f610e530defd5eaa845b6',
          'admin',
          false
        ]
      );
      
      console.log('✅ Admin user reset successfully!');
      console.log('📧 Email: admin@fitout.com');
      console.log('🔐 Password: InterativaEng2024');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetAdmin();
