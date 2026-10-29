// practice-api/server.js
// The practice model API: a stand-in for a paid model service. It is NOT a real service.
// It charges pretend credits, answers slowly, and says no in the ways a real service does.
// No packages: only Node's own modules, so the Docker image stays small.
import http from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const VERSION = '1.0.0';
const COST_PER_CALL = 40;
const MAX_BODY_BYTES = 64 * 1024;

const OPENERS = ['Here is a short answer', 'Short answer', 'Quick reply', 'In brief'];
const MIDDLES = [
  'the plan has three small steps and one risk',
  'start with the part that is easiest to test',
  'the main idea fits in two sentences',
  'check the input first, then the rules, then the output',
  'two of the facts agree and one needs a second look',
  'the result depends on what you send in, so send less',
];

const dayNumber = (ms) => Math.floor(ms / 86400000);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

/**
 * Build the server. Options exist so tests can use short delays and any port.
 * @param {object} [options]
 * @param {string} [options.mode]          'test' or 'live'. The mode the server runs in.
 * @param {string} [options.testKey]       The key that belongs to test mode.
 * @param {string} [options.liveKey]       The key that belongs to live mode.
 * @param {number} [options.quota]         Credits per day.
 * @param {number} [options.minDelayMs]    Shortest answer time.
 * @param {number} [options.maxDelayMs]    Longest answer time.
 * @param {number} [options.retryAfterSeconds] Fixed Retry-After. Default: seconds until the daily reset.
 */
export function createPracticeServer(options = {}) {
  const mode = options.mode ?? 'test';
  const testKey = options.testKey ?? '';
  const liveKey = options.liveKey ?? '';
  const quota = options.quota ?? 1000;
  const minDelayMs = options.minDelayMs ?? 2000;
  const maxDelayMs = Math.max(options.maxDelayMs ?? 30000, minDelayMs);

  let credits = quota;
  let creditsDay = dayNumber(Date.now());
  /** @type {Map<string, {fingerprint: string, state: 'running'|'done', status?: number, body?: object}>} */
  const idempotency = new Map();
  let answerCount = 0;

  // The quota comes back every day at 00:00 UTC.
  function refreshQuota() {
    const today = dayNumber(Date.now());
    if (today !== creditsDay) { creditsDay = today; credits = quota; }
  }
  const secondsUntilReset = () => Math.max(1, Math.ceil(((creditsDay + 1) * 86400000 - Date.now()) / 1000));

  function send(res, status, body, headers = {}) {
    const text = JSON.stringify(body);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(text), ...headers });
    res.end(text);
  }

  // Returns null when the key is fine, or an error text for a 401.
  function checkKey(req) {
    const header = req.headers.authorization ?? '';
    const key = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (key === '') return 'missing key: send the header Authorization: Bearer <key>';
    let keyMode = null;
    if (testKey !== '' && key === testKey) keyMode = 'test';
    else if (liveKey !== '' && key === liveKey) keyMode = 'live';
    if (keyMode === null) return 'invalid key';
    if (keyMode !== mode) return `key is for ${keyMode} mode`;
    return null;
  }

  async function readJson(req) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) return { ok: false, error: 'body is too large' };
      chunks.push(chunk);
    }
    try { return { ok: true, value: JSON.parse(Buffer.concat(chunks).toString('utf8')) }; }
    catch { return { ok: false, error: 'body is not valid JSON' }; }
  }

  function makeAnswer(prompt) {
    answerCount++;
    const nonce = randomBytes(3).toString('hex');
    const shown = prompt.length > 60 ? `${prompt.slice(0, 57)}...` : prompt;
    return `${pick(OPENERS)} for "${shown}": ${pick(MIDDLES)}. (practice answer ${nonce})`;
  }

  async function generate(req, res) {
    const keyError = checkKey(req);
    if (keyError) return send(res, 401, { error: keyError });
    const body = await readJson(req);
    if (!body.ok) return send(res, 400, { error: body.error });
    const prompt = body.value?.prompt;
    if (typeof prompt !== 'string' || prompt.trim() === '') return send(res, 400, { error: 'prompt must be non-empty text' });

    const idemKey = req.headers['idempotency-key'];
    const fingerprint = createHash('sha256').update(prompt).digest('hex');
    if (idemKey) {
      const seen = idempotency.get(idemKey);
      if (seen) {
        if (seen.fingerprint !== fingerprint) return send(res, 422, { error: 'this Idempotency-Key was already used with a different prompt' });
        if (seen.state === 'running') return send(res, 409, { error: 'a call with this Idempotency-Key is still running' });
        return send(res, seen.status, seen.body, { 'Idempotency-Replayed': 'true' });
      }
    }

    refreshQuota();
    if (credits < COST_PER_CALL) {
      // A 429 is not stored against the key, so a retry with the same key can succeed after the reset.
      const wait = options.retryAfterSeconds ?? secondsUntilReset();
      return send(res, 429, { error: 'no credits left today', creditsRemaining: credits, retryAfterSeconds: wait }, { 'Retry-After': String(wait) });
    }

    // The credits are taken when the call is accepted, not when the answer is ready.
    // A caller that stops waiting has still paid.
    credits -= COST_PER_CALL;
    const remainingAfterCharge = credits;
    if (idemKey) idempotency.set(idemKey, { fingerprint, state: 'running' });

    const delay = minDelayMs + Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1));
    await new Promise((resolve) => setTimeout(resolve, delay));

    const answer = {
      id: `gen_${randomBytes(6).toString('hex')}`,
      text: makeAnswer(prompt),
      creditsCharged: COST_PER_CALL,
      creditsRemaining: remainingAfterCharge,
      mode,
    };
    if (idemKey) idempotency.set(idemKey, { fingerprint, state: 'done', status: 200, body: answer });
    if (!res.destroyed) send(res, 200, answer);
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const route = `${req.method} ${url.pathname}`;

      if (route === 'GET /version') {
        return send(res, 200, {
          name: 'practice-model-api',
          version: VERSION,
          mode,
          costPerCall: COST_PER_CALL,
          note: 'A practice stand-in. Not a real paid service.',
        });
      }
      if (route === 'POST /v1/generate') return await generate(req, res);
      if (route === 'GET /credits') {
        const keyError = checkKey(req);
        if (keyError) return send(res, 401, { error: keyError });
        refreshQuota();
        return send(res, 200, { creditsRemaining: credits, quota, costPerCall: COST_PER_CALL, resetsInSeconds: secondsUntilReset() });
      }
      if (route === 'POST /admin/reset-credits') {
        const keyError = checkKey(req);
        if (keyError) return send(res, 401, { error: keyError });
        credits = quota;
        creditsDay = dayNumber(Date.now());
        return send(res, 200, { creditsRemaining: credits, quota });
      }
      // Stubs. Module 4 builds the real behaviour.
      if (route === 'POST /v1/jobs') {
        return send(res, 501, { error: 'not built yet: background jobs and signed webhooks arrive in module 4' });
      }
      if (route === 'GET /deliveries') {
        return send(res, 200, { deliveries: [], note: 'stub: the delivery log arrives in module 4' });
      }
      return send(res, 404, { error: 'not found' });
    } catch (err) {
      console.error(err);
      if (!res.headersSent) send(res, 500, { error: 'internal error' });
    }
  });

  return { server, answerCount: () => answerCount };
}

// Run it directly: node server.js
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 4010);
  const host = process.env.HOST ?? '127.0.0.1';
  const { server } = createPracticeServer({
    mode: process.env.PRACTICE_MODE ?? 'test',
    testKey: process.env.PRACTICE_TEST_KEY ?? '',
    liveKey: process.env.PRACTICE_LIVE_KEY ?? '',
    quota: Number(process.env.PRACTICE_QUOTA ?? 1000),
    minDelayMs: Number(process.env.PRACTICE_MIN_DELAY_MS ?? 2000),
    maxDelayMs: Number(process.env.PRACTICE_MAX_DELAY_MS ?? 30000),
    retryAfterSeconds: process.env.PRACTICE_RETRY_AFTER_SECONDS ? Number(process.env.PRACTICE_RETRY_AFTER_SECONDS) : undefined,
  });
  // Docker stops a container with SIGTERM. Without this line, Node as process 1 would ignore it.
  process.on('SIGTERM', () => process.exit(0));
  server.listen(port, host, () => console.log(`practice model API (a stand-in, not a real service) on ${host}:${port}, mode ${process.env.PRACTICE_MODE ?? 'test'}`));
}
