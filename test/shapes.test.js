// test/shapes.test.js
// The two door functions from chapter 1.6, on Errand's real names. No database, no server.
// The dates are built from a fixed "now" that the test chooses, so these tests never go stale.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromCreateTaskRequest } from '../src/shapes/task-request.js';
import { toTaskResponse } from '../src/shapes/task-response.js';

const NOW = new Date('2026-10-30T09:30:00Z');
const task = (fields) => ({ id: 1, ownerId: 1, title: 't', dueAt: null, done: false, createdAt: NOW, ...fields });

test('toTaskResponse never sends the owner or the creation time', () => {
  const view = toTaskResponse(task({ ownerId: 9, dueAt: new Date('2026-11-02T00:00:00Z') }), NOW);
  assert.equal('ownerId' in view, false);
  assert.equal('createdAt' in view, false);
  assert.equal(view.due, '2026-11-02');
  assert.equal(view.dueIn, '3 days');
});

test('toTaskResponse ignores a field the model does not know about', () => {
  const view = toTaskResponse(task({ secretNote: 'x', passwordHash: '$scrypt$...' }), NOW);
  assert.ok(!JSON.stringify(view).includes('scrypt'));
  assert.ok(!('secretNote' in view));
});

test('dueIn counts calendar days in UTC', () => {
  const cases = [
    ['2026-11-02T08:00:00Z', '2026-11-02T00:00:00Z', 'today'],
    ['2026-11-01T23:59:00Z', '2026-11-02T00:00:00Z', '1 day'],
    ['2026-11-03T00:00:01Z', '2026-11-02T00:00:00Z', '1 day overdue'],
    ['2026-11-04T10:00:00Z', '2026-11-02T00:00:00Z', '2 days overdue'],
  ];
  for (const [now, due, expected] of cases) {
    assert.equal(toTaskResponse(task({ dueAt: new Date(due) }), new Date(now)).dueIn, expected);
  }
});

test('a task with no due date has due null and dueIn null', () => {
  const view = toTaskResponse(task({}), NOW);
  assert.equal(view.due, null);
  assert.equal(view.dueIn, null);
});

test('fromCreateTaskRequest trims the title and accepts a missing due', () => {
  assert.deepEqual(fromCreateTaskRequest({ title: '  Pay rent ', due: '2026-11-02' }).ok, true);
  const result = fromCreateTaskRequest({ title: '  Pay rent ' });
  assert.equal(result.ok, true);
  assert.equal(result.value.title, 'Pay rent');
  assert.equal(result.value.due, null);
});

test('fromCreateTaskRequest rejects an unknown field and names it', () => {
  const result = fromCreateTaskRequest({ title: 'Pay rent', ownerId: 7 });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('unknown field: ownerId'));
});

test('fromCreateTaskRequest rejects a body that is not an object', () => {
  for (const body of [null, [], 'title', 42, undefined, true]) {
    assert.deepEqual(fromCreateTaskRequest(body), { ok: false, errors: ['body must be an object'] });
  }
});

test('fromCreateTaskRequest rejects a due value that is not a real date', () => {
  for (const due of ['2026-02-30', '2026-13-01', '2026-11-2', 'tomorrow', 20261102]) {
    const result = fromCreateTaskRequest({ title: 'Pay rent', due });
    assert.equal(result.ok, false, `due ${JSON.stringify(due)} should be rejected`);
    assert.ok(result.errors.includes('due must be a date like 2026-11-02'));
  }
});
