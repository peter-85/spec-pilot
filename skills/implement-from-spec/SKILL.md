# Implement an approved spec

The argument is the issue number (e.g. `12`). If none is given, ask for it.

## Before starting

1. **Read the spec** at `specs/issue-<number>.md`. If it doesn't exist, stop and say so.
2. **Check the status.** If it is not `Status: approved`, or any blocking open question remains, stop and tell the user to run /revise-spec first. Never implement a draft spec.
3. **Check git.** The working tree must be clean (`git status`). If it isn't, stop and ask.
4. **Create a branch** from the latest main: `git checkout main`, `git pull`, then `git checkout -b specpilot/issue-<number>`.

## Plan

5. Read the code in "Files likely affected", using Grep/Glob first and reading only what you need. CLAUDE.md is already in context; don't re-read it.
6. Write a short plan: the change per file, and which test covers each acceptance criterion. Show it to the user and wait for approval before editing.

## Implement

7. Make the changes. Follow the project's conventions and the spec's Decisions exactly.
8. Add tests for the new behavior, in the existing test setup. Cover the acceptance criteria that an API test can check; one test may cover several related criteria, and criteria already covered by an existing test need no new one. Don't add tests for things the spec didn't change. Criteria that can't be tested automatically (e.g. how the frontend looks) get a short manual check instead.
9. Run the full test suite. Fix failures until everything passes. If a test still fails after three attempts, stop and explain the problem instead of guessing.

## Finish

10. Commit with a clear message, e.g. `feat: due dates for todos (#<number>)`. Small focused commits are fine.
11. Report back:
    - each acceptance criterion and the test that covers it
    - anything from the spec you could not do, or did differently, and why
    - the test results

## Rules

- Build only what the spec asks for. Nothing from "Out of scope".
- Never change the spec to match the code. If the spec turns out to be wrong or incomplete, stop and tell the user.
- Never delete or weaken existing tests to make them pass.
- Never push, merge, or open a pull request. The user does that after review.
- Never commit secrets or `.env` files.
