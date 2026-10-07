import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Em produção a conexão usa SSL (bancos gerenciados como Supabase/Render exigem).
// DATABASE_SSL=false desliga isso para um Postgres local sem SSL, como o do docker-compose.
const usarSsl = process.env.NODE_ENV === 'production' && process.env.DATABASE_SSL !== 'false';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: usarSsl ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
