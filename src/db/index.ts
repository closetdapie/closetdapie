import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

type DB = ReturnType<typeof drizzle<typeof schema>>;
let _db: DB | null = null;

function getDb(): DB {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não configurada');
  const sql = neon(url);
  _db = drizzle(sql, { schema });
  return _db;
}

// Proxy lazy: chama getDb() na hora do uso, não no import
export const db = new Proxy({} as DB, {
  get(_, prop) {
    const instance = getDb();
    const value = Reflect.get(instance, prop);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export * from './schema';
