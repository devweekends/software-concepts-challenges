# Practice model API

**This is a practice stand-in. It is not a real paid service.** No money is involved, and it does not run a real model. It only behaves like one in the ways that cause trouble for programs: it charges, it is slow, it says no, and it never gives the same answer twice. Errand calls it so you can learn to handle those problems.

It runs in Docker on your own computer, on port 4010, and only your computer can reach it (`127.0.0.1`). It is built from `node:24-alpine` and has no packages to install.

## Size

| What | Size |
|---|---|
| `node:24-alpine` base image, compressed download | about 60 MiB (59.6 MiB measured on 29 October 2026) |
| This service on top of it (`server.js` and `package.json`) | about 38 KB |
| Image on disk after the build | about 244 MB |

Compose builds the image the first time you run `docker compose up -d`. If you already have `node:24-alpine`, only the 38 KB are new.

## What it does

| Behaviour | How it works |
|---|---|
| Pretend credits | Every call costs 40 credits. The daily quota is 1,000 credits, so 25 calls. |
| The quota comes back | Every day at 00:00 UTC, or at once with `node tools/reset-credits.mjs` |
| Slow answers | Each answer takes 2 to 30 seconds. Set `PRACTICE_MIN_DELAY_MS` and `PRACTICE_MAX_DELAY_MS` (in `.env`) to shorten it for tests |
| A different answer each time | The text holds a random part, so two calls never match |
| No credits left | `429 Too Many Requests` with a `Retry-After` header (seconds until the quota comes back) |
| `Idempotency-Key` header | The same key and the same prompt give the same answer, charged once. The replay has the header `Idempotency-Replayed: true`. The same key with another prompt gives `422`. A call with the same key that is still running gives `409`. A `429` is not remembered against the key, so a retry with the same key can work later |
| Charged when accepted | The credits are taken when the call is accepted, not when the answer is ready. A caller that gives up has still paid |
| Keys have a mode | A key belongs to test mode or live mode. The server runs in one mode (`PRACTICE_MODE`, default `test`). A key from the other mode gets `401` with `key is for test mode` or `key is for live mode` |
| `/version` | Needs no key. Says the name, version and mode |

Not built yet (module 4 builds them): signed webhooks and the delivery log. `POST /v1/jobs` answers `501`, and `GET /deliveries` answers an empty list, both with a note that says module 4.

## Calls

All calls except `/version` and `/deliveries` need the header `Authorization: Bearer <your key>`. The key is `PRACTICE_API_KEY` in your `.env`. It opens only this stand-in on your own computer, but treat it like a real key anyway (chapter 1.8).

| Call | Answer |
|---|---|
| `GET /version` | `{"name":"practice-model-api","version":"1.0.0","mode":"test","costPerCall":40,"note":"..."}` |
| `POST /v1/generate` with `{"prompt":"..."}` | `200` with `id`, `text`, `creditsCharged`, `creditsRemaining`, `mode` after 2 to 30 seconds |
| `GET /credits` | `creditsRemaining`, `quota`, `costPerCall`, `resetsInSeconds` |
| `POST /admin/reset-credits` | Gives the quota back (this is what `tools/reset-credits.mjs` calls) |
| `POST /v1/jobs` | `501`, a stub for module 4 |
| `GET /deliveries` | An empty list, a stub for module 4 |

## Settings

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `4010` | Port inside the container |
| `PRACTICE_TEST_KEY` | none | The key of test mode. Compose sets it from `PRACTICE_API_KEY` in your `.env` |
| `PRACTICE_LIVE_KEY` | none | A key for live mode, if you want to try the mode check |
| `PRACTICE_MODE` | `test` | The mode the server runs in: `test` or `live` |
| `PRACTICE_QUOTA` | `1000` | Credits per day |
| `PRACTICE_MIN_DELAY_MS` | `2000` | Shortest answer time |
| `PRACTICE_MAX_DELAY_MS` | `30000` | Longest answer time |
| `PRACTICE_RETRY_AFTER_SECONDS` | seconds until 00:00 UTC | A fixed `Retry-After` |

The credits live in the memory of the container. If you restart the container, you get the full quota back.

## Tests

The tests start the server on any free port with short delays. They need no Docker and no database.

```
node --test practice-api/test/practice-api.test.js
```
