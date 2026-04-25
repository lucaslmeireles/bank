import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definida');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/drizzle/schema.ts',
  out: './src/drizzle/migrations',
  dbCredentials: { url: process.env.DATABASE_URL },
});
