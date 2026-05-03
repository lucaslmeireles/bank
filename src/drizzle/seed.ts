import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as argon from 'argon2';

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log('🌱 Seeding...');

  // cria usuários
  const passwordHash = await argon.hash('demo123');

  const [alice] = await db
    .insert(schema.users)
    .values({ email: 'alice@demo.com', password: passwordHash })
    .onConflictDoNothing()
    .returning();

  const [bob] = await db
    .insert(schema.users)
    .values({ email: 'bob@demo.com', password: passwordHash })
    .onConflictDoNothing()
    .returning();

  const [carol] = await db
    .insert(schema.users)
    .values({ email: 'carol@demo.com', password: passwordHash })
    .onConflictDoNothing()
    .returning();

  if (!alice || !bob || !carol) {
    console.log('⚠️  Seed já executada anteriormente, pulando.');
    await pool.end();
    return;
  }

  // cria contas
  await db.insert(schema.accounts).values([
    { number: 1001, balance: '5000.00', owner: alice.id },
    { number: 1002, balance: '3000.00', owner: bob.id },
    { number: 1003, balance: '7500.00', owner: carol.id },
  ]);

  console.log('✅ Seed concluída');
  console.log('   alice@demo.com / demo123  →  conta 1001  R$ 5.000');
  console.log('   bob@demo.com   / demo123  →  conta 1002  R$ 3.000');
  console.log('   carol@demo.com / demo123  →  conta 1003  R$ 7.500');

  await pool.end();
}

seed();
