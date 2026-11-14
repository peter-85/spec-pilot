# Spec: #3 Registering with an existing username returns 503 "Internal server error"

## Goal

Make `POST /auth/register` return `409 Conflict` with `{ "message": "Username already taken" }` when the username already exists, instead of the generic `503 Internal server error`. All other registration failures keep their current status behaviour.

## Requirements

- 1. In `src/routes/authRoutes.js`, the register handler's error handling must detect a unique-violation error by checking `error.sqlState === "23505"`. Do not match on the error message text.
- 2. When a unique violation is detected, the response is status `409` with JSON body `{ "message": "Username already taken" }`.
- 3. The 23505 check applies to the registration path only. The login route's behaviour (404 for invalid credentials, 503 for DB errors) must not change.
- 4. Any other error during registration keeps the existing 503 response with `{ "message": "Internal server error" }`, unless open question 1 is resolved otherwise.
- 5. The registration flow must still run the user insert and the default-todo insert in one `db.transaction(...)`. A duplicate-username failure must therefore roll back and create no todo row, and it must not leave a partial user.
- 6. No new dependencies. No changes to the contract, `contract.json`, or `contract.d.ts`.
- 7. The README API table and CLAUDE.md should be updated to document the 409 response for `/auth/register`, since the table currently lists only 201 as success for that route.

## Acceptance criteria

- Registering a new username returns 201 (unchanged).
- Registering the same username a second time returns 409 with body exactly `{ "message": "Username already taken" }`.
- A test that forces an error with `sqlState` "23505" in the register path gets a 409 response.
- A test that forces a non-23505 error in the register path (for example an error with a different sqlState or no sqlState) gets a 503 response with `{ "message": "Internal server error" }`.
- After a duplicate-username attempt, the database has exactly one User row for that username and no extra Todo rows created by the failed attempt.
- Login and todo routes are unaffected: existing behaviour and status codes are unchanged.

## Files likely affected

- src/routes/authRoutes.js
- README.md
- CLAUDE.md

## Out of scope

- Changing the 503 response for general database failures to 500 (the README documents 503).
- Adding a unique-violation check to login or todo routes.
- Adding a test framework. The project has no test suite; use whatever check is available or add a minimal script only if the maintainers agree.
- Frontend changes to display the new error message.
- Pre-checking username existence with a SELECT before insert (race-prone and unnecessary once the 23505 path exists).
- Changing the schema, the unique constraint, or the password or JWT logic.

## Open questions

- The issue says to keep 503/500 for other errors, but the README documents 503 for DB failures. Should other errors stay 503, or switch to 500? This spec assumes 503 stays, to match the README.
- Does `db.transaction` propagate the original `SqlQueryError` unchanged, with `sqlState` intact, when an insert inside it fails? If it wraps the error, the check must look at the wrapped cause. This needs verification against the Prisma 8 runtime before implementation.
- Is the `User.username` unique constraint the only 23505 source in the register path? If the default-todo insert could also raise 23505, the 409 message would be misleading. This spec assumes it cannot.
- Should the username be normalised (for example trimmed or lowercased) before the uniqueness check? The issue does not say, so this spec leaves it unchanged.
