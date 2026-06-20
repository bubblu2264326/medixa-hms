import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const isLocal = /@(localhost|127\.0\.0\.1)\b/.test(process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

console.log(`✅ Connected to ${isLocal ? 'local Postgres' : 'Cloud Database (Supabase)'}`);

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
}
export default pool;
