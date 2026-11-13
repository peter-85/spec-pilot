# Spec: #3 Registering with an existing username returns 503 "Internal server error"

## Goal

Make POST /auth/register return 409 Conflict with { "message": "Username already taken" } when the username is already registered, instead of the generic 503. All other failures keep their current behaviour.

## Requirements

- In the catch block of the register handler in src/routes/authRoutes.js, detect a unique-violation by checking `error.sqlState === "23505"` on the thrown Prisma 8 SqlQueryError.
- When that check matches, respond with HTTP 409 and JSON body exactly `{ "message": "Username already taken" }`.
- Do not add a separate pre-check query for an existing username. Rely on the database unique constraint, so concurrent duplicate registrations also yield 409 and not a race-condition 503.
- Any other error in the register handler keeps the current response: status 503 and body `{ "message": "Internal server error" }`.
- A duplicate registration must leave no partial data. The existing transaction (user plus default todo) rolls back, so the first user's data is unchanged and no extra todo is created.
- The first successful registration is unchanged: 201 and the same response body as today.
- Do not change the login handler, the auth middleware, the todo routes, or the contract/schema.
- Update the API section of README.md (and the Auth flow section of CLAUDE.md if it describes register error codes) to document that register returns 409 for a duplicate username.

## Acceptance criteria

- POST /auth/register with { username: "alice", password: "x" } returns 201 on the first call.
- Repeating the same request returns 409 with body `{ "message": "Username already taken" }`.
- After the duplicate attempt, the database still has exactly one User row for "alice" and exactly one todo (the default one) for that user.
- A registration with a different username after the conflict still returns 201.
- If the database call throws an error without sqlState "23505" (for example a connection failure, or a SqlQueryError with another sqlState such as a not-null violation), the endpoint returns 503 with `{ "message": "Internal server error" }`.
- POST /auth/login behaviour is unchanged (404 for invalid credentials, 503 on DB errors).
- README.md documents the 409 response for POST /auth/register.

## Files likely affected

- src/routes/authRoutes.js
- README.md
- CLAUDE.md

## Out of scope

- Adding a test framework or test suite (the project has none). Verification is manual or via an ad-hoc script unless the team decides otherwise.
- Changing the status code for other register errors, such as switching 503 to 500.
- Input validation for missing or empty username/password.
- Case-insensitive or normalised username uniqueness.
- Changes to the Prisma contract, migrations, or generated contract files.
- Frontend changes to display the new error message.
- A shared error-handling helper or middleware for all routes.

## Open questions

- The issue says "Keep 503/500 for everything else". This spec keeps 503 because that is the current behaviour. Confirm that 503 should stay and not change to 500.
- Should the 409 apply to any 23505 from the register transaction, or only to one raised by the User.username constraint? The Todo insert has no unique constraint in this schema, so the spec checks only `sqlState`. Say so if the constraint name must also be checked.
- Is `sqlState` exposed directly on the caught error in Prisma 8 (`error.sqlState`) or on a nested `cause`? The issue and CLAUDE.md say it is on the error. The implementer should verify this against a real duplicate insert.
