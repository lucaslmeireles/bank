import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get('REDIS_URL', 'localhost'),
          tls: {},
        },
      }),
    }),
    BullModule.registerQueue({
      name: 'transactions',
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
