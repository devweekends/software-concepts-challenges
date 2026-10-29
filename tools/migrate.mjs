// tools/migrate.mjs
// Applies every file in db/migrations that has not run yet, in name order.
// Each file runs in one transaction. A file that fails is rolled back and nothing after it runs.
import { readdir, readFile } from 'node:fs/promises';
import pg from 'pg';

try { process.loadEnvFile('.env'); } catch { /* no .env file: DATABASE_URL may already be set */ }

if (!process.env.DATABASE_URL) {
  // Never connect without an address: the driver would try its default, port 5432, which may be another program's database.
  console.error('FAILED: DATABASE_URL is not set. Make your .env file first: Copy-Item .env.example .env');
  process.exit(1);
}

// Postgres needs a few seconds after "docker compose up", so try for up to 20 seconds.
// A client cannot be reused after a failed connect, so each try makes a new one.
let client;
for (let attempt = 1; ; attempt++) {
  client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  try { await client.connect(); break; }
  catch (err) {
    if (attempt === 20) { console.error(`FAILED to connect: ${err.message}`); process.exit(1); }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
  name       text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
)`);
const applied = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((row) => row.name));
const files = (await readdir('db/migrations')).filter((name) => name.endsWith('.sql')).sort();

let ran = 0;
for (const file of files) {
  if (applied.has(file)) continue;
  const sql = await readFile(`db/migrations/${file}`, 'utf8');
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    await client.query('COMMIT');
    console.log(`applied ${file}`);
    ran++;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`FAILED ${file}: ${err.message}`);
    process.exitCode = 1;
    break;
  }
}
if (!process.exitCode) console.log(ran === 0 ? 'nothing to apply, migrations up to date' : 'migrations up to date');
await client.end();
