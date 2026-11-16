import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  listOpenIssues,
  getIssue,
  addComment,
  createBranch,
  createPullRequest,
} from "@spec-pilot/github";

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

server.registerTool(
  "add_comment",
  {
    title: "Add comment",
    description:
      "Comment on a GitHub issue or pull request. Use for questions or status updates. Returns the comment URL.",
    inputSchema: {
      ...repoParams,
      number: z.number().int().describe("Issue or pull request number"),
      body: z.string().min(1).describe("Comment text (Markdown)"),
    },
  },
  async ({ owner, repo, number, body }) => {
    try {
      return text(await addComment(number, body, { owner, repo }));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  "create_branch",
  {
    title: "Create branch",
    description:
      "Create a new branch from the current tip of another branch. Use before committing work for a pull request. Fails if the branch already exists.",
    inputSchema: {
      ...repoParams,
      branch: z.string().min(1).describe("New branch name, e.g. feat/issue-3"),
      from: z
        .string()
        .default("main")
        .describe("Branch to start from (default: main)"),
    },
  },
  async ({ owner, repo, branch, from }) => {
    try {
      await createBranch(branch, from, { owner, repo });
      return text(`Created branch ${branch} from ${from}.`);
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  "create_pull_request",
  {
    title: "Create pull request",
    description:
      "Open a pull request from a branch that already has commits. Use when the work for an issue is ready for review. Returns the pull request URL.",
    inputSchema: {
      ...repoParams,
      title: z.string().min(1).describe("Pull request title"),
      head: z.string().min(1).describe("Branch with the changes"),
      base: z
        .string()
        .default("main")
        .describe("Branch to merge into (default: main)"),
      body: z
        .string()
        .describe("Pull request description (Markdown); mention the issue, e.g. 'Closes #3'"),
    },
  },
  async ({ owner, repo, title, head, base, body }) => {
    try {
      return text(
        await createPullRequest({ title, head, base, body }, { owner, repo }),
      );
    } catch (err) {
      return fail(err);
    }
  },
);

await server.connect(new StdioServerTransport());
console.error("github-mcp-server running on stdio");
