# Spec: #3 Registering with an existing username returns 503 "Internal server error"

## Goal

Make `POST /auth/register` return `409 Conflict` with `{ "message": "Username already taken" }` when the username already exists (Postgres unique violation, `sqlState === "23505"`). All other errors keep their current response.

## Requirements

- 1. In the `catch` block of the register handler in `src/routes/authRoutes.js`, if the caught error has `sqlState === "23505"`, respond with status 409 and JSON body exactly `{ "message": "Username already taken" }`.
- 2. Any other error from the register handler keeps the current behaviour: status 503 with `{ "message": "Internal server error" }`. The status code for non-duplicate errors must not change.
- 3. Detect the duplicate by reading `error.sqlState`, written null-safe (e.g. `error?.sqlState`), so a thrown non-object or an error without `sqlState` cannot crash the handler. Do not match on the Prisma 7 code `P2002` or on error message strings.
- 4. A failed duplicate registration must not leave a partial write. The existing `db.transaction` must still roll back, so no extra default todo is created for any user and no JWT is returned.
- 5. A successful registration keeps its current behaviour: status 201, a JWT with an `{ id }` payload and 1h expiry, and one default todo created in the same transaction.
- 6. Do not change `POST /auth/login`, `authMiddleware.js`, or `todoRoutes.js`.
- 7. Update the API section of `README.md` so that `POST /auth/register` documents `409` for a username that is already taken. Update the line saying that both auth endpoints return 503 on database failure so it stays accurate.

## Acceptance criteria

- With an empty `User` table, `POST /auth/register` with `{"username":"alice","password":"x"}` returns 201 and a token.
- Sending that same request again returns 409 with body exactly `{"message":"Username already taken"}`.
- After the duplicate attempt, the `User` table has exactly one row with username `alice`, and that user has exactly one todo (the default todo from the first registration).
- If the database call fails with an error whose `sqlState` is not 23505, or with an error that has no `sqlState` (e.g. `DATABASE_URL` points to an unreachable DB), the endpoint still returns 503 `{"message":"Internal server error"}`.
- `POST /auth/login` responses are unchanged: 200 with `{ token }`, 404 for invalid credentials, and 503 for DB errors.
- README API docs list 409 for a duplicate username on register.

## Files likely affected

- src/routes/authRoutes.js
- README.md

## Out of scope

- Adding a test framework or test suite. The repo has none, and `npm test` is a placeholder.
- Checking whether the username exists before inserting. Relying on the unique constraint avoids race conditions.
- Changing login's 404-for-invalid-credentials behaviour or other status codes.
- Input validation for username or password (empty values, length, etc.).
- Changes to the Prisma contract or migrations.
- Frontend changes in `public/index.html` beyond what is needed to keep it working.

## Open questions

- The issue says 'Keep 503/500 for everything else', but the handler currently returns only 503. Should all other errors stay 503 (the spec's assumption), or should non-database errors (e.g. bcrypt or JWT signing failures) be split out as 500?
- Should the check also confirm `error instanceof SqlQueryError` and/or the violated constraint or column (`User.username`), so an unrelated unique violation (e.g. on the default Todo insert) isn't reported as 'Username already taken'? The spec assumes checking `sqlState` alone is enough, because `username` is the only unique field touched during registration.
- Should the frontend (`public/index.html`) show the 409 message to the user? It may currently treat any non-2xx response as a generic failure.
