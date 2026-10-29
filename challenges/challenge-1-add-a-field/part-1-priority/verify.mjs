// Checks challenge 1, part 1. Run it from the project folder:
//   node challenges/challenge-1-add-a-field/part-1-priority/verify.mjs
// Each test says what it looks for. When one fails, read its message.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const results = readFileSync(new URL('results.md', import.meta.url), 'utf8');
try { process.loadEnvFile(`${root}.env`); } catch { /* no .env file: the test below says so */ }

test('the migration file has the right name', () => {
  assert.ok(existsSync(`${root}db/migrations/002_add_priority.sql`), 'write db/migrations/002_add_priority.sql (a new number, not a change to 001)');
});

test('the database has a priority column that is never empty and defaults to normal', async () => {
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL is not set. Make your .env file first.');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 });
  await client.connect();
  try {
    const column = (await client.query(
      "SELECT is_nullable, column_default FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'priority'",
    )).rows[0];
    assert.ok(column, 'the tasks table has no priority column. Run: node tools/migrate.mjs');
    assert.equal(column.is_nullable, 'NO', 'priority must be NOT NULL');
    assert.match(column.column_default, /'normal'/, "priority must default to 'normal'");
    const rule = (await client.query(
      "SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid = 'tasks'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%priority%'",
    )).rows[0];
    assert.ok(rule, 'the database should refuse any priority except low, normal and high: add a CHECK');
    const refused = await client.query("INSERT INTO tasks (owner_id, title, priority) VALUES (1, 'verify: bad priority', 'urgent')").then(() => false, () => true);
    assert.ok(refused, 'the database accepted the priority urgent. The CHECK is wrong');
  } finally {
    await client.query("DELETE FROM tasks WHERE title LIKE 'verify:%'");
    await client.end();
  }
});

test('the provided leak tests pass', () => {
  const run = spawnSync(process.execPath, ['--env-file=.env', '--test', 'test/leak.test.js'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, `test/leak.test.js failed. Read the first failure:\n${run.stdout}`);
});

test('your two priority tests are written and pass', () => {
  const source = readFileSync(`${root}test/priority.test.js`, 'utf8');
  assert.ok(!/todo:/.test(source), 'test/priority.test.js still has a { todo: ... } on a test. Write the test, then delete the todo part');
  const run = spawnSync(process.execPath, ['--env-file=.env', '--test', 'test/priority.test.js'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, `test/priority.test.js failed:\n${run.stdout}`);
});

test('results.md has no placeholder left', () => {
  assert.ok(!results.includes('<paste here>'), 'results.md still has a <paste here> line. Paste your own output there.');
  assert.ok(!/<write here>/.test(results), 'results.md still has a <write here> line. Write your fault line.');
});

test('results.md shows the table after the migration', () => {
  assert.ok(results.includes('tasks_priority_check'), String.raw`paste the output of \d tasks. It should include the tasks_priority_check line`);
});
