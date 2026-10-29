// test/priority.test.js
// Challenge 1: your two tests. The setup is given. Each test is marked todo, so it does not
// count as a failure until you write it. When you write one, delete the { todo: ... } part
// so the test counts.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { startServer } from '../src/server.js';

let server;
let base;
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });

before(async () => {
  ({ server, base } = await startServer(0));   // port 0: any free port
  await db.connect();
});

after(async () => {
  await db.query("DELETE FROM tasks WHERE title LIKE 'priority-test:%'");
  await db.end();
  server.close();
});

const post = (body) => fetch(`${base}/tasks`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('a task with no priority is created with priority normal', { todo: 'TODO: write this test' }, async () => {
  // TODO: post { title: 'priority-test: default' } with no priority.
  // Check that the status is 201 and that the answer says priority is 'normal'.
  assert.ok(post, 'post() is ready to use');
});

test('a priority that is not low, normal or high is refused with a 400', { todo: 'TODO: write this test' }, async () => {
  // TODO: post { title: 'priority-test: urgent', priority: 'urgent' }.
  // Check that the status is 400 and that the errors name the problem.
  assert.ok(post, 'post() is ready to use');
});
