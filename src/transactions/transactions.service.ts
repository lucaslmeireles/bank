import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { DrizzleService } from '../drizzle/drizzle.service';
import * as schema from '../drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { User } from 'src/users/user.entity';
@Injectable()
export class TransactionsService {
  constructor(
    private readonly drizzle: DrizzleService,
    @InjectQueue('transactions') private readonly queue: Queue,
  ) {}
  async create(dto: CreateTransactionDto, user: User) {
    const [accountFrom] = await this.drizzle.db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.owner, user.id));

    const newTransaction = await this.drizzle.db.transaction(
      async (tx) => {
        const [transaction] = await tx
          .insert(schema.transactions)
          .values({
            ...dto,
            from: accountFrom.id,
          })
          .returning();

        const [from] = await tx
          .select({ balance: schema.accounts.balance })
          .from(schema.accounts)
          .where(eq(schema.accounts.owner, user.id))
          .for('update');

        const [to] = await tx
          .select({ balance: schema.accounts.balance })
          .from(schema.accounts)
          .where(eq(schema.accounts.id, dto.to))
          .for('update');

        if (!from || !to) throw new Error('Conta não encontrada');

        if (Number(from.balance) < Number(dto.amount)) {
          throw new Error('Saldo insuficiente');
        }

        await tx
          .update(schema.accounts)
          .set({ balance: sql`${schema.accounts.balance} - ${dto.amount}` })
          .where(eq(schema.accounts.id, user.id));
        await tx
          .update(schema.accounts)
          .set({ balance: sql`${schema.accounts.balance} + ${dto.amount}` })
          .where(eq(schema.accounts.id, dto.to));
        const [commited] = await tx
          .update(schema.transactions)
          .set({ status: schema.transactionStatusEnum.enumValues[1] })
          .where(eq(schema.transactions.id, transaction.id))
          .returning();
        return commited;
      },
      {
        isolationLevel: 'serializable',
        accessMode: 'read write',
        deferrable: true,
      },
    );
    return newTransaction;
  }

  /**
   * Create with bullmq, for many transactions
   * @param dto
   */
  async createWithQueue(dto: CreateTransactionDto, user: User) {
    const [accountFrom] = await this.drizzle.db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.owner, user.id));
    const [transaction] = await this.drizzle.db
      .insert(schema.transactions)
      .values({ ...dto, status: 'pending', from: accountFrom.id })
      .returning();

    await this.queue.add(
      'process',
      { transactionId: transaction.id },
      {
        attempts: 3, // retenta 3x em caso de erro
        backoff: {
          type: 'exponential',
          delay: 1000, // 1s, 2s, 4s
        },
      },
    );

    return transaction;
  }

  async findAll() {
    const fromAccount = alias(schema.accounts, 'from_account');
    const toAccount = alias(schema.accounts, 'to_account');

    const transactions = await this.drizzle.db
      .select({
        id: schema.transactions.id,
        amount: schema.transactions.amount,
        status: schema.transactions.status,
        created_at: schema.transactions.created_at,
        from: {
          id: fromAccount.id,
          number: fromAccount.number,
          balance: fromAccount.balance,
        },
        to: {
          id: toAccount.id,
          number: toAccount.number,
          balance: toAccount.balance,
        },
      })
      .from(schema.transactions)
      .innerJoin(fromAccount, eq(schema.transactions.from, fromAccount.id))
      .innerJoin(toAccount, eq(schema.transactions.to, toAccount.id));

    if (!transactions) throw new NotFoundException('Transação não encontrada');
    return transactions;
  }

  async findOne(id: string) {
    const [transaction] = await this.drizzle.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, id));

    if (!transaction) throw new NotFoundException('Transação não encontrada');

    return transaction;
  }

  /**
   * Used only for admin purposes
   * @param id
   * @returns
   */
  async remove(id: string) {
    return await this.drizzle.db
      .delete(schema.transactions)
      .where(eq(schema.transactions.id, id));
  }
}
