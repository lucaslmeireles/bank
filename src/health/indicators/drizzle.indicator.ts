import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { DrizzleService } from '../../drizzle/drizzle.service';
import { sql } from 'drizzle-orm';

@Injectable()
export class DrizzleHealthIndicator {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string) {
    const indicator = this.healthIndicatorService.check(key);
    try {
      await this.drizzle.db.execute(sql`SELECT 1`);
      return indicator.up();
    } catch (error) {
      return indicator.down({ reason: error?.message as string });
    }
  }
}
