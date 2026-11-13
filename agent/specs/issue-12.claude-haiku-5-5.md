# Spec: #12 Due dates for todos

## Goal

Let users optionally set a due date when creating a todo, return that date from the API, and visually flag todos that are past their due date and not completed. Requires a nullable schema column, API changes to POST and GET /todos, and frontend changes.

## Requirements

- 1. In src/prisma/contract.prisma, add an optional due-date field to the Todo model (nullable, no default). Regenerate with `npm run contract:emit` and commit contract.json and contract.d.ts together with the schema change.
- 2. The schema change must not require existing Todo rows to have a value. Applying it with `npx prisma db update` must succeed on a database that already contains todos, and those todos must read back with dueDate = null.
- 3. POST /todos accepts an optional `dueDate` field in the JSON body alongside `task`. Omitting it or sending null creates the todo with no due date. Existing behaviour for `task` is unchanged.
- 4. POST /todos returns 400 when `dueDate` is present (not null) but is not a valid date string in the format chosen under open question 1. The todo must not be created in that case.
- 5. Every todo returned by GET /todos and POST /todos includes a `dueDate` property: the stored value serialized as a string in the format chosen under open question 1, or null when unset.
- 6. Todos created via POST /auth/register (the default first todo) have dueDate = null.
- 7. Scoping is unchanged: GET and POST continue to use userId: req.userId for every query. A user never sees another user's due dates.
- 8. PUT /todos/:id and DELETE /todos/:id behaviour is unchanged. PUT must not read, change, or clear dueDate.
- 9. The frontend create-todo form gets an optional date input next to the task input. When left empty, no dueDate is sent. When filled, its value is sent as dueDate in the POST body.
- 10. In the todo list, a todo is overdue when it has a dueDate that is earlier than the current time (per the comparison rule in open question 2) and completed is false. Overdue todos get a distinct visual style (for example a CSS class such as `overdue`) applied in public/styles.css or public/fanta.css. Completed todos and todos without a due date are not styled as overdue.
- 11. Each todo row in the list displays its due date when set. Todos without a due date show no date label.
- 12. Existing todos without a due date continue to render and toggle/delete normally in the UI.

## Acceptance criteria

- After `npx prisma db update` on a DB with pre-existing todos, GET /todos returns those todos with dueDate: null and no error.
- POST /todos with {task, dueDate: <valid value>} returns 200 and the row includes dueDate matching the input; a subsequent GET /todos returns the same value.
- POST /todos with {task} (no dueDate) returns 200 with dueDate null.
- POST /todos with an invalid dueDate string (e.g. 'not-a-date') returns 400 and creates no row.
- A user's GET /todos never includes another user's todos, and dueDate values are only returned for the caller's rows.
- PUT /todos/:id with {completed} leaves dueDate unchanged in the database.
- Register still returns 201 and the new user's first todo has dueDate null.
- contract.json and contract.d.ts are regenerated and committed in the same change as contract.prisma.
- In the browser, a todo with a past dueDate and completed=false has the overdue class; the same todo with completed=true, or with a future or empty dueDate, does not.
- The create form sends no dueDate key when the date input is empty.

## Files likely affected

- src/prisma/contract.prisma
- src/prisma/contract.json
- src/prisma/contract.d.ts
- src/routes/todoRoutes.js
- public/index.html
- public/styles.css
- public/fanta.css

## Out of scope

- Changing or clearing a due date after creation (PUT support for dueDate).
- Editing the task text.
- Due-date reminders, notifications, or sorting/filtering by due date.
- Timezone-aware user preferences or per-user timezone storage.
- Database migrations files under migrations/ beyond what the Prisma CLI produces for this change.
- Automated test framework setup (the project has no test suite).
- Changes to authentication, JWT handling, or the register/login response shapes.

## Open questions

- 1. Date format and column type: is the due date date-only (e.g. 'YYYY-MM-DD', stored as a Postgres date) or a full timestamp (ISO 8601 with time, stored as timestamptz)? The issue says 'pick a due date', which suggests date-only, but this must be confirmed because it changes the column type, validation, and serialization.
- 2. Overdue comparison rule: is a todo overdue once the current time passes the due timestamp, or only after the end of the due day? For a date-only value, this should be decided explicitly (for example, overdue when the date is strictly before the current date in the server's timezone, or in the browser's local timezone). The server and browser can disagree on 'today'.
- 3. Past dates on creation: may a user create a todo with a due date already in the past? The issue does not say. This spec assumes yes (it is not rejected), but confirm.
- 4. Frontend date input: should the native HTML date input be used (which yields YYYY-MM-DD), and should the list display the date in a locale-specific format or as stored?
- 5. The frontend source location is not confirmed. The README lists public/index.html as the frontend, and the inline script or any separate JS file there should be updated. Confirm where the client-side JavaScript lives.
- 6. If PUT /todos/:id receives a dueDate field, should it be silently ignored (as assumed here) or rejected with 400? The issue excludes editing, so this spec assumes it is ignored.
