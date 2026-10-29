// src/server.js
// Starts Errand. The tests call startServer(0) to get any free port.
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { createRouter } from './router.js';
import { registerRoutes } from './routes.js';
import { closePool } from './db.js';

/**
 * @param {number} [port]  0 means any free port
 * @returns {Promise<{ server: http.Server, base: string }>}
 */
export async function startServer(port = Number(process.env.PORT ?? 3000)) {
  // Fail at once with a clear message, so a test run without settings does not hang.
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Node does not read .env by itself: run node --env-file=.env --test (or npm test)');
  }
  const router = createRouter();
  registerRoutes(router);
  const server = http.createServer((req, res) => { router.handle(req, res); });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(undefined));
  });

  // server.close() should leave nothing running: close idle connections and the database pool too.
  const close = server.close.bind(server);
  server.close = (callback) => { server.closeIdleConnections(); return close(callback); };
  server.on('close', () => { closePool(); });

  const address = /** @type {import('node:net').AddressInfo} */ (server.address());
  return { server, base: `http://127.0.0.1:${address.port}` };
}

// Run directly: node src/server.js (npm start)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.loadEnvFile('.env'); } catch { /* no .env file: the settings may already be in the environment */ }
  try {
    const { base } = await startServer();
    console.log(`Errand is listening on ${base}`);
  } catch (err) {
    if (/** @type {NodeJS.ErrnoException} */ (err).code === 'EADDRINUSE') {
      console.error(`Port ${process.env.PORT ?? 3000} is already in use by another program. Change PORT in .env and start again.`);
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}
