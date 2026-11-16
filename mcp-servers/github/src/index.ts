import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { listOpenIssues, getIssue } from "@spec-pilot/github";

const server = new McpServer({ name: "github-mcp-server", version: "0.1.0" });

const repoParams = {
  owner: z.string().describe("Repository owner, e.g. peter-85"),
  repo: z.string().describe("Repository name, e.g. to-do-app-node"),
};

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const fail = (err: unknown) => ({ ...text(String(err)), isError: true });

server.registerTool(
  "list_issues",
  {
    title: "List open issues",
    description: "List open issues (not pull requests) in a GitHub repository.",
    inputSchema: repoParams,
  },
  async ({ owner, repo }) => {
    try {
      const issues = await listOpenIssues({ owner, repo });
      return text(
        issues
          .map((i) => `#${i.number} ${i.title} [${i.labels.join(", ")}]`)
          .join("\n") || "No open issues.",
      );
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  "get_issue",
  {
    title: "Get issue",
    description: "Get the title, body, and labels of one GitHub issue.",
    inputSchema: {
      ...repoParams,
      number: z.number().int().describe("Issue number"),
    },
  },
  async ({ owner, repo, number }) => {
    try {
      return text(JSON.stringify(await getIssue(number, { owner, repo }), null, 2));
    } catch (err) {
      return fail(err);
    }
  },
);

await server.connect(new StdioServerTransport());
console.error("github-mcp-server running on stdio");
