# Lessons learned

Things that surprised us while building and running SpecPilot, and what we changed because of them. Model and cost results are in [model-comparison.md](model-comparison.md) and [cost-report.md](cost-report.md).

## Open questions put a human in the loop before any code is written

### What happened

Every spec ends with an **Open questions** section: anything the issue left unclear, each with a proposed answer. The spec writer is told never to guess silently. This turned out to be one of the most useful parts of the pipeline.

`/revise-spec` turns those questions into a review step for a person:

1. It asks the user every open question, blocking ones first, offering the proposed answer as the default.
2. It applies each answer to the spec: it updates the **Requirements** and **Acceptance criteria**, adjusts **Files likely affected** and **Out of scope** if needed, and records the answer under **Decisions** with who decided and when.
3. If an answer raises a new decision (for example, choosing a full timestamp raises the question of time zones), it adds a new open question and asks it right away instead of deciding it alone.
4. The spec becomes `approved` only when no blocking question is left. `/implement-from-spec` refuses to start on a draft.

### Why it works

- **Gaps show up in the spec, not in the code.** An unclear point in an issue becomes a written question, not a hidden assumption the implementer makes and the reviewer finds later.
- **Answering is cheap.** Because each question comes with a proposed answer, the user mostly confirms or changes a default ("accept proposed") instead of designing from scratch.
- **The answers change the contract.** Requirements and acceptance criteria are rewritten to match each decision, so the implementer and the spec-reviewer both work from the agreed behavior.
- **Decisions are recorded.** The **Decisions** section shows what was decided, by whom, and why, which also helps when reviewing the pull request later.

### What we take from it

- **Keep "never guess silently" in the spec writer's instructions.** The value of the step depends on the writer raising questions instead of quietly choosing.
- **Always give a proposed answer.** Questions with a recommended default (as Opus wrote them, see [model-comparison.md](model-comparison.md)) are much faster to answer than a list of options.

## Full-stack issues: the spec review catches frontend gaps

### What happened

On [#7 Allow editing a todo's text and marking it incomplete again](https://github.com/peter-85/to-do-app-node/issues/7), which touches both the API (`PUT /todos/:id` accepting `task`, `dueDate` and `completed`) and the frontend (a Done ⇄ Undo toggle and inline editing of the task text), the spec-reviewer agent found a bug in the frontend part of the implementation.

The pipeline for this issue was:

1. `/write-spec` turns the issue into a spec with backend and frontend requirements.
2. `/implement-from-spec` implements it and adds tests.
3. The `spec-reviewer` agent checks the branch against the spec's acceptance criteria before a pull request is opened.

### Why the frontend is where the gaps are

- **Only the backend is covered by tests.** `/implement-from-spec` writes tests for the criteria "an API test can check". Frontend criteria, like "the Done button changes to Undo on a completed todo", get a manual check instead. The implementer can run the tests and fix failures on the backend, but nothing fails when a frontend requirement is missed.
- **The implementer marks its own work.** Its report lists each criterion and the test that covers it. For frontend criteria there is no test to point to, so a criterion can be reported as done without evidence.
- **Frontend requirements have more small details.** One frontend requirement often has several parts (toggle both ways, keep the edited text on save, show the error when empty text is rejected). Missing one part is easy and nothing shows it.
- **The reviewer starts fresh.** It reads the spec and the diff with no memory of the implementation, and checks every acceptance criterion one by one, asking for a test name or a file and line as evidence. A frontend criterion with no evidence stands out.

### What we take from it

- **Keep the spec review step for full-stack issues.** It is currently the only automated check on the frontend. Its cost is small next to a pull request that a human has to send back.
- **Write frontend acceptance criteria that can be checked in code.** "The button label is Undo when the todo is completed" can be verified from the diff; "the user can undo a todo" is harder to check.
- **Next step: frontend tests.** Adding a frontend test setup (for example, DOM tests for the todo list) would let the implementer catch these gaps itself, instead of relying on the reviewer.
