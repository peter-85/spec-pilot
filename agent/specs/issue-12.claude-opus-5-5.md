# Spec: #12 Due dates for todos

## Goal

Let users set an optional due date when they create a todo, and make overdue todos (past their due date and not completed) stand out in the frontend list. Existing todos without a due date must keep working.

## Requirements

- R1. Schema: add a nullable `dueDate` field to the `Todo` model in `src/prisma/contract.prisma`. It has no default, so existing rows get NULL. The exact column type (DateTime/timestamptz vs a date-only type) depends on Open Question 1.
- R2. Run `npm run contract:emit` and commit the regenerated `src/prisma/contract.json` and `src/prisma/contract.d.ts` with the contract change. Include any `migrations/` snapshot or ref files the Prisma CLI produces. Applying the change with `npx prisma db update` (or `npx prisma db migrate`) must succeed on a database that already has todos, without losing data.
- R3. `POST /todos` accepts an optional `dueDate` in the JSON body next to `task`. If `dueDate` is missing, `null`, or an empty string, the todo is created with `dueDate = null`, which is the same as today's behaviour.
- R4. If `dueDate` is present and not empty, it must be an ISO 8601 string (`YYYY-MM-DD`, or a full ISO datetime if that is chosen in Open Question 1) that parses to a valid date. Otherwise `POST /todos` returns 400 with a JSON error message and creates no row. The exact error body shape depends on Open Question 3.
- R5. `POST /todos` still creates the todo through `db.orm.public.Todo.create({ task, userId: req.userId, dueDate })`, scoped to `req.userId`. The response includes `dueDate`: an ISO 8601 string, or `null`.
- R6. `GET /todos` returns `dueDate` on every todo: an ISO 8601 string, or `null` for todos without one. The response stays scoped to `req.userId` and keeps its current ordering.
- R7. `PUT /todos/:id` and `DELETE /todos/:id` behave exactly as before. `PUT` must not read, change, or clear `dueDate` even if the body contains one.
- R8. `POST /auth/register` still creates the default first todo with no due date (`dueDate = null`).
- R9. Frontend (`public/index.html`): the create-todo form has an optional date input (`<input type="date">`) next to the task input. On submit, its value goes to `POST /todos` as `dueDate`, or is left out / sent as null when empty. The input is cleared after a successful create.
- R10. Frontend: each todo that has a due date shows that date in the list. Todos without a due date look exactly as they do today.
- R11. Frontend: a todo is overdue when it has a `dueDate`, is not completed, and its due date is before the current date (see Open Question 2 for the exact cutoff and time zone). Overdue todos get a distinct CSS class (e.g. `overdue`), styled in `public/styles.css` so they are visually different, for example with a red accent or label. Completed todos are never shown as overdue.
- R12. The overdue state is computed when the list renders. Toggling a todo's completion re-renders it so the overdue styling is added or removed straight away.

## Acceptance criteria

- `npx prisma db update --dry-run` against a database with the old schema shows only an added nullable `dueDate` column on the todo table. No other tables or columns change.
- `contract.json` and `contract.d.ts` are regenerated and include `dueDate` on `Todo`.
- `POST /todos` with `{ task: 'a' }` returns 200, and the created todo has `dueDate: null`.
- `POST /todos` with `{ task: 'a', dueDate: '2030-01-15' }` returns 200 with a non-null `dueDate` for 2030-01-15. A later `GET /todos` returns the same value for that todo.
- `POST /todos` with `{ task: 'a', dueDate: 'not-a-date' }` returns 400, and `GET /todos` shows no new row.
- Todos that existed before the migration are returned by `GET /todos` with `dueDate: null`. They can still be toggled with `PUT` and deleted with `DELETE` as before.
- `PUT /todos/:id` with `{ completed: 1, dueDate: '2000-01-01' }` changes only `completed`; `dueDate` stays as it was.
- A newly registered user's default todo has `dueDate: null`.
- In the browser, a todo created with a past due date and not completed has the overdue class and visible overdue styling. Marking it completed removes the styling. A todo with a future due date, or no due date, is not styled as overdue.
- A user's todos are never returned or changed through another user's token (the existing scoping invariant still holds).

## Files likely affected

- src/prisma/contract.prisma
- src/prisma/contract.json
- src/prisma/contract.d.ts
- migrations/
- src/routes/todoRoutes.js
- public/index.html
- public/styles.css

## Out of scope

- Editing or removing a due date after creation, including through `PUT /todos/:id` (the issue excludes this explicitly).
- Sorting or filtering todos by due date.
- Due times (hours and minutes), reminders, or notifications, unless Open Question 1 decides on full datetimes.
- A server-side `overdue` field or endpoint.
- Adding a test suite or linter to the project.
- Changes to auth routes beyond keeping the default todo's `dueDate` null.

## Open questions

- 1. Should the due date be a date only (calendar day, entered with `<input type="date">`) or a full date and time? Proposed default: date only. The column type also needs deciding: a Postgres `date` if the Prisma 8 contract supports it, otherwise a `DateTime` stored at UTC midnight. This changes the column type and the validation format in R4.
- 2. Exact overdue cutoff and time zone: is a todo due today already overdue, or only from the next day? Is "today" the user's local date in the browser? Proposed default: overdue when the due date is strictly before the user's local current date, computed in the browser.
- 3. What error body should a 400 for an invalid `dueDate` return? The README does not document an error format for `/todos`. Follow whatever `todoRoutes.js` already does, or use `{ message }`.
- 4. Can a user pick a due date in the past when creating a todo? Proposed default: yes, with no server-side restriction. The todo just shows as overdue straight away.
- 5. Should the frontend list be reordered, for example overdue todos first? Proposed default: no. Keep the current order (see out of scope).
