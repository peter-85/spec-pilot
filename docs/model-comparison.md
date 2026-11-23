# Model comparison: spec writer

Which Claude model should SpecPilot use to turn GitHub issues into specs, and how should it run? This compares quality, cost, and speed on real issues from [to-do-app-node](https://github.com/peter-85/to-do-app-node), in two setups:

1. **Single API call** (`agent/src/spec/writer.ts`): one request with fixed context.
2. **Claude Code skill** (`skills/write-spec`): an agent loop that explores the real code.

## Part 1: Single API call

### Setup

- **Task:** issue → structured spec (goal, requirements, acceptance criteria, files likely affected, out of scope, open questions)
- **Models:** Claude Haiku 5.5, Claude Sonnet 5.5, Claude Opus 5.5
- **Same input for every model:** system prompt (`agent/prompts/spec-writer.md`), project README and CLAUDE.md as context, and the issue
- **Structured output:** `submit_spec` tool with `strict: true` and `tool_choice: auto` (Sonnet 5.5 does not support forced tool choice)
- **Cost:** logged per call from the API's `usage` field (see `agent/src/llm/client.ts`)
- **Issues tested:**
  - #3 Wrong status code for bad login (small bug fix)
  - #12 Due dates for todos (large: schema, API, and frontend)

### Results

From [cost-report.md](cost-report.md). `spec` rows ran without caching; `spec:cached` rows ran the same issues with the tools, instructions and project context cached.

- **Avg prompt tokens** is the full prompt: uncached input + cache read + cache write.
- **Avg input tokens** is the uncached part only, billed at the full input price.

| Model | Task | Calls | Avg prompt tokens | Avg input tokens | Avg cache read | Avg cache write | Avg output tokens | Avg time | Avg cost | Total cost |
| ----------------- | ----------- | ----: | ----------------: | ---------------: | -------------: | --------------: | ----------------: | -------: | -------: | ---------: |
| claude-haiku-5-5 | spec | 4 | 5352 | 5352 | 0 | 0 | 1672 | 9.9 s | $0.00137 | $0.00548 |
| claude-sonnet-5-5 | spec | 2 | 5305 | 5305 | 0 | 0 | 1891 | 16.5 s | $0.02951 | $0.05903 |
| claude-opus-5-5 | spec | 2 | 5310 | 5310 | 0 | 0 | 2221 | 22.5 s | $0.06566 | $0.13132 |
| claude-haiku-5-5 | spec:cached | 4 | 5308 | 240 | 3801 | 1267 | 2317 | 11.9 s | $0.00138 | $0.00551 |
| claude-sonnet-5-5 | spec:cached | 4 | 5308 | 240 | 3801 | 1267 | 1405 | 11.3 s | $0.01807 | $0.07229 |
| claude-opus-5-5 | spec:cached | 4 | 5308 | 240 | 3801 | 1267 | 2322 | 23.6 s | $0.05450 | $0.21798 |

Note: the cached averages mix the first call of each batch (which writes the cache) with later calls (which read it), so per-call savings on warm calls are larger than these averages show. Output length also varies between runs, which affects cost more than caching for Haiku and Opus.

### Quality scores

Scored 1–10 on clarity, correctness, and testable acceptance criteria.

| Issue | Model      | Score | Notes                                                                                                                                                                                                                       |
| ----- | ---------- | ----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #3    | Haiku 5.5  |     7 | A simple issue, and Haiku documented the requirements and open questions well.                                                                                                                                              |
| #3    | Sonnet 5.5 |     8 | Almost the same as Haiku, which is expected for a simple issue. The main difference is concrete examples in the acceptance criteria.                                                                                        |
| #3    | Opus 5.5   |     9 | More detailed requirements, acceptance criteria and open questions, though the substance is the same as the other two.                                                                                                      |
| #12   | Haiku 5.5  |     6 | Covers about as much as Sonnet and Opus, but the requirements read like a list of implementation instructions rather than a clear description of the behavior. Open questions mostly list options without recommending one. |
| #12   | Sonnet 5.5 |     8 | Well-defined requirements that are easy for a human to read.                                                                                                                                                                |
| #12   | Opus 5.5   |     9 | Well-defined, more polished requirements than Sonnet. Its open questions each come with a sensible proposed default, so the reviewer can just confirm or change them.                                                       |

### Observations

- **Opus vs Sonnet:** Opus's spec was only slightly better than Sonnet's, at double the cost. Not worth it for spec writing.
- **Haiku on large issues:** fine for small, clear issues, but on #12 its requirements drifted into implementation steps and its open questions didn't recommend answers.
- **Context dominates input:** about 5,000 input tokens per call, mostly the README and CLAUDE.md; the issue itself is under 2%.
- **Large issues need output room:** Haiku hit the 2,000 `max_tokens` limit on #12 and the spec was cut off. Raised the limit; the cut-off check prevented a broken spec from being saved. Thinking tokens count toward the limit too.
- **Model migration:** Sonnet 5.5 rejected forced `tool_choice` with a 400 error. Switched all models to `tool_choice: auto` with `strict: true` tool use.
- **Prompt caching:** cut the input cost of repeated calls by over 90%, because the large stable part of the prompt (tools, instructions, project context) was read from cache. It pays off when many requests share that prefix within the cache window. For occasional requests it adds cost, since each one pays the higher cache-write price.
- **After caching, output is the main cost:** with input cached, output tokens (including thinking) are most of each call's price, so spec length and effort level are the next levers.
- **Limitation:** this setup never sees the code. "Files likely affected" is based on how the README describes the project.

## Part 2: Claude Code skill (agent loop)

### Setup

- **Task:** `/write-spec 12` in Claude Code, inside `to-do-app-node`
- **Model:** Claude Opus 5.5 for both runs
- **What the agent can do:** read the issue through the github-specpilot MCP server, explore the local code with Claude Code's own tools, and write `specs/issue-12.md`
- **Controlled conditions:** fresh Claude Code session for each run, identical starting context (33.2k tokens in `/context`), same issue
- **Two skill versions**, differing only in steps 3 and 4:
  **Initial skill**

```md
3. **Learn the project.** Read CLAUDE.md and the README.
4. **Explore the code the issue touches**: models and schema, routes, middleware, frontend files, and existing tests. Read enough to know how things work today. Base the spec on the real code, not guesses.
```

**Improved skill**

```md
3. **Learn the project.** CLAUDE.md is already in context; do not re-read it. Read the README only if CLAUDE.md does not cover something the issue touches, and then only the relevant section.
4. **Explore only the code the issue touches.** Start with Grep/Glob to locate it, then read just those files (or the relevant ranges). Skip areas the issue doesn't involve, e.g. skip the frontend for an API-only issue. Base the spec on the real code, not guesses.
```

- **Token counts:** from the session transcript, per model call

### Fixed overhead before the skill runs

From `/context` at the start of each session:

| Category                                      |     Tokens |
| --------------------------------------------- | ---------: |
| System tools (Claude Code's built-in tools)   |      20.8k |
| Skills (descriptions of all installed skills) |       5.8k |
| System prompt                                 |       3.9k |
| Memory files (CLAUDE.md)                      |       1.3k |
| MCP server instructions and tools             |       1.4k |
| **Total**                                     | **~33.2k** |

The skill cannot change this part. Every call in the loop re-sends it (from cache).

### Results per call

**Initial skill**

| Call | Purpose                                  | Cache write | Cache read | Output |
| ---: | ---------------------------------------- | ----------: | ---------: | -----: |
|    1 | Load the write-spec skill                |      14,126 |     31,109 |    235 |
|    2 | Git remote + list files, load issue tool |       1,126 |     45,235 |    207 |
|    3 | Fetch issue                              |         859 |     46,361 |    112 |
|    4 | Read README, schema, routes + index.html |         344 |     47,220 |    191 |
|    5 | Grep prisma-8.md                         |       7,101 |     47,564 |    189 |
|    6 | Write the spec                           |         292 |     54,665 |  2,393 |

**Improved skill**

| Call | Purpose                                              | Cache write | Cache read | Output |
| ---: | ---------------------------------------------------- | ----------: | ---------: | -----: |
|    1 | Load the write-spec skill                            |      14,125 |     31,109 |    147 |
|    2 | Git remote, load issue tool                          |       1,111 |     45,234 |    170 |
|    3 | Fetch issue #12                                      |         475 |     46,345 |    112 |
|    4 | Read schema and todo routes, list specs/ and public/ |         344 |     46,820 |    157 |
|    5 | Search index.html and prisma-8.md                    |         781 |     47,164 |    318 |
|    6 | Write the spec                                       |       1,380 |     47,945 |  1,714 |

The final "report back" call is left out of both, since in the measured runs it also included reading the token usage.

### Comparison (calls 1–6)

|                                          | Initial skill | Improved skill |         Change |
| ---------------------------------------- | ------------: | -------------: | -------------: |
| Model calls                              |             6 |              6 |           same |
| Cache writes                             |        23,848 |         18,216 |           −24% |
| Cache reads                              |       272,154 |        264,617 |            −3% |
| Output                                   |         3,327 |          2,618 |           −21% |
| Context when writing the spec            |          ~55k |           ~49k |            −6k |
| **Estimated cost (Opus 5.5 API prices)** |    **~$0.24** |     **~$0.20** | **about −18%** |

Cost estimate uses Opus 5.5 prices per million tokens: $5 cache write (5-minute), $0.20 cache read, $20 output. Claude Code on a subscription isn't billed per token, but an agent running on the API (Phase 4) would be.

### Observations

- **An agent re-sends its context on every step.** Six calls meant the ~45–55k context was sent six times. Without caching this would be several times more expensive.
- **Reading whole files is the costly mistake.** Almost all the saving came from call 5: the initial skill read the full README and `index.html` (7,101 tokens written), the improved one grepped first (781). Less material read also makes every later call cheaper.
- **Don't re-read what's already in context.** CLAUDE.md is loaded automatically by Claude Code; reading it again pays for it twice.
- **Same quality for less:** the specs from the initial and improved skill are nearly identical, with no meaningful difference in requirements, files, or open questions. The improved skill got the same result for about 18% less.
- **Most remaining cost is fixed overhead** (~33k tokens of tools, system prompt, and skill descriptions). The skill can't reduce it; a cheaper model can, and so can removing unused skills, whose descriptions are sent on every call.

### Single call vs agent loop

|                    | Single API call (Opus) | Claude Code skill (Opus, improved) |
| ------------------ | ---------------------: | ---------------------------------: |
| Model calls        |                      1 |                                  6 |
| Sees the real code |                     no |                                yes |
| Cost per spec      |            ~$0.05–0.07 |                             ~$0.20 |

The skill costs about 3–4× more per spec. It's worth it when better grounding in the real code prevents a wrong spec, since a wrong spec costs far more tokens at implementation time.
