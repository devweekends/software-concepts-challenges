// Checks challenge 0, part 1. Run it from the project folder:
//   node challenges/challenge-0-run-errand/part-1-start-errand/verify.mjs
// Each test says what it looks for. When one fails, read its message.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const results = readFileSync(new URL('results.md', import.meta.url), 'utf8');

test('the setup check passes right now', () => {
  const run = spawnSync(process.execPath, ['tools/check.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, `node tools/check.mjs failed. Read its first FAIL line:\n${run.stdout}`);
});

test('results.md has no placeholder left', () => {
  assert.ok(!results.includes('<paste here>'), 'results.md still has a <paste here> line. Paste your own output there.');
  assert.ok(!/<answer>/.test(results), 'results.md still has an <answer>. Write your answers to the three questions.');
});

test('results.md holds a passing check', () => {
  assert.ok(results.includes('RESULT: all checks passed'), 'paste the output of node tools/check.mjs from a run where every line passes');
  assert.ok(results.includes('PASS practice-api'), 'the pasted check should include the PASS practice-api line');
});

test('results.md holds the check that failed on purpose', () => {
  assert.ok(results.includes('FAIL env-file-missing'), 'paste the first lines of the check with .env renamed to .env.off. One of them starts with FAIL env-file-missing');
});

test('results.md holds the task list from curl.exe', () => {
  assert.ok(/"dueIn"/.test(results), 'paste the output of curl.exe http://127.0.0.1:3000/tasks. It should contain "dueIn"');
});
