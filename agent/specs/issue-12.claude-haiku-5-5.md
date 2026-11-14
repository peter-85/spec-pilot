# Spec: #12 Due dates for todos

## Goal

Let users optionally set a due date when creating a todo, expose it through the API and frontend, and visually flag todos that are overdue (due date in the past and not completed). Existing todos without a due date must keep working unchanged. Editing or removing a due date after creation is out of scope.

## Requirements

- 1. Schema: add an optional due date column to the Todo model in src/prisma/contract.prisma. It is nullable, so existing rows get NULL and need no backfill. Use the type that matches the open question on date-only vs timestamp (see open_questions).
- 2. Regenerate src/prisma/contract.json and src/prisma/contract.d.ts with `npm run contract:emit` and commit them together with the contract.prisma change.
- 3. Apply the schema change with `npx prisma db update` (or a planned migration via `npx prisma db migrate`, per the open question). Existing todos must still load after the change.
- 4. POST /todos accepts an optional `dueDate` field alongside `task`. When `dueDate` is omitted or null, the todo is created with no due date and the request behaves exactly as before (200, same response shape plus the new field set to null).
- 5. When `dueDate` is provided, it is parsed and stored. An unparseable value returns 400 and creates nothing. Exact accepted format is an open question.
- 6. POST /todos still requires `task`. Existing validation and the `userId: req.userId` scoping stay unchanged.
- 7. GET /todos returns each todo with a `dueDate` field (ISO 8601 string, or null when unset). Rows without a due date return null, not undefined and not omitted.
- 8. PUT /todos/:id continues to accept only `completed`. It must not change `dueDate`. Ignore or reject a `dueDate` key in the PUT body, per the open question.
- 9. DELETE and PUT keep their current 404 behavior for todos not owned by the caller.
- 10. Overdue definition: a todo is overdue when it has a dueDate strictly earlier than the current time and completed is false (or 0). Completed todos and todos with no due date are never overdue.
- 11. Frontend (public/index.html, with styles in public/styles.css or fanta.css): the create-todo form gets an optional date input next to the task input. Leaving it empty sends no dueDate. The list displays the due date for todos that have one.
- 12. Frontend: overdue todos get a distinct, visible style (for example a CSS class such as `overdue` applied to the list item) so they stand out from other items. Completed todos are never styled as overdue. Completed status is still read from the 0/1 value and normalised as today.
- 13. Existing todos without a due date render exactly as before, with no overdue styling and no broken layout.

## Acceptance criteria

- After running `npm run contract:emit`, git diff shows the regenerated contract.json and contract.d.ts include the new nullable dueDate field and nothing unrelated.
- Creating a todo via POST /todos with a valid dueDate returns 200 and a body whose dueDate equals the submitted value (in the agreed format).
- Creating a todo via POST /todos without dueDate returns 200 with dueDate null, and GET /todos includes that todo with dueDate null.
- POST /todos with an invalid dueDate string returns 400 and no todo row is inserted.
- POST /todos with no task still fails as it did before this change.
- GET /todos returns only the caller's todos, each with a dueDate key (string or null).
- PUT /todos/:id with { completed } does not modify dueDate in the database.
- A todo with a due date in the past and completed false is flagged overdue by the frontend (has the overdue class); the same todo with completed true is not flagged.
- A todo with a due date in the future, or no due date, is not flagged overdue.
- Manual check in the browser: creating a todo with a date shows the date; creating one without a date works; overdue items look visibly different from others.
- Existing todos created before the migration still list, complete, and delete without errors.

## Files likely affected

- src/prisma/contract.prisma
- src/prisma/contract.json
- src/prisma/contract.d.ts
- src/routes/todoRoutes.js
- public/index.html
- public/styles.css

## Out of scope

- Editing or removing a due date after creation (no PUT support for dueDate, no clear-date UI).
- Reminders, notifications, or sorting/filtering by due date.
- Due dates on the default todo created at registration.
- Timezone preference settings per user.
- Adding a test framework to the project (the README and CLAUDE.md say there is no test suite; verifying acceptance criteria with automated tests would need a separate decision).
- Refactoring the frontend or changing the auth flow.

## Open questions

- Date-only or full timestamp? An issue like 'due date' suggests a calendar day. If date-only, store a DATE column and treat a todo as overdue after the end of that day in the user's timezone. If timestamp, store a timestamp and define overdue as now > dueDate. Which one?
- Timezone for 'overdue': is the comparison done server-side (UTC) or in the browser's local timezone? Computing it on the frontend avoids timezone ambiguity for users, but the spec must pick one.
- Accepted input format for dueDate: strictly YYYY-MM-DD from the date input, full ISO 8601, or both? Should the API reject other formats with 400, or is that the wrong default given the existing API has no documented validation errors?
- Should the API reject a dueDate in the past at creation time, or accept it? The issue does not say; this spec assumes it is accepted, since a past date is how an item becomes overdue.
- Empty string for dueDate from the frontend: treat as null (no due date)? This spec assumes yes.
- What should PUT do if a client sends dueDate in the body: silently ignore it, or return 400? This spec assumes silently ignore, but the choice should be confirmed.
- Migration approach: `npx prisma db update` (as the README's getting-started section describes) or a planned `npx prisma db migrate` that commits a migration snapshot under migrations/? Adding a nullable column is safe with either, but the project convention should be confirmed.
- Overdue styling details: exact visual treatment (color, icon, text label such as 'Overdue') is not specified. Is a CSS class plus a visible text label acceptable?
- Should the frontend display the date in the user's locale format, or as the raw ISO value?
