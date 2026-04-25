// test/teardown.ts
import { config } from 'dotenv';
import { resolve } from 'path';
import { Client } from 'pg';

export default async function teardown() {
  config({ path: resolve(process.cwd(), '.env.test.local') });

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  await client.query(`
    TRUNCATE TABLE transactions, accounts, users
    RESTART IDENTITY CASCADE;
  `);

  await client.end();
}
