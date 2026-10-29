// tools/secret-check.mjs
// Stops a commit that holds a practice API key or a .env file.
// The pre-commit hook runs this. The tests import findSecrets.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const KEY = /pk_practice_[a-z0-9]{24}/;
const ENV_FILE = /(^|\/)\.env(\.[^/]+)?$/;

// files: [{ path, content }]. Returns a list of problems. The list is empty when the files are clean.
export function findSecrets(files) {
  const problems = [];
  for (const { path, content } of files) {
    if (path.endsWith('.env.example')) continue;      // the template file holds a harmless example key
    if (ENV_FILE.test(path)) problems.push(`${path}: a .env file must never be committed`);
    else if (KEY.test(content)) problems.push(`${path}: looks like it holds a practice API key`);
  }
  return problems;
}

function stagedFiles() {
  const names = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], { encoding: 'utf8' })
    .split('\n').filter(Boolean);
  return names.map((path) => ({ path, content: execFileSync('git', ['show', `:${path}`], { encoding: 'utf8' }) }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = findSecrets(stagedFiles());
  if (problems.length > 0) {
    console.error('secret-check: commit stopped.');
    for (const problem of problems) console.error(`  ${problem}`);
    console.error('Remove the secret from the file, unstage it, and commit again. If the key was real, change the key.');
    process.exit(1);
  }
}
