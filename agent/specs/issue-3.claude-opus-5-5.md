# Spec: #3 Registering with an existing username returns 503 "Internal server error"

## Goal

Make `POST /auth/register` return `409 Conflict` with `{ "message": "Username already taken" }` when the username already exists (Prisma 8 `SqlQueryError` with `sqlState === "23505"`). All other errors keep their current response.

## Requirements

- 1. In the `catch` block of the `POST /auth/register` handler in `src/routes/authRoutes.js`, if the caught error has `sqlState === "23505"`, respond with HTTP 409 and the JSON body `{ "message": "Username already taken" }`.
- 2. The 23505 check must work on the error that comes out of `db.transaction(...)`. The user insert happens inside the transaction, so check that the error rethrown after rollback still exposes `sqlState`. If the transaction wraps the error, read the `sqlState` from the wrapped original error (for example `error.cause`) instead.
- 3. Any other error in the register handler, including `SqlQueryError`s with a different `sqlState` and non-SQL errors, keeps exactly today's response: status 503 with `{ "message": "Internal server error" }`.
- 4. When a duplicate registration returns 409, no new User row and no default Todo row are created. The transaction must roll back fully.
- 5. The successful registration path does not change: it still returns 201 with a JWT and creates the user plus the default first todo in one transaction.
- 6. `POST /auth/login` behavior does not change.
- 7. Add a `409` note for duplicate usernames to the `/auth/register` row (or the notes below the table) in the API section of README.md.

## Acceptance criteria

- `POST /auth/register` with `{"username":"alice","password":"x"}` on a fresh database returns 201 with a token.
- Sending the same request again returns 409 with a body exactly equal to `{"message":"Username already taken"}`.
- After the duplicate attempt, the database still has exactly one User with username `alice` and only that user's single default Todo; no orphan rows exist.
- If the DB call fails for a non-unique-violation reason (for example an unreachable `DATABASE_URL`), register still returns 503 `{"message":"Internal server error"}`.
- Login behavior is the same as before: 200 `{ token }` for valid credentials, 404 for invalid credentials, 503 on DB error.
- README's API section documents the 409 response for `/auth/register`.

## Files likely affected

- src/routes/authRoutes.js
- README.md

## Out of scope

- Adding a test framework or test suite (the project has none; `npm test` is a placeholder)
- Checking whether the username exists before inserting (rely on the DB constraint to avoid race conditions)
- Changing the login endpoint's 404-for-invalid-credentials behavior
- Input validation for username/password (empty values, length rules, etc.)
- Changing the error handling of the todo routes
- Frontend changes to display the new 409 message

## Open questions

- The issue says 'Keep 503/500 for everything else', but the handler currently returns only 503. Should all other errors stay 503 (as this spec assumes), or should non-DB errors (for example a bcrypt or JWT signing failure) become 500?
- Should the 409 apply to any 23505 error, or only when the violated constraint is the unique index on `User.username` (for example by checking the constraint name on the error)? Right now username is presumably the only unique constraint the register path can hit, so this spec checks `sqlState` alone, as the issue suggests.
- Does `db.transaction` rethrow the original `SqlQueryError` unchanged, or does it wrap it? Check this against `prisma-8.md` or with a manual test while implementing requirement 2.
- Since there is no test suite, are manual curl checks enough to verify the acceptance criteria, or should this issue add a minimal automated test anyway?
