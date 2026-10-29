import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createPracticeServer } from '../server.js';

// Short delays, so the tests finish fast. The real service waits 2 to 30 seconds.
const TEST_KEY = 'practice-test-key';
const LIVE_KEY = 'practice-live-key';
const { server } = createPracticeServer({ mode: 'test', testKey: TEST_KEY, liveKey: LIVE_KEY, quota: 200, minDelayMs: 5, maxDelayMs: 20 });
let base;

before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.closeAllConnections(); server.close(); });

const call = (path, { method = 'GET', key = TEST_KEY, body, headers = {} } = {}) => fetch(`${base}${path}`, {
  method,
  headers: { ...(key ? { Authorization: `Bearer ${key}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
  body: body ? JSON.stringify(body) : undefined,
});

test('/version answers without a key', async () => {
  const response = await call('/version', { key: null });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.name, 'practice-model-api');
  assert.equal(body.mode, 'test');
  assert.match(body.note, /not a real paid service/i);
});

test('a missing or unknown key gets 401', async () => {
  assert.equal((await call('/v1/generate', { method: 'POST', key: null, body: { prompt: 'x' } })).status, 401);
  const bad = await call('/v1/generate', { method: 'POST', key: 'nope', body: { prompt: 'x' } });
  assert.equal(bad.status, 401);
  assert.deepEqual(await bad.json(), { error: 'invalid key' });
});

test('a live-mode key against a test-mode server says which mode the key is for', async () => {
  const response = await call('/v1/generate', { method: 'POST', key: LIVE_KEY, body: { prompt: 'x' } });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'key is for live mode' });
});

test('a test-mode key against a live-mode server gets 401 key is for test mode', async () => {
  const { server: liveServer } = createPracticeServer({ mode: 'live', testKey: TEST_KEY, liveKey: LIVE_KEY, minDelayMs: 1, maxDelayMs: 1 });
  await new Promise((resolve) => liveServer.listen(0, '127.0.0.1', resolve));
  try {
    const url = `http://127.0.0.1:${liveServer.address().port}/v1/generate`;
    const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${TEST_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: 'x' }) });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'key is for test mode' });
  } finally { liveServer.closeAllConnections(); liveServer.close(); }
});

test('a call costs 40 credits and the answer is different each time', async () => {
  await call('/admin/reset-credits', { method: 'POST' });
  const first = await (await call('/v1/generate', { method: 'POST', body: { prompt: 'Summarise these notes' } })).json();
  const second = await (await call('/v1/generate', { method: 'POST', body: { prompt: 'Summarise these notes' } })).json();
  assert.equal(first.creditsCharged, 40);
  assert.equal(first.creditsRemaining, 160);
  assert.equal(second.creditsRemaining, 120);
  assert.notEqual(first.text, second.text);
  assert.notEqual(first.id, second.id);
});

test('the same Idempotency-Key gives the same answer and is charged once', async () => {
  await call('/admin/reset-credits', { method: 'POST' });
  const headers = { 'Idempotency-Key': 'task-14-step-1' };
  const first = await call('/v1/generate', { method: 'POST', body: { prompt: 'Same prompt' }, headers });
  const second = await call('/v1/generate', { method: 'POST', body: { prompt: 'Same prompt' }, headers });
  assert.equal(second.headers.get('idempotency-replayed'), 'true');
  assert.deepEqual(await second.json(), await first.json());
  const credits = await (await call('/credits')).json();
  assert.equal(credits.creditsRemaining, 160);
  const other = await call('/v1/generate', { method: 'POST', body: { prompt: 'A different prompt' }, headers });
  assert.equal(other.status, 422);
});

test('no credits left gives 429 with Retry-After, and the 429 is not stored against the key', async () => {
  await call('/admin/reset-credits', { method: 'POST' });
  for (let i = 0; i < 5; i++) assert.equal((await call('/v1/generate', { method: 'POST', body: { prompt: `call ${i}` } })).status, 200);
  const headers = { 'Idempotency-Key': 'retry-me' };
  const refused = await call('/v1/generate', { method: 'POST', body: { prompt: 'one more' }, headers });
  assert.equal(refused.status, 429);
  assert.ok(Number(refused.headers.get('retry-after')) > 0, 'Retry-After must be a positive number of seconds');
  await call('/admin/reset-credits', { method: 'POST' });
  const retried = await call('/v1/generate', { method: 'POST', body: { prompt: 'one more' }, headers });
  assert.equal(retried.status, 200);
  assert.equal(retried.headers.get('idempotency-replayed'), null);
});

test('a bad prompt gets 400', async () => {
  const response = await call('/v1/generate', { method: 'POST', body: { prompt: '   ' } });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'prompt must be non-empty text' });
});

test('the module 4 stubs say so', async () => {
  const jobs = await call('/v1/jobs', { method: 'POST', body: {} });
  assert.equal(jobs.status, 501);
  const deliveries = await (await call('/deliveries', { key: null })).json();
  assert.deepEqual(deliveries.deliveries, []);
  assert.match(deliveries.note, /module 4/);
});
