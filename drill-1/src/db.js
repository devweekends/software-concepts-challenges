// src/db.js
// One connection pool for the whole app. Only repositories import this file.
import pg from 'pg';

/** @type {pg.Pool | null} */
let pool = null;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set. Node does not read .env by itself: use node --env-file=.env ...');
    }
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

/**
 * @param {string} text   SQL text with $1, $2 placeholders
 * @param {unknown[]} [params]
 */
export function query(text, params) {
  return getPool().query(text, params);
}

export async function closePool() {
  if (pool) {
    const old = pool;
    pool = null;
    await old.end();
  }
}
