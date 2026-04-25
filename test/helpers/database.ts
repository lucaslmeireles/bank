import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../src/drizzle/schema';
import { sql } from 'drizzle-orm';

export async function getTestDb() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return drizzle(pool, { schema });
}

export async function resetDatabase() {
  const db = await getTestDb();
  await db.execute(sql`
    TRUNCATE TABLE transactions, accounts, users
    RESTART IDENTITY CASCADE
  `);
}
