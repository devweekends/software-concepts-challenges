# Challenge 0, part 1: start Errand

Goal: start Errand with one command, pass the setup check, see the check fail on purpose, add a task, and save your proof.

The practice model API that starts with Errand is a stand-in. It is not a real paid service, and no money is involved.

## 101: words you need

| Word | Plain meaning |
|---|---|
| Container | An isolated program with its own files. It behaves the same on every laptop |
| Image | The recipe a container starts from. Docker downloads an image once and keeps it |
| Docker Compose | A tool that starts several containers from one file, `docker-compose.yml` |
| Detached (`-d`) | The containers keep running in the background and give your terminal back |
| Postgres | The database. It runs in a container and keeps the users and the tasks |
| Port | A numbered door on your computer. Errand uses 3000, the practice API 4010, Postgres 5432 |
| `127.0.0.1` | "This computer". Nobody on your Wi-Fi can reach a service that listens only here |
| `.env` | A file of settings and secrets for your own copy. Never commit it |
| Migration | A numbered SQL file that changes the database. The tool remembers which ones have run |
| API | A program that other programs call. Errand has one, and it calls another |
| JSON | Text that holds data, like `{ "title": "Pay rent" }` |
| `curl.exe` | A tool that sends a request from the terminal. On Windows write `.exe`, because plain `curl` in PowerShell is a different command |
| Exit code | A number a program gives when it ends. 0 means it worked. The setup check gives 0 only when every line passes |

## What you build

```
  You (browser or curl.exe)
        |
        v
  Errand, port 3000  ------------>  Postgres, port 5432     (users and tasks)
        |
        +----------------------->  Practice model API, port 4010   (Generate)
```

Postgres and the practice API run in Docker. Errand runs on your own laptop, so you can edit it and watch it change. You never talk to Postgres or the practice API directly: only Errand does.

## Steps

Run these in PowerShell, in the folder of your own copy. On macOS and Linux the commands are the same, except where the table says otherwise. The line links show where in the code each step works.

| # | Type this | What it does | Where in the code |
|---|---|---|---|
| 1 | `npm install` | Downloads the one package Errand needs for Postgres | [package.json#L7](../../../package.json#L7) |
| 2 | `Copy-Item .env.example .env` (macOS and Linux: `cp .env.example .env`) | Makes your own settings file | [.env.example#L1](../../../.env.example#L1) |
| 3 | `docker compose up -d` | Starts Postgres and the practice API. The first time Docker downloads and builds, which is the slow part | [docker-compose.yml#L1](../../../docker-compose.yml#L1) |
| 4 | `node tools/migrate.mjs` | Waits up to 20 seconds for Postgres, then creates the tables. You see `applied 001_create_tasks.sql` | [migrate.mjs#L22](../../../tools/migrate.mjs#L22) and [001_create_tasks.sql](../../../db/migrations/001_create_tasks.sql) |
| 5 | `node tools/check.mjs` | One line per check. You want `PASS` on every line and `RESULT: all checks passed` | [check.mjs#L30](../../../tools/check.mjs#L30) to [check.mjs#L102](../../../tools/check.mjs#L102) |
| 6 | `Rename-Item .env .env.off` then `node tools/check.mjs` | The check must fail. The first `FAIL` line is `env-file-missing` and it holds the fix | [check.mjs#L40](../../../tools/check.mjs#L40) |
| 7 | `Rename-Item .env.off .env` then `node tools/check.mjs` | Undo it. Every line passes again | none |
| 8 | `npm start` | Starts Errand. It prints the address it listens on | [server.js#L13](../../../src/server.js#L13) |
| 9 | Open http://127.0.0.1:3000 | The task list and the form. Add a task with a due date after today | [task-list.js#L24](../../../src/views/task-list.js#L24) |
| 10 | Create `task.json` in VS Code (not with a PowerShell command), then `curl.exe -X POST -H "Content-Type: application/json" --data "@task.json" http://127.0.0.1:3000/tasks` | Adds a task the way a program would. The answer is the new task, with status `201` | [tasks.js#L41](../../../src/controllers/tasks.js#L41) |
| 11 | `curl.exe http://127.0.0.1:3000/tasks` | Lists the tasks as JSON | [tasks.js#L27](../../../src/controllers/tasks.js#L27) |
| 12 | `node --test challenges/challenge-0-run-errand/part-1-start-errand/verify.mjs` | Checks that `results.md` holds your proof | [verify.mjs](verify.mjs) |

`task.json` holds this text. Replace `YYYY-MM-DD` with a day after today, written as year, month and day. Errand refuses a due date in the past.

```json
{ "title": "Pay the electricity bill", "due": "YYYY-MM-DD" }
```

You can also press **Generate** on a task. It calls the practice API, takes 2 to 30 seconds, and spends 40 of your 1,000 pretend credits. The page waits the whole time, and module 4 is about why that is a poor design. `node tools/reset-credits.mjs` gives the credits back.

## Hints

1. Read the first `FAIL` line of `node tools/check.mjs`. Its name says which check failed.
2. The table "If something is wrong" in the root [README](../../../README.md) maps each name to its fix.
3. Run the fix, then run the check again. Every command here is safe to run twice.

## Where each number comes from

| Number | Where it comes from |
|---|---|
| 3000 | Errand's port. `PORT` in `.env` |
| 4010 | The practice API's port, set in `docker-compose.yml` |
| 5432 | Postgres' port inside its container. On your computer it is `ERRAND_DB_PORT` in `.env` (5432 unless you change it) |
| 20 seconds | `migrate.mjs` tries 20 times, one second apart, because Postgres needs a few seconds to start |
| 3 seconds | The check waits at most 3 seconds for the database and for the practice API |
| 114.5 MiB | The compressed size of the `postgres:18-alpine` download, measured on 29 October 2026 |
| 59.6 MiB | The compressed size of `node:24-alpine`, the base of the practice API |
| 40 credits, 1,000 a day | The practice API's pretend prices. They are our choice, and no money is involved |
| 2 to 30 seconds | How long the practice API takes to answer. Set `PRACTICE_MIN_DELAY_MS` and `PRACTICE_MAX_DELAY_MS` to change it |
| `201` | The HTTP status for "created". `POST /tasks` answers it |

## Results

Fill in [results.md](results.md). Commit only that file, by name. Do not use `git add .`: it would also add your `.env` file, which holds the key. Part 2 shows how to stop yourself doing that by accident.

```powershell
git add challenges/challenge-0-run-errand/part-1-start-errand/results.md
git commit -m "Challenge 0 part 1: Errand runs and the check passes"
```
