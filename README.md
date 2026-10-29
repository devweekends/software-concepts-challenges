# Software concepts challenges

These are the hands-on challenges for the course Software Engineering Concepts, Hands On. You work on one small app called **Errand**. It is a task app: you add a task, Errand saves it, and later it asks a model API to work on it. You run it on your own laptop, change it, break it, and read what happens.

You do not need a cloud account. You do not need to pay for anything. The database and the model API both run in Docker on your laptop.

This repository is a template. Copy it to your own GitHub account first (the green **Use this template** button), then clone your copy.

## What you need

| Tool | Version | Why |
|---|---|---|
| Node.js | 24 (LTS) | Runs Errand and the helper tools |
| Docker Desktop | a recent version | Runs Postgres and the practice model API |
| Git | any recent version | Your history, and the hook that stops a secret leaving |
| VS Code | any | Where you edit files. Use it to save `task.json` (see challenge 0) |

Download sizes: Postgres 18 (alpine) is about 115 MiB (114.5 MiB compressed). The practice model API is built on `node:24-alpine`, which is about 60 MiB (59.6 MiB compressed) if you do not have it yet. Our own part is about 38 KB. Start the downloads on Wi-Fi.

## Start Errand

Open a terminal in your copy of this repository. **On Windows, use PowerShell.**

| Step | Windows (PowerShell) | macOS and Linux |
|---|---|---|
| 1 | `npm install` | `npm install` |
| 2 | `Copy-Item .env.example .env` | `cp .env.example .env` |
| 3 | `docker compose up -d` | `docker compose up -d` |
| 4 | `node tools/migrate.mjs` | `node tools/migrate.mjs` |
| 5 | `node tools/check.mjs` | `node tools/check.mjs` |
| 6 | `npm start`, then open http://127.0.0.1:3000 | the same |

Use `127.0.0.1` everywhere, not `localhost`, so every command and every page uses the same address.

## Challenges

| # | Folder | Parts | You will |
|---|---|---|---|
| 0 | `challenges/challenge-0-run-errand` | 1 start Errand, 2 keep secrets out | Start Errand with checks that name what is wrong, add a task, then stop a key from reaching Git |
| 1 | `challenges/challenge-1-add-a-field` | 1 priority | Add a field through every layer with a numbered migration, prove with a test that nothing internal leaks, then find the line that leaked a password hash |

More challenges are added as the course goes on. Errand grows with them: a log, fakes, a background worker, sign-in, search.

Challenges 0 and 1 are **guided**: every command is typed by you, one at a time, and every line is explained.

Each part is a folder with the same files:

| File | What it is |
|---|---|
| `README.md` | Words to know, what you build, the steps, and where each number comes from |
| `results.md` | Your own output. You fill this in and commit it |
| `verify.mjs` | A check for your part. It says `PASS` or `FAIL` for each point. When a point fails, read its message |

Run the check of a part like this:

```
node challenges/challenge-0-run-errand/part-1-start-errand/verify.mjs
```

## The layers of Errand

Errand is plain JavaScript with a small router and no framework, so each layer is easy to see. A request goes down through these folders, and the answer comes back up.

| Folder | Layer | Its one job |
|---|---|---|
| `src/routes.js` | Route | Match the URL and method to a controller |
| `src/controllers/` | Controller | Read the request, call the service, send the answer |
| `src/services/` | Service | The rules (a due date may not be in the past) |
| `src/repositories/` | Repository | All the SQL |
| `src/shapes/` | Shapes | Functions that change one shape of the data into the next: request body, DTO, domain model, row and view model |
| `src/views/` | View | The HTML page |

## If something is wrong

Run the setup checker:

```
node tools/check.mjs
```

It prints one line per check. Read the first `FAIL` line. The word after `FAIL` is the name of the problem, and the rest of the line is the fix.

| Name | Meaning |
|---|---|
| `docker-not-running` | Docker Desktop is not running. Start it and wait until it says it is running |
| `env-file-missing` | There is no `.env` file. Copy `.env.example` to `.env` |
| `node-too-old` | Node is older than 24. Install Node 24 LTS |
| `crlf-line-endings` | A file the tools read has Windows line endings. Re-save it with LF |
| `image-pull-failed` | The Postgres image did not arrive. Run `docker compose pull`, then `docker compose up -d` |
| `db-port-in-use` | Another program, often another Postgres, answers on your database port. Set `ERRAND_DB_PORT` and the port in `DATABASE_URL` in `.env` to a free port such as 5433, then run `docker compose up -d` |

Other failures use the name of the check (`database`, `migrations`, `practice-api`). They are the ones you learn to track down yourself in the next challenges.

## If you are stuck on a challenge

You can rebuild Errand as it is at the end of an earlier challenge and keep going:

```
node tools/restore.mjs --list
node tools/restore.mjs 0
```

`restore 0` makes `.env` if it is missing (it never replaces yours), adds `.env` to `.gitignore`, turns the hook on, starts Docker and applies the migrations. `restore 1` does the same and then puts the answers for challenge 1 over the files you edited. It saves your own versions in `restore-backup/` first. The answers for challenge 1 are not in this repository: your mentor gives you the folder, and you point to it with `ERRAND_SOLUTION_DIR`. Read the answers after you have tried, not before. If you used a restore, say so in your write-up.

## Ports

| Port | What | Set in |
|---|---|---|
| 3000 | Errand | `PORT` in `.env` |
| 3001 | Errand with a fault, for the drill in challenge 1 | `tools/drill.mjs` |
| 4010 | The practice model API | `docker-compose.yml` |
| 5432 | Postgres, on your computer only (`127.0.0.1`) | `ERRAND_DB_PORT` in `.env` |

If another program already uses 5432 (for example another Postgres), set `ERRAND_DB_PORT` to another number, such as 5433, **and** write the same number in `DATABASE_URL`. Both lines are in `.env`. If port 3000 is busy, change `PORT` the same way.

## The practice model API

Errand calls a model API when you press **Generate**. The one in this repository is a practice stand-in. It is not a real paid service, and no money is involved. It charges pretend credits (40 a call, 1,000 a day), answers after 2 to 30 seconds, and says no in the ways a real one does. Read `practice-api/README.md` for what it does, its size and its settings. `node tools/reset-credits.mjs` gives you the 1,000 credits back.

## Secrets and Git

`.env` holds a key for the practice API. The key opens only the stand-in on your own computer, so nothing is lost if it leaks. The habit is the point.

**The `.gitignore` in this template does not list `.env` yet.** You add it yourself in challenge 0, part 2. Until then, commit files by name and never run `git add .`.

Challenge 0, part 2 also turns on a pre-commit hook. The hook is the file `.githooks/pre-commit`. It runs `tools/secret-check.mjs` and stops a commit that holds a `.env` file or a practice key. Git reads hooks from `.git/hooks` by default, so you point it at the shared folder once in each clone:

```
git config core.hooksPath .githooks
```

On macOS and Linux, the hook file also needs permission to run: `chmod +x .githooks/pre-commit`.

## Tests

| Command | What it runs |
|---|---|
| `node --env-file=.env --test` | Every test: the shapes, the leak tests, your priority tests, the secret check and the practice API. The leak and priority tests need Postgres |
| `node --test tools/secret-check.test.js` | The secret check alone |
| `node --test practice-api/test/practice-api.test.js` | The practice API alone. It needs no Docker |

Node does not read `.env` by itself. That is why the command has `--env-file=.env`.

The tests build their dates from the clock, so they do not go stale.

## What is in each folder

| Folder | Contents |
|---|---|
| `src/` | Errand |
| `db/migrations/` | Numbered SQL files. `node tools/migrate.mjs` applies the ones that have not run yet |
| `test/` | The tests of Errand |
| `tools/` | The setup check (`check.mjs`), the migration tool, the secret check and its test, the fault drill (`drill.mjs`), the restore tool and `reset-credits.mjs` |
| `drill-1/` | A second copy of Errand with one fault, for challenge 1 |
| `practice-api/` | The practice model API and its `Dockerfile` |
| `.githooks/` | The pre-commit hook |
| `challenges/` | One folder per challenge, one subfolder per part |

## Line endings

Windows saves a new line as two characters. Linux wants one. A file with the Windows kind can stop Postgres, Docker or the hook with strange errors. This repository has a `.gitattributes` and an `.editorconfig` that keep files in the Linux kind. If a file still has the Windows kind, `node tools/check.mjs` names it (`crlf-line-endings`) and prints the fix.
