# Spec: #3 Registering with an existing username returns 503 "Internal server error"

## Goal

Make `POST /auth/register` return 409 Conflict with `{ "message": "Username already taken" }` when the username already exists (Postgres unique violation, sqlState 23505), instead of the current generic 503. All other registration errors keep their existing 503 handling.

## Requirements

- In the catch block of the register handler in src/routes/authRoutes.js, if the caught error has `sqlState === "23505"`, respond with HTTP 409 and JSON body `{ "message": "Username already taken" }`.
- Duplicate-username detection must key on sqlState 23505 (not Prisma 7's P2002 code and not message string matching).
- Any error whose sqlState is not 23505 (or that has no sqlState) must continue to respond 503 with `{ "message": "Internal server error" }` as it does today.
- The 409 check must only apply to the register route; the login route's behavior (404 for invalid credentials, 503 for DB errors) must not change.
- No new user row and no default todo may be created when the duplicate occurs; the existing transaction must roll back on throw so the default todo insert is not left orphaned.
- The response body for a successful registration (201) is unchanged.

## Acceptance criteria

- Registering a new username returns 201 as before.
- Registering the same username a second time returns 409 with body exactly `{ "message": "Username already taken" }`.
- A simulated non-23505 error (e.g., a mocked db call throwing an error with sqlState "08006" or a plain Error) during register returns 503 with `{ "message": "Internal server error" }`.
- After a duplicate registration attempt, the database has still exactly one User row for that username and no extra Todo rows were created for the attempt.
- Login behavior is unchanged: wrong credentials return 404, simulated DB failure returns 503.

## Files likely affected

- src/routes/authRoutes.js

## Out of scope

- Changing login error handling or status codes.
- Changing the todo routes or auth middleware.
- Adding a test framework (the project has no test suite; npm test is a placeholder).
- Adding client-side handling of the 409 response in public/ frontend.
- Changing the database contract or adding a unique constraint migration (username uniqueness already exists on User.username).
- Adding input validation for username/password format.

## Open questions

- The issue says the error is a SqlQueryError; the spec assumes the error reaching the route handler is the raw SqlQueryError with `sqlState` directly on it. If the transaction wrapper in db.transaction re-wraps errors, the check may need to inspect a nested cause. Verify during implementation.
- Should the 409 check be `error.sqlState === "23505"` only, or should it also verify the violated constraint is User.username? Issue only mentions username uniqueness, and the User table is presumably the only unique constraint hit during registration, so this spec uses sqlState alone.
