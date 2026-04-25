import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class BullMQHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    @InjectQueue('transactions') private readonly queue: Queue,
  ) {}

  async isHealthy(key: string) {
    const indicator = this.healthIndicatorService.check(key);
    try {
      await this.queue.isPaused(); //Faz um ping para o redis

      const [waiting, active, failed] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getFailedCount(),
      ]);

      if (failed >= 10) {
        return indicator.down({
          waiting,
          active,
          failed,
          reason: 'too many failed jobs',
        });
      }

      return indicator.up({ waiting, active, failed });
    } catch (error) {
      return indicator.down({ reason: error?.message });
    }
  }
}
