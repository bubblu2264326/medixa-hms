import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Supabase is the single source of truth for HMS.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

console.log('✅ Connected to Cloud Database (Supabase)');



export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
}
export default pool;
