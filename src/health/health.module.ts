import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { DrizzleHealthIndicator } from './indicators/drizzle.indicator';
import { BullModule } from '@nestjs/bullmq';
import { BullMQHealthIndicator } from './indicators/bullmq.indicator';
@Module({
  imports: [
    TerminusModule,
    HttpModule,
    BullModule.registerQueue({ name: 'transactions' }),
  ],
  controllers: [HealthController],
  providers: [DrizzleHealthIndicator, BullMQHealthIndicator],
})
export class HealthModule {}
