import { readFile, writeFile, mkdir } from "node:fs/promises";
import { getIssue, getRepoFile } from "../github.ts";
import { createMessage } from "../llm/clients.ts";
import { toMarkdown } from "./markdown.ts";
import { parseSpec, submitSpecTool } from "./schema.ts";

const MODEL = process.argv[3] ?? "claude-sonnet-5-5";

const issueNumber = Number(process.argv[2]);

if (!issueNumber) throw new Error("Usage: pnpm spec <issue-number> [model]");

const [systemPrompt, issue, readme, claudeMd] = await Promise.all([
  readFile(new URL("../../prompts/spec-writer.md", import.meta.url), "utf8"),
  getIssue(issueNumber),
  getRepoFile("README.md"),
  getRepoFile("CLAUDE.md"),
]);

const response = await createMessage(
  {
    model: MODEL,
    max_tokens: 8000,
    system: systemPrompt,
    tools: [submitSpecTool],
    tool_choice: { type: "auto" },
    messages: [
      {
        role: "user",
        content:
          `<project_readme>\n${readme}\n</project_readme>\n\n` +
          `<project_claude_md>\n${claudeMd}\n</project_claude_md>\n\n` +
          `<issue number="${issue.number}">\nTitle: ${issue.title}\n` +
          `Labels: ${issue.labels.join(", ")}\n\n${issue.body}\n</issue>`,
      },
    ],
  },
  { task: "spec", issue: issueNumber },
);

if (response.stop_reason === "max_tokens")
  throw new Error("Spec was cut off; raise max_tokens.");

const toolUse = response.content.find((b) => b.type === "tool_use");
if (!toolUse || toolUse.type !== "tool_use")
  throw new Error("Model did not submit a spec.");

const spec = parseSpec(toolUse.input);
await mkdir("specs", { recursive: true });

const file = `specs/issue-${issueNumber}.${MODEL}.md`;
await writeFile(file, toMarkdown(issueNumber, issue.title, spec));

console.log(`Spec saved to ${file}`);
console.log("Usage:", response.usage);
