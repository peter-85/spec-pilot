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

## Results

From [cost-report.md](cost-report.md). `spec` rows ran without caching; `spec:cached` rows ran the same issues with the tools, instructions and project context cached.

- **Avg prompt tokens** is the full prompt: uncached input + cache read + cache write.
- **Avg input tokens** is the uncached part only, billed at the full input price.

| Model             | Task        | Calls | Avg prompt tokens | Avg input tokens | Avg cache read | Avg cache write | Avg output tokens | Avg time | Avg cost | Total cost |
| ----------------- | ----------- | ----: | ----------------: | ---------------: | -------------: | --------------: | ----------------: | -------: | -------: | ---------: |
| claude-haiku-5-5  | spec        |     4 |              5352 |             5352 |              0 |               0 |              1672 |    9.9 s | $0.00137 |   $0.00548 |
| claude-sonnet-5-5 | spec        |     2 |              5305 |             5305 |              0 |               0 |              1891 |   16.5 s | $0.02951 |   $0.05903 |
| claude-opus-5-5   | spec        |     2 |              5310 |             5310 |              0 |               0 |              2221 |   22.5 s | $0.06566 |   $0.13132 |
| claude-haiku-5-5  | spec:cached |     4 |              5308 |              240 |           3801 |            1267 |              2317 |   11.9 s | $0.00138 |   $0.00551 |
| claude-sonnet-5-5 | spec:cached |     4 |              5308 |              240 |           3801 |            1267 |              1405 |   11.3 s | $0.01807 |   $0.07229 |
| claude-opus-5-5   | spec:cached |     4 |              5308 |              240 |           3801 |            1267 |              2322 |   23.6 s | $0.05450 |   $0.21798 |

## Quality scores

Scored 1–10 on clarity, correctness, and testable acceptance criteria.

| Issue | Model      | Score | Notes |
| ----- | ---------- | ----: | ----- |
| #3    | Haiku 5.5  |     7 | A simple issue, and Haiku documented the requirements and open questions well. |
| #3    | Sonnet 5.5 |     8 | Almost the same as Haiku, which is expected for a simple issue. The main difference is concrete examples in the acceptance criteria. |
| #3    | Opus 5.5   |     9 | More detailed requirements, acceptance criteria and open questions, though the substance is the same as the other two. |
| #12   | Haiku 5.5  |     6 | Covers about as much as Sonnet and Opus, but the requirements read like a list of implementation instructions rather than a clear description of the behavior. Open questions mostly list options without recommending one. |
| #12   | Sonnet 5.5 |     8 | Well-defined requirements that are easy for a human to read. |
| #12   | Opus 5.5   |     9 | Well-defined, more polished requirements than Sonnet. Its open questions each come with a sensible proposed default, so the reviewer can just confirm or change them. |

## Observations

- **Opus vs Sonnet:** Opus's spec was only slightly better than Sonnet's, at double the cost. Not worth it for spec writing.
- **Context dominates input:** about 5,000 input tokens per call, mostly the README and CLAUDE.md; the issue itself is under 2%.
- **Large issues need output room:** Haiku hit the 2,000 `max_tokens` limit on #12 and the spec was cut off. Raised the limit; the cut-off check prevented a broken spec from being saved.
- **Model migration:** Sonnet 5.5 rejected forced `tool_choice` with a 400 error. Switched all models to `tool_choice: auto` with `strict: true` tool use.
- **Prompt caching:** Prompt caching cut the input cost of repeated calls by over 90%, because the large stable part of the prompt (tools, instructions, project context) was read from cache. It pays off when many requests share that prefix within the cache window. For occasional requests it adds cost, since each one pays the higher cache-write price.

## Recommendation

_To do after scoring #12: which model for spec writing, and when (if ever) to use another._
