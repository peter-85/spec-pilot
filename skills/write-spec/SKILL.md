---
name: write-spec
description: Turn a GitHub issue into an implementation spec saved in specs/. Use when asked to write, draft, or create a spec for an issue, e.g. "/write-spec 12".
---

# Write a spec from a GitHub issue

The argument is the issue number (e.g. `12`). If none is given, ask for it.

## Steps

1. **Find the repository.** Run `git remote get-url origin` and take the owner and repo from the URL.
2. **Read the issue** with the github-specpilot `get_issue` tool.
3. **Learn the project.** CLAUDE.md is already in context; do not re-read it. Read the README only if CLAUDE.md does not cover something the issue touches, and then only the relevant section.
4. **Explore only the code the issue touches.** Start with Grep/Glob to locate it, then read just those files (or the relevant ranges). Skip areas the issue doesn't involve, e.g. skip the frontend for an API-only issue. Base the spec on the real code, not guesses.
5. **Write the spec** to `specs/issue-<number>.md` using the format below. If the file exists, ask before overwriting it.
6. **Report back**: the file path, and a short list of the open questions, blocking ones first.

## Rules

- Requirements and acceptance criteria are specific and testable. Each is one clear sentence.
- Acceptance criteria should be checkable by an automated test where possible.
- In "Files likely affected", name only files you actually found.
- Follow the project's existing conventions and libraries (check CLAUDE.md).
- Keep scope tight. Put tempting extras in "Out of scope". Respect anything the issue marks as out of scope.
- Match the spec's length to the issue's size. A one-line fix gets a short spec.
- No implementation code in the spec.
- Never guess silently. Every decision the issue leaves open becomes an open question with a proposed answer and whether it blocks implementation. A question is blocking if a wrong guess would change the data model, API contract, validation, or tests.
- If the issue assumes functionality the code doesn't have, say so as an open question.
- Status is `draft` while any blocking question is open, otherwise `approved`.
- Do not change any code. This skill only writes the spec.

## Spec format

```md
# Spec: #<number> <issue title>

Status: draft
Issue: <issue URL>

## Goal

<One or two sentences.>
 
## Requirements
 
- <Specific, testable requirement>
 
## Acceptance criteria
 
- <Checkable criterion, ideally as a test>
 
## Files likely affected
 
- `<path>`: <what changes there>
 
## Out of scope
 
- <Item>
 
## Open questions
 
- **Q1:** <question>
  - Proposed: <answer>
  - Blocking: yes | no
 
## Decisions
 
_None yet._
```
