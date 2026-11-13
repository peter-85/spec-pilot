# Model comparison: spec writer

Which Claude model should SpecPilot use to turn GitHub issues into specs? This compares quality, cost, and speed on real issues from [to-do-app-node](https://github.com/peter-85/to-do-app-node).

## Setup

- **Task:** issue → structured spec (goal, requirements, acceptance criteria, files likely affected, out of scope, open questions)
- **Models:** Claude Haiku 5.5, Claude Sonnet 5.5, Claude Opus 5.5
- **Same input for every model:** system prompt (`agent/prompts/spec-writer.md`), project README and CLAUDE.md as context, and the issue
- **Structured output:** `submit_spec` tool with `strict: true` and `tool_choice: auto` (Sonnet 5.5 does not support forced tool choice)
- **Cost:** logged per call from the API's `usage` field (see `agent/src/llm/client.ts`)
- **Issues tested:**
  - #3 Wrong status code for bad login (small bug fix)
  - #12 Due dates for todos (large: schema, API, and frontend)

## Results without caching

| Model             | Calls | Avg input tokens | Avg output tokens | Avg time | Avg cost | Total cost |
| ----------------- | ----: | ---------------: | ----------------: | -------: | -------: | ---------: |
| claude-haiku-5-5  |     4 |             5352 |              1672 |    9.9 s | $0.00137 |   $0.00548 |
| claude-sonnet-5-5 |     2 |             5305 |              1891 |   16.5 s | $0.02951 |   $0.05903 |
| claude-opus-5-5   |     2 |             5310 |              2221 |   22.5 s | $0.06566 |   $0.13132 |

## Quality scores

Scored 1–5 on clarity, correctness, and testable acceptance criteria.

| Issue | Model      | Score | Notes |
| ----- | ---------- | ----: | ----- |
| #3    | Haiku 5.5  |       |       |
| #3    | Sonnet 5.5 |       |       |
| #3    | Opus 5.5   |       |       |
| #12   | Haiku 5.5  |       |       |
| #12   | Sonnet 5.5 |       |       |
| #12   | Opus 5.5   |       |       |

## Observations

- **Opus vs Sonnet:** Opus's spec was only slightly better than Sonnet's, at double the cost. Not worth it for spec writing.
- **Context dominates input:** about 5,000 input tokens per call, mostly the README and CLAUDE.md; the issue itself is under 2%.
- **Large issues need output room:** Haiku hit the 2,000 `max_tokens` limit on #12 and the spec was cut off. Raised the limit; the cut-off check prevented a broken spec from being saved.
- **Model migration:** Sonnet 5.5 rejected forced `tool_choice` with a 400 error. Switched all models to `tool_choice: auto` with `strict: true` tool use.

## Prompt caching

_To do: same issues run with the project context cached. Results labeled `spec:cached` in the cost report._

## Recommendation

_To do after scoring #12: which model for spec writing, and when (if ever) to use another._
