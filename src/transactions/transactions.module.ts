import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { TransactionsProcessor } from './transaction.processor';
import { TransactionsGateway } from './transaction.gateway';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [BullModule.registerQueue({ name: 'transactions' })],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionsProcessor, TransactionsGateway],
})
export class TransactionsModule {}
