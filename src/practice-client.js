// src/practice-client.js
// Calls the practice model API. This is a stand-in service, not a real paid one.

/**
 * @typedef {{ id: string, text: string, creditsCharged: number, creditsRemaining: number }} PracticeAnswer
 * @typedef {{ ok: true, answer: PracticeAnswer } | { ok: false, status: number, error: string, retryAfterSeconds: number | null }} PracticeResult
 */

/**
 * Asks for an answer and waits for it. Waiting takes 2 to 30 seconds.
 * @param {string} prompt
 * @returns {Promise<PracticeResult>}
 */
export async function generate(prompt) {
  const url = process.env.PRACTICE_API_URL;
  const key = process.env.PRACTICE_API_KEY;
  if (!url || !key) return { ok: false, status: 0, error: 'PRACTICE_API_URL or PRACTICE_API_KEY is not set', retryAfterSeconds: null };
  let response;
  try {
    response = await fetch(`${url}/v1/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(60000),
    });
  } catch (err) {
    return { ok: false, status: 0, error: `no answer from the practice API (${/** @type {Error} */ (err).message})`, retryAfterSeconds: null };
  }
  const body = await response.json().catch(() => ({}));
  if (response.ok) return { ok: true, answer: body };
  const retryAfter = Number(response.headers.get('retry-after'));
  return { ok: false, status: response.status, error: body.error ?? `status ${response.status}`, retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null };
}
