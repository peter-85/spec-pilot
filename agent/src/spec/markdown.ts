import type { Spec } from "./schema.ts";

export function toMarkdown(issueNumber: number, title: string, s: Spec): string {
  const section = (name: string, items: string[]) =>
    `## ${name}\n\n${items.length ? items.map((i) => `- ${i}`).join("\n") : "_None_"}\n`;
  return [
    `# Spec: #${issueNumber} ${title}\n`,
    `## Goal\n\n${s.goal}\n`,
    section("Requirements", s.requirements),
    section("Acceptance criteria", s.acceptance_criteria),
    section("Files likely affected", s.files_likely_affected),
    section("Out of scope", s.out_of_scope),
    section("Open questions", s.open_questions),
  ].join("\n");
}
