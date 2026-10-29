import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { logger } from '../logger';

const connectionString = process.env.DATABASE_URL;

// Global singleton client to prevent connection pool exhaustion in Next.js development HMR
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

let client: postgres.Sql | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

if (connectionString) {
  try {
    client = globalForDb.conn ?? postgres(connectionString, {
      max: process.env.NODE_ENV === 'production' ? 10 : 3,
      idle_timeout: 20,
      connect_timeout: 10
    });
    if (process.env.NODE_ENV !== 'production') globalForDb.conn = client;
    dbInstance = drizzle(client, { schema });
  } catch (err) {
    logger.warn({ err }, 'Could not connect to PostgreSQL database. Using safe fallback mode.');
  }
} else {
  logger.warn('DATABASE_URL is not set. Aether is running with local mock persistence fallback.');
}

export const db = dbInstance;
export { schema };
