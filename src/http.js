// src/http.js
// Small helpers for reading a request and writing an answer. Controllers use them.

/**
 * Read the request body as JSON.
 * @param {import('node:http').IncomingMessage} req
 * @returns {Promise<{ ok: true, value: unknown } | { ok: false, errors: string[] }>}
 */
export async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  if (text === '') return { ok: true, value: undefined };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, errors: ['body is not valid JSON'] };
  }
}

/**
 * @typedef {import('node:http').ServerResponse & {
 *   status: (code: number) => Res,
 *   json: (body: unknown) => Res,
 *   html: (text: string) => Res,
 * }} Res
 */

/**
 * Adds the small helpers that controllers use to answer: res.status(404).json(...), res.json(...), res.html(...).
 * Note that res.json sends every field of the object it is given.
 * @param {import('node:http').ServerResponse} raw
 * @returns {Res}
 */
export function addResponseHelpers(raw) {
  const res = /** @type {Res} */ (raw);
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => {
    const text = JSON.stringify(body);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Length', Buffer.byteLength(text));
    res.end(text);
    return res;
  };
  res.html = (text) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Length', Buffer.byteLength(text));
    res.end(text);
    return res;
  };
  return res;
}
