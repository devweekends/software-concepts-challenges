// tools/restore.mjs
// Rebuilds Errand as it is at the end of a challenge, so you can start the next one.
//   node tools/restore.mjs 0    the end of challenge 0: .env, .gitignore, the hook, Docker, migration 001
//   node tools/restore.mjs 1    the end of challenge 1: everything in 0, plus priority through every layer
// Read the answers after you have tried the challenge yourself. If you use a restore, say so.
//
// Files that a restore replaces are copied to restore-backup/<time>/ first. Your results.md files are never touched.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// The files that challenge 1 adds or changes. The answers live in a folder with the same layout.
// The folder is restore/challenge-1 in this repository, or the folder named in ERRAND_SOLUTION_DIR.
const CHALLENGE_1_FILES = [
  'db/migrations/002_add_priority.sql',
  'src/shapes/task-request.js',
  'src/shapes/task-model.js',
  'src/shapes/task-response.js',
  'src/repositories/tasks.js',
  'src/views/task-list.js',
  'test/priority.test.js',
];

const target = process.argv[2];
if (target === '--list' || target === undefined) {
  console.log('node tools/restore.mjs 0   end of challenge 0: .env, .gitignore, the hook, Docker, migration 001');
  console.log('node tools/restore.mjs 1   end of challenge 1: the above, plus priority through every layer');
  process.exit(target === undefined ? 1 : 0);
}
if (target !== '0' && target !== '1') {
  console.error(`Unknown challenge "${target}". Use 0 or 1. See: node tools/restore.mjs --list`);
  process.exit(1);
}
if (!existsSync('docker-compose.yml') || !existsSync('tools/migrate.mjs')) {
  console.error('FAILED: run this from the project folder (the one with docker-compose.yml).');
  process.exit(1);
}

const run = (command, args) => {
  console.log(`> ${[command === process.execPath ? 'node' : command, ...args].join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) { console.error(`FAILED: ${command} ${args.join(' ')}`); process.exit(1); }
};

// Check first, so a restore that cannot finish changes nothing.
let solutionDir = null;
if (target === '1') {
  solutionDir = process.env.ERRAND_SOLUTION_DIR ?? 'restore/challenge-1';
  const missing = CHALLENGE_1_FILES.filter((file) => !existsSync(join(solutionDir, file)));
  if (missing.length > 0) {
    console.error(`FAILED: the answers for challenge 1 are not in ${solutionDir} (missing: ${missing.join(', ')}).`);
    console.error('Ask your mentor for the answers, or set ERRAND_SOLUTION_DIR to the folder that holds them.');
    process.exit(1);
  }
}

// Challenge 0: .env exists, .gitignore lists it, the hook is on, Docker runs, migration 001 is applied.
if (!existsSync('.env')) {
  copyFileSync('.env.example', '.env');
  console.log('made .env from .env.example');
} else {
  console.log('.env already exists, left as it is');
}
const ignore = existsSync('.gitignore') ? readFileSync('.gitignore', 'utf8') : '';
if (!ignore.split('\n').includes('.env')) {
  writeFileSync('.gitignore', `${ignore}${ignore === '' || ignore.endsWith('\n') ? '' : '\n'}.env\n`);
  console.log('added .env to .gitignore');
}
if (existsSync('.git')) run('git', ['config', 'core.hooksPath', '.githooks']);
run('docker', ['compose', 'up', '-d']);
run(process.execPath, ['tools/migrate.mjs']);

// Challenge 1: the answers go over the files you edited.
if (solutionDir) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  for (const file of CHALLENGE_1_FILES) {
    if (existsSync(file)) {
      // The .bak ending keeps node --test from running a saved test file.
      const saved = join('restore-backup', stamp, `${file}.bak`);
      mkdirSync(dirname(saved), { recursive: true });
      copyFileSync(file, saved);
    }
    mkdirSync(dirname(file), { recursive: true });
    copyFileSync(join(solutionDir, file), file);
    console.log(`restored ${file}`);
  }
  console.log(`your own versions are saved in restore-backup/${stamp}/`);
  run(process.execPath, ['tools/migrate.mjs']);
}
console.log(`restore ${target} done`);
