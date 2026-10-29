// test/leak.test.js (provided)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { startServer } from '../src/server.js';

const TASK_KEYS = ['done', 'due', 'dueIn', 'id', 'priority', 'title'];
const USER_KEYS = ['email', 'id'];
const INTERNAL = ['ownerId', 'owner_id', 'passwordHash', 'password_hash', 'createdAt', 'created_at', 'status'];

// A due date seven days from now, built from the clock. Errand refuses a due date in the past,
// so a fixed date would make this test fail once that day had gone by.
const inAWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

let server;
let base;
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });

before(async () => {
  ({ server, base } = await startServer(0));   // port 0: any free port
  await db.connect();
});

after(async () => {
  await db.query("DELETE FROM tasks WHERE title LIKE 'leak-test:%'");
  await db.end();
  server.close();
});

// Every key name used anywhere inside a JSON value.
function allKeys(value, found = new Set()) {
  if (Array.isArray(value)) value.forEach((item) => allKeys(item, found));
  else if (value && typeof value === 'object') {
    for (const [key, inner] of Object.entries(value)) { found.add(key); allKeys(inner, found); }
  }
  return found;
}

const post = (body) => fetch(`${base}/tasks`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('a created task has exactly the allowed keys', async () => {
  const response = await post({ title: 'leak-test: keys', due: inAWeek, priority: 'high' });
  assert.equal(response.status, 201);
  const task = await response.json();
  assert.deepEqual(Object.keys(task).sort(), TASK_KEYS);
  assert.equal(task.priority, 'high');
});

test('every task in the list has exactly the allowed keys', async () => {
  await post({ title: 'leak-test: list' });
  const list = await (await fetch(`${base}/tasks`)).json();
  assert.ok(list.length > 0);
  for (const task of list) assert.deepEqual(Object.keys(task).sort(), TASK_KEYS);
});

test('the profile has exactly id and email', async () => {
  const profile = await (await fetch(`${base}/profile`)).json();
  assert.deepEqual(Object.keys(profile).sort(), USER_KEYS, 'an internal field reached GET /profile');
});

test('no internal field name appears in any response', async () => {
  const bodies = [await (await fetch(`${base}/tasks`)).json(), await (await fetch(`${base}/profile`)).json()];
  for (const body of bodies) {
    for (const key of allKeys(body)) assert.ok(!INTERNAL.includes(key), `internal field ${key} reached a response`);
  }
});
