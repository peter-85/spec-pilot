# Revise a spec with answers to its open questions

Arguments: the issue number, then the answers, for example:
`12 Q1: full timestamp (timestamptz). Q2: accept proposed. Q3: reject with 400.`

If the issue number is missing, ask for it. If the answers are missing, collect them in step 2.

## Steps

1. **Read the spec** at `specs/issue-<number>.md`. If it doesn't exist, stop and say so.
2. **Collect answers.** If answers weren't passed as arguments, ask about every open question, blocking ones first, in batches of up to 4. Offer each question's proposed answer as the first option. The user may skip a question; leave a skipped question open.
3. **Match each answer to its question.** "accept proposed" (or "yes") means use the question's proposed answer. If an answer is unclear or contradicts another one, ask before changing anything.
4. **Apply each answer to the spec:**
   - Update **Requirements** and **Acceptance criteria** so they reflect the decision. An answer usually changes several places; update them all consistently.
   - Update **Files likely affected** or **Out of scope** if the decision changes them.
   - Add the decision to **Decisions**: the question, the answer, who decided (the user), today's date, and the reason if given.
   - Remove the question from **Open questions**.
5. **Look for new questions.** If an answer raises a decision nobody has made yet (for example, choosing a timestamp raises time zones), add it as a new open question with a proposed answer and a blocking flag. Do not decide it silently.
6. **Repeat.** If step 5 added new questions, ask the user about them right away, blocking ones first, and apply the answers with steps 3–5. Keep going until no new questions come up or the user says stop.
7. **Set the status.** `approved` only if no blocking open questions remain; otherwise keep `draft`.
8. **Report back:** what changed, the decisions made in every round, any questions still open, and the status.

## Rules

- Change only what the answers require. Don't rewrite unrelated parts of the spec.
- Keep the spec format exactly as it is.
- Leave unanswered questions in place, unchanged.
- No implementation code in the spec.
- Do not change any code. This skill only edits the spec.

## Decisions format

```md
## Decisions

- **<Question in short form>**
  <Answer.> Decided by <user>, <YYYY-MM-DD>. Reason: <reason, if given>.
```
