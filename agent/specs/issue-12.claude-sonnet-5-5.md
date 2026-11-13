# Spec: #12 Due dates for todos

## Goal

Let users optionally set a due date when creating a todo, and visually highlight overdue todos (past due and not completed) in the frontend list. Existing todos without a due date must continue to work unchanged.

## Requirements

- Add a nullable `dueDate` field to the `Todo` model in `src/prisma/contract.prisma`, using a timestamp type (see open questions on date vs. datetime). It must have no default and must not be required, so existing rows remain valid with `dueDate = null`.
- Regenerate `src/prisma/contract.json` and `src/prisma/contract.d.ts` with `npm run contract:emit` and commit them together with the schema change. Include any `migrations/` snapshot or ref files the Prisma CLI produces.
- `POST /todos` accepts an optional `dueDate` in the body alongside `task`. When provided and valid, it is stored on the new todo. When omitted, `null`, or an empty string, the todo is created with `dueDate = null`.
- `POST /todos` validates `dueDate` when provided and non-empty: it must be a string that parses to a valid date (ISO 8601). An invalid value returns `400` with an error message, and no todo is created. Existing validation and behavior for `task` is unchanged. Success status stays `200`.
- `GET /todos` returns `dueDate` for each todo, as an ISO 8601 string or `null`. Todos without a due date return `dueDate: null` and are otherwise unchanged.
- The `POST /todos` response returns the full created row, including `dueDate`.
- The todo create path must keep the `userId: req.userId` scoping. No new route is added, and `PUT /todos/:id` and `DELETE /todos/:id` behavior is unchanged.
- Do not add support for editing or removing a due date after creation. `PUT /todos/:id` must not read or write `dueDate`.
- Frontend (`public/index.html`): the create-todo form gets an optional date input next to the task input. On submit, it sends `dueDate` in the POST body only if a date was chosen. It clears the date input after a successful create.
- Frontend: each todo with a due date shows that date in a readable, locale-appropriate format. Todos with `dueDate = null` render exactly as they do today, with no due-date text.
- Frontend: a todo is overdue when `dueDate` is non-null, the due date is before the current time (or before the start of today, per the open question), and `completed` is falsy. Overdue todos get a distinct CSS class (e.g. `overdue`) with visible styling, such as a red color or border, defined in `public/styles.css`. Completed todos, todos with no due date, and todos not yet due do not get the class.
- Overdue status is computed on the client from `dueDate` and `completed`. It is not stored in the database and not returned by the API. Toggling `completed` in the UI updates the overdue styling to match.

## Acceptance criteria

- After `npm run contract:emit`, `contract.json` and `contract.d.ts` contain a nullable `dueDate` on `Todo`. After `npx prisma db update`, existing rows have `dueDate` NULL and the app starts without errors.
- `POST /todos` with `{ task: "a", dueDate: "2030-01-01" }` returns 200 and a body whose `dueDate` represents 2030-01-01. A later `GET /todos` returns the same value.
- `POST /todos` with `{ task: "a" }`, with `dueDate: null`, or with `dueDate: ""` returns 200 with `dueDate: null`.
- `POST /todos` with `{ task: "a", dueDate: "not-a-date" }` returns 400, and `GET /todos` shows no new todo.
- `GET /todos` for a user with pre-existing todos returns them all with `dueDate: null` and the other fields unchanged.
- A user cannot see another user's todos or due dates. Existing `userId` scoping is intact.
- In the browser, a todo with a past `dueDate` and `completed = false` has the overdue class and the overdue style. Checking it as completed removes the class. A todo with a future or null due date never has the class.
- The create form works with the date left blank, and the new todo appears with no due-date text and no overdue styling.
- `PUT /todos/:id` and `DELETE /todos/:id` behave as before, including 404 for another user's todo.

## Files likely affected

- src/prisma/contract.prisma
- src/prisma/contract.json
- src/prisma/contract.d.ts
- migrations/
- src/routes/todoRoutes.js
- public/index.html
- public/styles.css
- README.md
- CLAUDE.md

## Out of scope

- Editing or clearing a due date after creation, including any change to `PUT /todos/:id`.
- Sorting or filtering todos by due date or overdue status.
- Server-side `overdue` flag or query filters.
- Notifications, reminders, or emails.
- Time-of-day or timezone preferences per user.
- Recurring todos.
- Adding a test framework. The project has none.
- Changes to auth routes or middleware.

## Open questions

- Date only or date and time? The issue says "pick a due date", which suggests date only (`<input type="date">`). I assumed a date-only input stored in a timestamp column. Please confirm. This also decides whether a todo due today counts as overdue after midnight or only after the date has fully passed. Recommended: a todo is overdue only once its due date is before today's local date.
- Timezone handling: should a date-only value be stored as UTC midnight and compared against the browser's local date? Recommended: store as `YYYY-MM-DD` at UTC midnight, and compare by calendar date in the client's local time.
- Should past dates be allowed at creation? The spec allows them, so the todo is immediately overdue. Confirm this is acceptable or whether the server should reject them.
- What is the exact Prisma 8 contract type for a nullable timestamp or date column (e.g. `DateTime?`)? Check `prisma-8.md`. The implementer should also confirm how `db.orm` serializes it, either `Date` or string, so the API returns ISO strings.
