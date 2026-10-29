// tools/drill.mjs
// Fault drills. node tools/drill.mjs 1 starts a second copy of Errand, with one fault in its code,
// on port 3001. The code of the copy is in drill-<number>/. Your own Errand is not touched.
// Press Ctrl+C to stop it.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const PORTS = { 1: 3001 };
const number = process.argv[2];

if (!number || !(number in PORTS)) {
  console.error(`Usage: node tools/drill.mjs <number>   (available drills: ${Object.keys(PORTS).join(', ')})`);
  process.exit(1);
}
const folder = `drill-${number}`;
if (!existsSync(`${folder}/src/server.js`)) {
  console.error(`FAILED: ${folder}/src/server.js is missing. Run this from the project folder.`);
  process.exit(1);
}
try { process.loadEnvFile('.env'); } catch { /* no .env file: the settings may already be in the environment */ }
if (!process.env.DATABASE_URL) {
  console.error('FAILED: DATABASE_URL is not set. Make your .env file first: Copy-Item .env.example .env');
  process.exit(1);
}

const port = PORTS[number];
console.log(`Drill ${number}: Errand with one fault starts on http://127.0.0.1:${port}. Its code is in ${folder}/. Press Ctrl+C to stop.`);
const child = spawn(process.execPath, [`${folder}/src/server.js`], {
  stdio: 'inherit',
  env: { ...process.env, PORT: String(port) },
});
child.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => child.kill());
