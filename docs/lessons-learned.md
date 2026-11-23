# Lessons learned

Things that surprised us while building and running SpecPilot, and what we changed because of them. Model and cost results are in [model-comparison.md](model-comparison.md) and [cost-report.md](cost-report.md).

## Full-stack issues: the spec review catches frontend gaps

### What happened

On issues that touch both the backend and the frontend, such as [#12 Due dates for todos](https://github.com/peter-85/to-do-app-node/issues/12) (schema, API, and the `public/index.html` list), the spec-reviewer agent found problems in the frontend part of the implementation. The backend part held up well against the spec.

The pipeline for these issues was:

1. `/write-spec` turns the issue into a spec with backend and frontend requirements.
2. `/implement-from-spec` implements it and adds tests.
3. The `spec-reviewer` agent checks the branch against the spec's acceptance criteria before a pull request is opened.

### Why the frontend is where the gaps are

- **Only the backend is covered by tests.** `/implement-from-spec` writes tests for the criteria "an API test can check". Frontend criteria, like "overdue todos get a distinct CSS class" or "the date input is cleared after a successful create", get a manual check instead. The implementer can run the tests and fix failures on the backend, but nothing fails when a frontend requirement is missed.
- **The implementer marks its own work.** Its report lists each criterion and the test that covers it. For frontend criteria there is no test to point to, so a criterion can be reported as done without evidence.
- **Frontend requirements have more small details.** One frontend requirement often has several parts (show the date, but only when there is one; mark overdue, but never when completed; clear the input, but only after success). Missing one part is easy and nothing shows it.
- **The reviewer starts fresh.** It reads the spec and the diff with no memory of the implementation, and checks every acceptance criterion one by one, asking for a test name or a file and line as evidence. A frontend criterion with no evidence stands out.

### What we take from it

- **Keep the spec review step for full-stack issues.** It is currently the only automated check on the frontend. Its cost is small next to a pull request that a human has to send back.
- **Write frontend acceptance criteria that can be checked in code.** "Overdue todos get the `overdue` class" can be verified from the diff; "overdue todos stand out" cannot.
- **Next step: frontend tests.** Adding a frontend test setup (for example, DOM tests for the todo list) would let the implementer catch these gaps itself, instead of relying on the reviewer.
