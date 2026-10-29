import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findSecrets } from './secret-check.mjs';

const KEY = 'pk_practice_' + 'abcdefghijklmnopqrstuvwx';

test('a staged key is detected', () => {
  const problems = findSecrets([{ path: 'notes.txt', content: `key is ${KEY}` }]);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /notes\.txt/);
});

test('a clean file passes', () => {
  assert.deepEqual(findSecrets([{ path: 'README.md', content: 'Errand is a small task app.' }]), []);
});

test('a staged .env is blocked even when it is empty', () => {
  assert.equal(findSecrets([{ path: '.env', content: '' }]).length, 1);
});

test('.env.example may hold its example key', () => {
  assert.deepEqual(findSecrets([{ path: '.env.example', content: `PRACTICE_API_KEY=${KEY}` }]), []);
});
