# Challenge 0, part 2: keep secrets out of Git

Goal: keep your `.env` file out of Git with a `.gitignore` line, then turn on a hook that stops a commit holding a key, and watch it work.

Your copy of this repository may be public. Your `.env` file holds a key. These two facts sit next to each other in one folder, and one careless command (`git add .`) joins them. The key in `.env` opens only the practice API on your own computer, so nothing is lost if it leaks. The habit is the point: the same two commands, on a real project with a real key, are how real keys reach the internet.

## 101: words you need

| Word | Plain meaning |
|---|---|
| Untracked | Git sees the file but has not recorded it yet |
| Staged | You told Git, with `git add`, that the file goes into the next commit |
| Commit | A snapshot of your files. Git keeps every snapshot, for ever |
| `.gitignore` | A list of names that Git never offers to record |
| Hook | A program that Git runs at a set moment. A `pre-commit` hook runs just before a commit is made, and if it fails, the commit stops |
| Secret | A key, a password or a token. Anyone who holds it can act as you |
| Rotate | Make a new key, use it, and cancel the old one. The only safe repair for a key that reached a public history |
| Regular expression | A short pattern for text. `pk_practice_[a-z0-9]{24}` means the prefix `pk_practice_` and then 24 lowercase letters or digits |

## What you build

```
  git add, git commit
        |
        v
  Guard 1: is the file in .gitignore?  --- yes --->  the file stays on your laptop
        | no
        v
  Guard 2: does the hook find a key or a .env file?  --- yes --->  the commit stops
        | no
        v
  the commit is made
```

Either guard alone is enough on a good day. Together they cover each other's gaps: a list helps only if the file is listed, and the hook looks at what is really staged.

## Steps

Run these in PowerShell, in the folder of your own copy. On macOS and Linux the commands are the same, except where the table says otherwise.

| # | Type this | What it does | Where in the code |
|---|---|---|---|
| 1 | `git status` | Shows `.env` as untracked. One `git add .` would record it, with the key inside | none |
| 2 | Add a line with `.env` to `.gitignore` in VS Code, then `git status` | The file is gone from the list. Only `.gitignore` shows as changed | [.gitignore](../../../.gitignore) |
| 3 | `git check-ignore -v .env` | Asks Git which rule ignores the file. You see `.gitignore:2:.env` and then `.env` | none |
| 4 | `node --test tools/secret-check.test.js` | Runs the four tests of the check. All four must pass | [secret-check.test.js](../../../tools/secret-check.test.js) |
| 5 | `git config core.hooksPath .githooks` | Points Git at the shared hook folder. Run it again in every new clone | [pre-commit#L2](../../../.githooks/pre-commit#L2) |
| 6 | `Set-Content notes.txt ("my key is pk_practice_" + "abcdefghijklmnopqrstuvwx")` (macOS and Linux: `echo "my key is pk_practice_""abcdefghijklmnopqrstuvwx" > notes.txt`) | Makes a file that holds something shaped like a key. The command joins the prefix and the 24 characters, so this README does not hold a whole key and the hook does not stop it | [secret-check.mjs#L7](../../../tools/secret-check.mjs#L7) |
| 7 | `git add notes.txt` then `git commit -m "add notes"` | The commit does not happen. The hook prints what it found | [secret-check.mjs#L11](../../../tools/secret-check.mjs#L11) |
| 8 | `git restore --staged notes.txt` then `Remove-Item notes.txt` | Unstage the file and delete it | none |
| 9 | `git add .gitignore challenges/challenge-0-run-errand/part-2-keep-secrets-out/results.md` then `git commit -m "Keep .env out of Git and stop commits that hold a key"` | A normal commit. The hook runs and finds nothing | none |
| 10 | `node --test challenges/challenge-0-run-errand/part-2-keep-secrets-out/verify.mjs` | Checks the ignore line, the hook setting and your results | [verify.mjs](verify.mjs) |

The key in step 6 is made up. It has the right shape but opens nothing.

On macOS and Linux a hook file also needs permission to run. If the hook does not seem to run, try `chmod +x .githooks/pre-commit`. On Windows the hook runs in the shell that comes with Git, and `node` must be found there, so open a new terminal after you install Node.

## Hints

1. After step 2, `git status` should list only `.gitignore`. If `.env` is still listed, check the spelling of the line you added.
2. If step 7 makes a commit, the hook is off. Run step 5 again and check with `git config core.hooksPath`.
3. If `.env` is in `.gitignore` but Git still lists it as changed, the file was committed once before. Run `git rm --cached .env`, commit that, and change the key, because the old commits still hold it.

## Where each number comes from

| Number | Where it comes from |
|---|---|
| `pk_practice_` and 24 characters | The shape of a practice API key. The pattern is on line 7 of `secret-check.mjs`. The example key in `.env.example` has this shape |
| 4 tests | `secret-check.test.js`: a staged key is found, a clean file passes, an empty `.env` is still blocked, `.env.example` is allowed |
| line 2 in `.gitignore:2:.env` | `.gitignore` starts with one line (`node_modules/`), so your `.env` line is the second |
| exit code 1 | A hook that exits with a non-zero number stops the commit |

## Results

Fill in [results.md](results.md). The blocked commit output is your proof that the guard works.
