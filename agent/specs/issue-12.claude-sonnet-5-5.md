# Spec: #12 Due dates for todos

## Goal

Let users optionally set a due date when creating a todo, and visually highlight overdue todos (past due and not completed) in the frontend list. Existing todos without a due date must keep working unchanged.

## Requirements

- Add a nullable due-date field (e.g. `dueDate`, timestamp/date type) to the `Todo` model in `src/prisma/contract.prisma`. It must be optional so existing rows remain valid with NULL and no backfill is needed.
- Run `npm run contract:emit` and commit the regenerated `src/prisma/contract.json` and `src/prisma/contract.d.ts` together with the schema change; include any new `migrations/` snapshot/ref the Prisma CLI produces.
- `POST /todos` accepts an optional `dueDate` in the body alongside `task`. When omitted, null or empty string, the todo is created with a null due date, and behaviour is identical to today.
- `POST /todos` with a `dueDate` that is not a valid date returns `400` and creates nothing. The response should have a clear error message. Accepted format: ISO 8601 date string (`YYYY-MM-DD`) or full ISO datetime.
- The todo is still created with `userId: req.userId`; the user scoping invariant is unchanged.
- `GET /todos` returns `dueDate` on each todo (null for todos without one). Completed state and existing fields are unchanged.
- `POST /todos` response returns the created todo including `dueDate`.
- The todo creation form in `public/index.html` has an optional date input next to the task input. Submitting with the date left empty creates a todo with no due date.
- The frontend sends the chosen date as `dueDate` in the `POST /todos` request and clears the date input after a successful creation.
- The frontend displays the due date on todos that have one. Todos with no due date show no due-date text and render as before.
- A todo is overdue if and only if it has a due date earlier than today, and `completed` is false. Overdue todos get a distinct visual style (e.g. a CSS class `overdue` with red text/border defined in `public/styles.css`). Completed todos with a past due date, todos due today or in the future, and todos without a due date must not be styled as overdue.
- Overdue status is computed on the client at render time from `dueDate`, `completed` and the current date. Toggling completion re-renders so the overdue style is added or removed accordingly. No `overdue` column is stored.
- `PUT /todos/:id` and `DELETE /todos/:id` behave as before; they do not accept or change `dueDate`.

## Acceptance criteria

- `POST /todos` with `{ task: "a" }` returns 200 and the todo has `dueDate: null`.
- `POST /todos` with `{ task: "a", dueDate: "2030-01-15" }` returns 200 and the todo's `dueDate` corresponds to 2030-01-15.
- `POST /todos` with `{ task: "a", dueDate: "not-a-date" }` returns 400 and no todo row is added.
- `GET /todos` includes a `dueDate` key on every todo, and returns null for rows created before the migration.
- A user cannot see or receive another user's todos or due dates via `GET /todos`.
- In the UI, a todo with a due date in the past and `completed = false` has the overdue style; marking it complete removes the style.
- In the UI, todos due today, due in the future, or without a due date are not styled overdue.
- The schema change applies cleanly with `npx prisma db update` against a database containing existing todos, without data loss.
- `contract.json` and `contract.d.ts` reflect the new field and are consistent with `contract.prisma`.
- `PUT` and `DELETE` on `/todos/:id` still return 200 for own todos and 404 for others'.

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

- Editing or clearing a due date after creation (explicitly excluded by the issue).
- Filtering, sorting or grouping todos by due date.
- Reminders, notifications or emails for overdue items.
- Server-side computed or stored overdue flag.
- Due-time/time-zone handling beyond a date-level comparison.
- Adding a test framework or linter.
- Changes to auth routes or middleware.

## Open questions

- Should the due date be date-only or date and time? The issue says 'pick a due date', so this spec assumes date-only in the UI; the DB column type (date vs timestamp) needs confirming.
- Should past due dates be rejected at creation time? The spec assumes they are allowed (they are just immediately overdue).
- Which time zone defines 'today' for overdue? The spec assumes the browser's local date, with a todo overdue only from the day after its due date.
- Is the exact visual treatment (colour, badge, icon) specified anywhere? The spec assumes a simple red style via an `overdue` CSS class.
