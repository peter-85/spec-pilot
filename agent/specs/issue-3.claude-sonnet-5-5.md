# Spec: #3 Registering with an existing username returns 503 "Internal server error"

## Goal

Make POST /auth/register return 409 Conflict with a clear message when the username is already taken, instead of a generic 503. Real database failures must keep returning the existing error response.

## Requirements

- In the catch block of the register handler in src/routes/authRoutes.js, detect a unique-violation error with `error.sqlState === "23505"`.
- On a unique violation, respond with HTTP 409 and the JSON body `{ "message": "Username already taken" }`.
- All other errors in the register handler keep the current behaviour: HTTP 503 with `{ "message": "Internal server error" }`.
- The transaction must still roll back on a duplicate username. No partial user or default todo may be left behind. This is the existing behaviour of `db.transaction`, and it must not change.
- A first successful registration still returns 201 with the existing response shape (a JWT). The 201 path is not modified.
- The login handler and todo routes are not modified.
- The README API section should document that `POST /auth/register` returns 409 for a duplicate username.

## Acceptance criteria

- Registering `{username:"alice",password:"x"}` twice: the first call returns 201 and the second returns 409 with body `{ "message": "Username already taken" }`.
- After the duplicate attempt, the database holds exactly one user named alice and only that user's default todo.
- When the database call fails for a non-23505 reason (for example, a simulated error with a different sqlState or no sqlState), the response is 503 with `{ "message": "Internal server error" }`.
- A duplicate registration differing only in password still returns 409.
- Login behaviour is unchanged: invalid credentials return 404 and database errors return 503.

## Files likely affected

- src/routes/authRoutes.js
- README.md

## Out of scope

- Case-insensitive or normalised username uniqueness.
- Changing the login endpoint's 404-for-invalid-credentials behaviour.
- Changing the 503 status for generic errors to 500.
- Adding a test framework or a test suite. The project has none.
- Input validation for username or password.
- Schema or contract changes.

## Open questions

- The issue says to keep "503/500" for other errors, but the current code returns 503. This spec keeps 503. Confirm that is intended.
- Should the 409 check also confirm the violated constraint is on User.username? Today it is the only unique constraint on register, so checking sqlState alone is enough. A later unique column would make this check ambiguous.
