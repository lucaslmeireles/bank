// transactions.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DrizzleService } from '../drizzle/drizzle.service';
import * as schema from '../drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import { TransactionsGateway } from './transaction.gateway';
@Processor('transactions')
export class TransactionsProcessor extends WorkerHost {
  constructor(
    private readonly drizzle: DrizzleService,
    private gateway: TransactionsGateway,
  ) {
    super();
  }

  async process(job: Job<{ transactionId: string }>) {
    const { transactionId } = job.data;

    await this.drizzle.db.transaction(
      async (tx) => {
        const [transaction] = await tx
          .select()
          .from(schema.transactions)
          .where(eq(schema.transactions.id, transactionId));

        const [from] = await tx
          .select({ balance: schema.accounts.balance })
          .from(schema.accounts)
          .where(eq(schema.accounts.id, transaction.from))
          .for('update');

        const [to] = await tx
          .select({ balance: schema.accounts.balance })
          .from(schema.accounts)
          .where(eq(schema.accounts.id, transaction.to))
          .for('update');

        if (!from || !to) throw new Error('Conta não encontrada');

        if (Number(from.balance) < Number(transaction.amount)) {
          await tx
            .update(schema.transactions)
            .set({ status: 'rolled_back' })
            .where(eq(schema.transactions.id, transactionId));
          this.gateway.emitStatusUpdate(transactionId, 'rolled_back');
          return;
        }

        await tx
          .update(schema.accounts)
          .set({
            balance: sql`${schema.accounts.balance} - ${transaction.amount}`,
          })
          .where(eq(schema.accounts.id, transaction.from));

        await tx
          .update(schema.accounts)
          .set({
            balance: sql`${schema.accounts.balance} + ${transaction.amount}`,
          })
          .where(eq(schema.accounts.id, transaction.to));

        await tx
          .update(schema.transactions)
          .set({ status: 'committed' })
          .where(eq(schema.transactions.id, transactionId));

        this.gateway.emitStatusUpdate(transactionId, 'committed');
      },
      {
        isolationLevel: 'serializable',
        accessMode: 'read write',
      },
    );
  }
}
