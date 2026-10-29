# Results: challenge 0, part 2

Fill this in after the hook has stopped a commit. Delete the lines in angle brackets.

## Git before and after the ignore line

Output of `git status --short` after you added `.env` to `.gitignore`:

```
<paste here>
```

Output of `git check-ignore -v .env`:

```
<paste here>
```

## The blocked commit

Output of `git commit -m "add notes"` while `notes.txt` held a made-up key:

```
<paste here>
```

## Questions

1. A developer commits `.env` on Monday, then adds it to `.gitignore` on Tuesday. Can someone read the key on Wednesday? Why? <answer>
2. Which kind of secret would the hook not find? <answer>
3. Why does every new clone need `git config core.hooksPath .githooks`? <answer>
