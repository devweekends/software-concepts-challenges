// tools/check.mjs
// The Errand setup check. One line per check. The exit code is 0 only when every check passes.
// A PASS line names the check. A FAIL line names the problem and says how to fix it.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import net from 'node:net';
import pg from 'pg';

let failed = 0;
const pass = (name, note = '') => console.log(`PASS ${name}${note ? ' ' + note : ''}`);
const fail = (name, message) => { failed++; console.log(`FAIL ${name}: ${message}`); };

// Does anything answer on this address? (Any program, not only Postgres.)
const portAnswers = (host, port) => new Promise((resolve) => {
  const socket = net.connect({ host, port: Number(port), timeout: 1500 });
  socket.once('connect', () => { socket.destroy(); resolve(true); });
  socket.once('timeout', () => { socket.destroy(); resolve(false); });
  socket.once('error', () => resolve(false));
});

// The port on your computer that this project's own db container publishes, or null.
function ownDbPort() {
  try {
    const out = execFileSync('docker', ['compose', 'port', 'db', '5432'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 20000 });
    const match = /:(\d+)\s*$/.exec(out.trim().split('\n')[0] ?? '');
    return match ? match[1] : null;
  } catch { return null; }
}

// 1. Node version
const major = Number(process.versions.node.split('.')[0]);
if (major >= 24) pass('node-version', `(Node ${major})`);
else fail('node-too-old', `this is Node ${major}. Errand needs Node 24 or newer. Install Node 24 LTS from nodejs.org, open a new terminal, then run this again.`);

// 2. The .env file
if (existsSync('.env')) {
  pass('env-file');
  try { process.loadEnvFile('.env'); } catch { /* a broken .env shows up in the checks below */ }
} else {
  fail('env-file-missing', 'there is no .env file. Run: Copy-Item .env.example .env (macOS and Linux: cp .env.example .env)');
}

// 3. Line endings in the files the tools read
const candidates = ['.env', 'docker-compose.yml', ...readdirSync('db/migrations').map((name) => `db/migrations/${name}`)];
const crlf = candidates.filter((file) => existsSync(file) && readFileSync(file, 'utf8').includes('\r\n'));
if (crlf.length === 0) pass('line-endings');
else fail('crlf-line-endings', `${crlf.join(', ')} uses Windows line endings (CRLF). Re-save it with LF: in VS Code, click CRLF at the bottom right and choose LF.`);

// 4. Docker and the Postgres image
let dockerUp = false;
try { execFileSync('docker', ['info'], { stdio: 'ignore', timeout: 60000 }); dockerUp = true; pass('docker'); }
catch { fail('docker-not-running', 'Docker is not running. Start Docker Desktop, wait until it says it is running, then run this again.'); }
if (dockerUp) {
  try { execFileSync('docker', ['image', 'inspect', 'postgres:18-alpine'], { stdio: 'ignore' }); pass('postgres-image'); }
  catch { fail('image-pull-failed', 'the Postgres image is not on this computer. Run: docker compose pull (layers that already arrived are kept), then docker compose up -d'); }
}

// 5. The database answers
let migrated = [];
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  // Never connect without an address: the driver would try its default, port 5432, which may be another program's database.
  fail('database', 'DATABASE_URL is not set, so Errand does not know where the database is. Fix the .env problem above first.');
} else {
  try {
    const client = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 3000 });
    await client.connect();
    pass('database');
    try { migrated = (await client.query('SELECT name FROM schema_migrations ORDER BY name')).rows.map((row) => row.name); } catch { /* table missing: reported below */ }
    await client.end();
  } catch (err) {
    const { hostname, port } = new URL(databaseUrl);
    const ours = dockerUp ? ownDbPort() : null;
    if (await portAnswers(hostname, port) && ours !== port) {
      fail('db-port-in-use', `port ${port} is answered by something that is not Errand's database (often another Postgres). Pick a free port, for example 5433: set ERRAND_DB_PORT=5433 and the same port in DATABASE_URL in .env, then run: docker compose up -d`);
    } else {
      fail('database', `could not connect (${err.message}). Run: docker compose up -d`);
    }
  }
}

// 6. The migrations have run
if (migrated.includes('001_create_tasks.sql')) pass('migrations', `(${migrated.length} applied)`);
else fail('migrations', 'the tables are not created yet. Run: node tools/migrate.mjs');

// 7. The practice model API answers on /version
if (!process.env.PRACTICE_API_URL) {
  fail('practice-api', 'PRACTICE_API_URL is not set. Fix the .env problem above first.');
} else {
  try {
    const response = await fetch(`${process.env.PRACTICE_API_URL}/version`, { signal: AbortSignal.timeout(3000) });
    if (response.ok) pass('practice-api', '(answers on /version)');
    else fail('practice-api', `answered ${response.status} on /version. Run: docker compose up -d`);
  } catch (err) {
    fail('practice-api', `no answer on /version (${err.message}). Run: docker compose up -d`);
  }
}

console.log(failed === 0
  ? 'RESULT: all checks passed'
  : `RESULT: ${failed} check(s) failed. Read the first FAIL line. Its name tells you which check.`);
process.exit(failed === 0 ? 0 : 1);
