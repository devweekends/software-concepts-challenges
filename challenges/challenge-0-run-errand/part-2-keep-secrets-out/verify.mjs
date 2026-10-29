// Checks challenge 0, part 2. Run it from the project folder:
//   node challenges/challenge-0-run-errand/part-2-keep-secrets-out/verify.mjs
// Each test says what it looks for. When one fails, read its message.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const results = readFileSync(new URL('results.md', import.meta.url), 'utf8');
const git = (...args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });

test('.env is ignored by Git', () => {
  const run = git('check-ignore', '-v', '.env');
  assert.equal(run.status, 0, 'git check-ignore says .env is not ignored. Add a line with .env to .gitignore');
});

test('.env.example is not ignored', () => {
  const run = git('check-ignore', '.env.example');
  assert.notEqual(run.status, 0, '.env.example must stay in the repository. Do not ignore it');
});

test('the hook folder is turned on', () => {
  const run = git('config', 'core.hooksPath');
  assert.equal(run.stdout.trim(), '.githooks', 'run: git config core.hooksPath .githooks');
});

test('the secret check tests pass', () => {
  const run = spawnSync(process.execPath, ['--test', 'tools/secret-check.test.js'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, `node --test tools/secret-check.test.js failed:\n${run.stdout}`);
});

test('results.md has no placeholder left', () => {
  assert.ok(!results.includes('<paste here>'), 'results.md still has a <paste here> line. Paste your own output there.');
  assert.ok(!/<answer>/.test(results), 'results.md still has an <answer>. Write your answers to the questions.');
});

test('results.md holds the blocked commit', () => {
  assert.ok(results.includes('secret-check: commit stopped.'), 'paste the output of the commit that the hook stopped');
});
