import pg from 'pg';

const { Pool } = pg;

let _db;

export function getDb() {
  if (!_db) {
    if (!process.env.DATABASE_URL) return null;
    _db = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _db;
}

export const db = new Proxy({}, {
  get(_, prop) {
    const pool = getDb();
    if (!pool) throw new Error('DATABASE_URL not configured');
    return typeof pool[prop] === 'function' ? pool[prop].bind(pool) : pool[prop];
  },
});
