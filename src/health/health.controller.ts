import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { DrizzleHealthIndicator } from './indicators/drizzle.indicator';
import { BullMQHealthIndicator } from './indicators/bullmq.indicator';
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private readonly queue: BullMQHealthIndicator,
    private db: DrizzleHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.isHealthy('db'),
      () => this.queue.isHealthy('queue'),
    ]);
  }
}
