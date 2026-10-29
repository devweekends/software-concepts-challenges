# Challenge 1, part 1: add a field without leaking

Goal: give every task a priority (`low`, `normal` or `high`), carry it through every layer so it reaches the screen, prove with tests that nothing internal leaves, and find the line in a second copy of Errand that leaks a password hash.

This is the first real change you make to Errand. It has four parts: a migration, the five shapes, the guard tests, and a hunt.

## 101: words you need

| Word | Plain meaning |
|---|---|
| Shape | The same data with its own names, types and reader: request body, DTO, domain model, row, view model |
| Request body | What the browser sent. Text. Not trusted |
| DTO | The request body cut down to the fields Errand accepts. Here it comes from `fromCreateTaskRequest` |
| Domain model | What the rules use: real dates, a `done` flag, the owner |
| Row | What Postgres stores, with column names such as `due_at` |
| View model | What the browser gets, with only the fields the screen needs. Here it comes from `toTaskResponse` |
| Allow-list | A list of the fields that may pass. Anything not on it is refused or left out |
| Migration | A numbered SQL file that changes the database. A new change is a new number |
| `NOT NULL`, `DEFAULT`, `CHECK` | The column may never be empty, an old row gets a starting value, and the database refuses any other value |
| Over-posting | A sender writes a field they should not, like `ownerId`. The input side of the problem |
| Data exposure | Errand sends a field it should not, like `passwordHash`. The output side of the problem |
| Negative control | Breaking something on purpose to see the guard fire. A guard that never fired proves nothing |

## What you build

```
Browser --> request body --> DTO --> domain model --> row in tasks
                (priority high)  (allow-list)             |
Browser <-- view model <------------------------- domain model
```

The two places where a field enters and leaves are the two doors: the DTO and the view model.

## Steps

Run these in PowerShell, in the folder of your own copy. The services from challenge 0 must be up. On macOS and Linux the commands are the same. Each place to change has a comment that starts with `TODO(priority)`.

| # | Type this | What it does | Where in the code |
|---|---|---|---|
| 1 | Write `db/migrations/002_add_priority.sql`: one `ALTER TABLE` that adds `priority` as text, `NOT NULL`, default `'normal'`, with a `CHECK` for the three words | The rule lives in the table | new file |
| 2 | `node tools/migrate.mjs` | You see `applied 002_add_priority.sql` | [migrate.mjs#L27](../../../tools/migrate.mjs#L27) |
| 3 | `docker compose exec db psql -U errand -d errand -c "\d tasks"` | Shows the table. Look for a new last row and a `tasks_priority_check` line | none |
| 4 | `node --env-file=.env --test` | Two tests fail, because the code does not use the column yet. Read the first failure | [leak.test.js#L43](../../../test/leak.test.js#L43) |
| 5 | Put `{ "title": "Test", "priority": "high" }` in `task.json`, then `curl.exe -X POST -H "Content-Type: application/json" --data "@task.json" http://127.0.0.1:3000/tasks` | Answer: `400` with `{"errors":["unknown field: priority"]}`. The DTO does not list the field yet | [task-request.js#L7](../../../src/shapes/task-request.js#L7) |
| 6 | DTO: allow `priority`, default `'normal'`, refuse other words with `priority must be low, normal or high` | The field enters | [task-request.js#L7](../../../src/shapes/task-request.js#L7) and [task-request.js#L37](../../../src/shapes/task-request.js#L37) |
| 7 | Domain model: carry `priority` | The rules can see it | [task-model.js#L39](../../../src/shapes/task-model.js#L39) |
| 8 | Repository: add the column to the list, to the `INSERT`, and pass `dto.priority` | The SQL writes and reads it | [tasks.js#L8](../../../src/repositories/tasks.js#L8) and [tasks.js#L36](../../../src/repositories/tasks.js#L36) |
| 9 | View model: send `priority` | The field leaves | [task-response.js#L28](../../../src/shapes/task-response.js#L28) |
| 10 | HTML: show the priority next to the title | You see it on the page | [task-list.js#L15](../../../src/views/task-list.js#L15) |
| 11 | `node --env-file=.env --test` after each file | The number of failing tests goes down. When the given tests pass, go on | none |
| 12 | Write your two tests in `test/priority.test.js`, then delete the `{ todo: ... }` part of each | A task with no priority becomes `normal`. A priority of `urgent` gets a `400` | [priority.test.js#L29](../../../test/priority.test.js#L31) |
| 13 | Negative control: in `src/shapes/user-response.js`, add `passwordHash: user.passwordHash` to the returned object, run the tests, then delete the line | Two tests fail, and one message says `internal field passwordHash reached a response`. Without the line they pass | [user-response.js#L8](../../../src/shapes/user-response.js#L8) |
| 14 | `node tools/drill.mjs 1`, then open http://127.0.0.1:3001/profile | A second copy of Errand, with one fault, on port 3001. You see `passwordHash` in the profile | [drill.mjs](../../../tools/drill.mjs) |
| 15 | Find the one line in `drill-1/` that sends it. Write down how you found it | The fault write-up | `drill-1/src/` |
| 16 | `node --test challenges/challenge-1-add-a-field/part-1-priority/verify.mjs` | Checks the migration, the tests and your results | [verify.mjs](verify.mjs) |

Press Ctrl+C in the terminal that runs the drill when you are done.

## The hunt (steps 14 and 15)

Work like this. First write your guess about the cause on paper, before you open any file. Then open the code of the layer that builds the profile response. Read it from the route down, one step at a time. At each step ask two questions: what object leaves here, and what fields does it hold? Stop when you find the step where an object with `passwordHash` goes out without passing through a shape made for the browser. Note the time you started and stopped. Try for 15 minutes before you open a hint, and write down which hints you used.

When you find it, write one line, in this order: the symptom, your first hypothesis, the evidence, the cause, and the minutes you took. A good line names the evidence, not only the cause.

## Hints

1. Which layer builds the response for `GET /profile`? The root [README](../../../README.md) has a table of the layers. Open its folder in `drill-1/src`.
2. Open `drill-1/src/controllers/profile.js`. Read the last three lines. Look at what the controller passes to `sendJson`.
3. The line passes the object from the service to the response without a view model. Compare it with the profile controller in your own `src`, which calls `toUserResponse`. The difference is one function call.

If a step stalls: the migration prints `FAILED 002_add_priority.sql:` and the database's own message (read it, it names the problem); the tests cannot connect (run `node tools/check.mjs`, and check that you used `--env-file=.env`); the migration says `nothing to apply` but the column is missing (you edited `001`, or the new file has the wrong name); a test says the keys are wrong and `priority` is `undefined` (one layer forgot the field, so print the object at each step with `console.log`).

## Where each number comes from

| Number | Where it comes from |
|---|---|
| `low`, `normal`, `high` | Our choice. Three words are enough to see the rule in the DTO, in the table and on the page |
| `normal` as the default | An old task has no priority, so it must read as the middle one. `DEFAULT` in the table and the default in the DTO say the same thing |
| `400` | The HTTP status for "your request is wrong". The error body is `{ "errors": [...] }` |
| `201` | The status for "created". The leak test expects it from `POST /tasks` |
| 7 days | `leak.test.js` posts a due date seven days from now, built from the clock, so the test never goes stale. Errand refuses a due date in the past |
| 3001 | The port of the drill copy, set in `tools/drill.mjs`. Your own Errand keeps port 3000 |
| 15 minutes | How long to try before you open a hint |
| 2 failing tests | At step 4: the created task and the task list lack `priority`. At step 13: the profile keys test and the internal field test |

## Results

Fill in [results.md](results.md). Then commit the files by name:

```powershell
git add db/migrations/002_add_priority.sql src test challenges/challenge-1-add-a-field/part-1-priority/results.md
git commit -m "Challenge 1: add priority through every layer, with leak tests"
```
