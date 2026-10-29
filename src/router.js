// src/router.js
// A small router. It matches a method and a URL path to a handler. It knows nothing else.
import { addResponseHelpers } from './http.js';

/**
 * @typedef {{ params: Record<string, string> }} RouteContext
 * @typedef {(req: import('node:http').IncomingMessage, res: import('./http.js').Res, ctx: RouteContext) => Promise<void> | void} Handler
 */

// A path such as /tasks/:id/done becomes a pattern with one named part, id.
function compile(path) {
  const names = [];
  const source = path.replace(/:([a-z]+)/g, (_, name) => { names.push(name); return '([^/]+)'; });
  return { pattern: new RegExp(`^${source}$`), names };
}

export function createRouter() {
  /** @type {{ method: string, pattern: RegExp, names: string[], handler: Handler }[]} */
  const routes = [];

  return {
    /** @param {string} method @param {string} path @param {Handler} handler */
    add(method, path, handler) {
      routes.push({ method, ...compile(path), handler });
    },

    /** @param {import('node:http').IncomingMessage} req @param {import('node:http').ServerResponse} rawRes */
    async handle(req, rawRes) {
      const res = addResponseHelpers(rawRes);
      const { pathname } = new URL(req.url ?? '/', 'http://localhost');
      let pathMatched = false;
      for (const route of routes) {
        const match = route.pattern.exec(pathname);
        if (!match) continue;
        pathMatched = true;
        if (route.method !== req.method) continue;
        const params = Object.fromEntries(route.names.map((name, i) => [name, decodeURIComponent(match[i + 1])]));
        try {
          await route.handler(req, res, { params });
        } catch (err) {
          console.error(err);
          if (!res.headersSent) res.status(500).json({ error: 'internal error' });
        }
        return;
      }
      res.status(pathMatched ? 405 : 404).json({ error: pathMatched ? 'method not allowed' : 'not found' });
    },
  };
}
