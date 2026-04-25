import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
export const PG_CONNECTION = 'PG_CONNECTION';

export const DrizzleProvider: Provider = {
  provide: PG_CONNECTION,
  inject: [ConfigService],
  useFactory(configService: ConfigService) {
    const pool = new Pool({
      connectionString: configService.get<string>('DATABASE_URL'),
    });
    return drizzle(pool, { schema }) as NodePgDatabase<typeof schema>;
  },
};
