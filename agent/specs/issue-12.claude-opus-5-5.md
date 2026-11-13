# Spec: #12 Due dates for todos

## Goal

Let users set an optional due date when creating a todo, and make overdue todos (due date passed, not completed) stand out in the frontend list. Existing todos without a due date keep working unchanged.

## Requirements

- R1. Add a nullable due date field (proposed name `dueDate`) to the `Todo` model in `src/prisma/contract.prisma`. It has no default, so existing rows get NULL. The column type is still undecided (see open questions); the working assumption is a date-only value.
- R2. Run `npm run contract:emit` to regenerate `src/prisma/contract.json` and `src/prisma/contract.d.ts`, and commit them with the contract change. Plan or apply the schema change with the Prisma CLI so that `migrations/` stays consistent, following the project's existing workflow.
- R3. `POST /todos` accepts an optional `dueDate` in the body next to `task`. If `dueDate` is missing, `null`, or an empty string, store NULL. Otherwise it must be a valid calendar date as an ISO 8601 `YYYY-MM-DD` string, and that date is stored.
- R4. If `POST /todos` gets a `dueDate` that is present but invalid (wrong format, or an impossible date such as `2025-02-30`), it returns 400 and does not create a todo. The exact error body is an open question.
- R5. The `POST /todos` success response is unchanged (status 200, returns the created row), and the row includes `dueDate`.
- R6. `GET /todos` returns `dueDate` for every todo: `null` when none is set, otherwise the date in one consistent serialised format, so the frontend can read it without timezone shifts.
- R7. Every todo query stays scoped by `userId: req.userId`. The new field must not create any path that reads or writes another user's todos.
- R8. `PUT /todos/:id` ignores `dueDate` in the request body and never changes the stored due date. Its behaviour for `completed` is unchanged.
- R9. `POST /auth/register` still creates the default first todo, with `dueDate` NULL, inside the same transaction.
- R10. The create-todo form in `public/index.html` gets an optional date input (`<input type="date">`). Submitting with the date empty creates a todo with no due date. Submitting with a date sends it as `dueDate` in `YYYY-MM-DD` format.
- R11. In the todo list, any todo that has a due date shows that date. Todos without a due date show no date and no placeholder error.
- R12. A todo counts as overdue when it has a due date, is not completed, and the due date is before today's date in the browser's local timezone. A todo due today is not overdue (open question). Overdue todos get a distinct CSS class (e.g. `overdue`), styled in `public/styles.css` so they are visually distinct (for example, a red date or a coloured accent).
- R13. Overdue styling updates on the client without a page reload when a todo's completed state changes. Completing an overdue todo removes the overdue styling, and un-completing it brings the styling back.
- R14. The README API table is updated: the `POST /todos` body is `{ task, dueDate? }`, with a note on the `dueDate` format and the 400 response.

## Acceptance criteria

- `npx prisma db update --dry-run` against a database with the old schema shows only the addition of a nullable due date column on the Todo table. Applying it keeps all existing rows, with NULL due dates.
- `contract.json` and `contract.d.ts` match the result of `npm run contract:emit`: running it again produces no diff.
- `POST /todos` with `{ task: "x" }` returns 200 and a row with `dueDate: null`.
- `POST /todos` with `{ task: "x", dueDate: "2030-01-15" }` returns 200. A later `GET /todos` returns that todo with a due date representing 2030-01-15, with no off-by-one-day shift.
- `POST /todos` with `dueDate: "not-a-date"` or `dueDate: "2025-02-30"` returns 400, and no todo is created: the `GET /todos` count is unchanged.
- `PUT /todos/:id` with `{ completed: 1, dueDate: "2030-01-01" }` updates `completed` and leaves `dueDate` unchanged.
- `PUT` or `DELETE` on another user's todo still returns 404, and `GET /todos` still returns only the caller's todos.
- `POST /auth/register` still returns 201 and creates the default todo with `dueDate: null`.
- Frontend, checked manually because the project has no test suite: a todo created with yesterday's date and not completed shows the overdue styling. The same todo marked complete loses it. Todos due today, due in the future, or with no due date never show it.
- Todos created before this change still display and can be completed and deleted in the frontend.

## Files likely affected

- src/prisma/contract.prisma
- src/prisma/contract.json
- src/prisma/contract.d.ts
- migrations/
- src/routes/todoRoutes.js
- public/index.html
- public/styles.css
- README.md

## Out of scope

- Editing, changing, or removing a due date after creation, including through `PUT /todos/:id`. The issue excludes this explicitly.
- Sorting or filtering todos by due date (the existing list order is kept).
- Due times (time of day), reminders, notifications, or recurring due dates.
- A server-side `overdue` field or an overdue-only endpoint, unless the open question below is decided that way.
- Adding a test framework or linter to the project.
- Changes to the auth flow or the format of the `Authorization` header.

## Open questions

- Should the due date be date-only (Postgres `date`) or a full timestamp (`timestamptz`)? The spec assumes date-only, because the issue says 'pick a due date' and date-only avoids timezone problems. Please confirm, and confirm what the Prisma 8 contract type is and how it serialises in JSON (check prisma-8.md).
- Is a todo due today overdue? The spec assumes no: it becomes overdue only once the due date is before today.
- Whose 'today' counts: the browser's local timezone (the spec's assumption, computed client-side) or the server's/UTC?
- Should past due dates be rejected at creation, or allowed (the spec allows them)?
- What should a 400 validation error return? The project has no existing validation convention, so the choice is between a plain message and a JSON `{ message }`.
- Should the API return a computed `overdue` boolean, or is client-side computation enough (the spec's assumption)?
- Should `POST /todos` keep returning 200 (current behaviour) rather than 201? The spec keeps 200 to stay in scope.
