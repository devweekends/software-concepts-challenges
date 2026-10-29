// tools/reset-credits.mjs
// Gives you back the 1,000 pretend credits of the practice model API.
// (The practice API is a stand-in, not a real paid service. No money is involved.)
try { process.loadEnvFile('.env'); } catch { /* no .env file: the settings may already be in the environment */ }

const url = process.env.PRACTICE_API_URL;
const key = process.env.PRACTICE_API_KEY;
if (!url || !key) {
  console.error('FAILED: PRACTICE_API_URL or PRACTICE_API_KEY is not set. Make your .env file first: Copy-Item .env.example .env');
  process.exit(1);
}

try {
  const response = await fetch(`${url}/admin/reset-credits`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(5000),
  });
  const body = await response.json();
  if (!response.ok) {
    console.error(`FAILED: the practice API answered ${response.status}: ${body.error}`);
    process.exit(1);
  }
  console.log(`credits reset: ${body.creditsRemaining} of ${body.quota}`);
} catch (err) {
  console.error(`FAILED: no answer from the practice API (${err.message}). Run: docker compose up -d`);
  process.exit(1);
}
