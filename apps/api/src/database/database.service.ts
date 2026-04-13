import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { neon, neonConfig, NeonQueryFunction } from '@neondatabase/serverless';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private sql: NeonQueryFunction<false, false>;

  constructor() {
    neonConfig.fetchConnectionCache = true;
    this.sql = neon(process.env.DATABASE_URL!);
  }

  async query<T = Record<string, unknown>>(
    query: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const result = await this.sql(query, params);
    return result as T[];
  }

  async queryOne<T = Record<string, unknown>>(
    query: string,
    params: unknown[] = [],
  ): Promise<T | null> {
    const result = await this.query<T>(query, params);
    return result[0] || null;
  }

  onModuleDestroy() {
    // Neon serverless doesn't require explicit cleanup
  }
}
