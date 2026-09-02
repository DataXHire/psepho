import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import crypto from 'crypto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/psepho',
});

export const db = drizzle(pool, { schema });
export { pool };

export function sha256(val: string): string {
  return crypto.createHash('sha256').update(val).digest('hex');
}

export function hashWithPepper(val: string, pollId: string): string {
  const pepper = process.env.SERVER_PEPPER || 'psepho-default-dev-pepper';
  return crypto.createHash('sha256').update(`${val}:${pollId}:${pepper}`).digest('hex');
}
