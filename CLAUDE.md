# CLAUDE.md — SpecPilot

Context for Claude Code working in this repository. Read this before making changes.

## What this project is

SpecPilot turns GitHub issues into reviewed pull requests: issue → spec → plan → implementation → PR → AI review → human approval. It is a portfolio project, so code clarity and good documentation matter as much as features.

## Repository layout

- `agent/` — orchestration (spec writer, planner, implementer, reviewer) using the Claude Agent SDK
- `mcp-servers/github/` — MCP server exposing GitHub issue and PR tools
- `skills/` — Claude Code skills used by the agents
- `dashboard/` — React + TypeScript (Vite) dashboard
- `docs/` — write-ups: model comparison, lessons learned, context engineering, cost routing

## Tech and conventions

- TypeScript everywhere, `strict` mode on. No `any` unless commented with a reason.
- Node.js 20+, pnpm workspaces.
- Small, pure functions; keep side effects (API calls, file I/O, DB) at the edges.
- Validate external input (issues, API responses, tool arguments) with zod.
- Every LLM call goes through `agent/src/llm/client.ts` so tokens and cost are always logged. Never call the API directly elsewhere.
- Prompts live in `agent/prompts/*.md`, not inline in code.
- Tests: Vitest. New logic needs tests; bug fixes need a regression test.
- Commits: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).

## Commands

```bash
pnpm install          # install all workspaces
pnpm build            # build everything
pnpm test             # run all tests
pnpm lint             # eslint + prettier check
pnpm --filter agent dev        # run the agent locally
pnpm --filter dashboard dev    # run the dashboard
```

## Spec format

Specs produced by the spec writer must use these sections, in this order:

1. **Goal** — one or two sentences
2. **Requirements** — numbered, testable statements
3. **Acceptance criteria** — what must be true for the change to be done
4. **Files likely affected**
5. **Out of scope**
6. **Open questions** — anything the issue left unclear (never guess silently)

## How to work in this repo

- For any non-trivial change, write or update a plan first and confirm it before editing code.
- Run `pnpm test` and `pnpm lint` before saying a task is done.
- Keep changes focused: one concern per commit and per PR.
- Update the relevant `docs/` file when behavior or results change.

## Do not

- Commit secrets, tokens, or `.env` files. Use `.env.example` for new variables.
- Bypass the LLM client wrapper (cost logging would break).
- Merge or push to `main` directly; always work on a branch.
- Change guardrail limits (cost, files changed) without being asked.

## Environment variables

See `.env.example`. Key ones: `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `DATABASE_URL`, `MAX_COST_PER_RUN_USD`, `MAX_FILES_CHANGED`.
