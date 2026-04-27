import { varchar } from 'drizzle-orm/pg-core';
import { timestamp } from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core';
import { integer } from 'drizzle-orm/pg-core';
import { decimal } from 'drizzle-orm/pg-core';
import { uuid } from 'drizzle-orm/pg-core';
import { pgTable } from 'drizzle-orm/pg-core';

export const transactionStatusEnum = pgEnum('transaction_status', [
  'pending',
  'committed',
  'rolled_back',
]);

export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  email: varchar().notNull(),
  password: varchar().notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
});

export const accounts = pgTable('accounts', {
  id: uuid().primaryKey().defaultRandom(),
  balance: decimal({ precision: 15, scale: 2 }).notNull().default('0'),
  number: integer().unique(),
  owner: uuid()
    .notNull()
    .references(() => users.id, {
      onDelete: 'cascade',
    })
    .unique(),
  created_at: timestamp('created_at').notNull().defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: uuid().primaryKey().defaultRandom(),
  to: uuid()
    .notNull()
    .references(() => accounts.id),
  from: uuid()
    .notNull()
    .references(() => accounts.id),
  amount: decimal().notNull(),
  status: transactionStatusEnum('status').notNull().default('pending'),
  created_at: timestamp('created_at').notNull().defaultNow(),
});
