# GitHub MCP server

An [MCP](https://modelcontextprotocol.io/) server that lets Claude Code, or any MCP client, read GitHub issues, comment on them, create branches, and open pull requests.

It is a thin layer over the [`@spec-pilot/github`](../../packages/github/) client: each tool checks its arguments with zod, then calls the client. SpecPilot's agents use these tools to go from an issue to a pull request.

## Tools

Every tool takes `owner` and `repo`, so the server works with any repository the token can access.

| Tool | What it does | Other arguments | Returns |
|---|---|---|---|
| `list_issues` | Lists open issues, without pull requests (up to 50) | — | One line per issue: `#3 Title [labels]` |
| `get_issue` | Gets one issue | `number` | The issue as JSON: number, title, body, labels, URL |
| `add_comment` | Comments on an issue or pull request | `number`, `body` (Markdown) | The comment URL |
| `create_branch` | Creates a branch from the tip of another branch | `branch`, `from` (default `main`) | A confirmation message |
| `create_pull_request` | Opens a pull request | `title`, `head`, `body`, `base` (default `main`) | The pull request URL |

Errors (an invalid token, a missing issue, a branch that already exists) come back as an MCP error result with GitHub's status and message. The server keeps running.

> `add_comment`, `create_branch` and `create_pull_request` change the real repository. MCP clients like Claude Code ask for approval before running a tool unless you allow it.

## Requirements

- Node.js 24+. The server runs its TypeScript source directly; there is no build step.
- Dependencies installed from the repo root: `pnpm install`.
- A GitHub token in `GITHUB_TOKEN`. A [fine-grained token](https://github.com/settings/personal-access-tokens) scoped to the target repositories needs:

  | Permission | Needed by |
  |---|---|
  | Issues: read and write | `list_issues`, `get_issue`, `add_comment` |
  | Contents: read and write | `create_branch` |
  | Pull requests: read and write | `create_pull_request` |

  For read-only use, read access to Issues is enough.

## Use it in Claude Code

Add the server, passing the token as an environment variable. Use the absolute path to `src/index.ts`:

```bash
claude mcp add github -e GITHUB_TOKEN=<your-token> -- node <path-to>/spec-pilot/mcp-servers/github/src/index.ts
```

Then check it's connected with `/mcp` inside Claude Code, and ask something like *"List the open issues in peter-85/to-do-app-node"*.

Other MCP clients use the same command: `node <path-to>/src/index.ts`, with `GITHUB_TOKEN` in the environment.

## Run it locally

The server talks over stdio, so running it on its own just waits for a client:

```bash
GITHUB_TOKEN=<your-token> pnpm --filter @spec-pilot/github-mcp-server start
```

To call the tools by hand, use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector -e GITHUB_TOKEN=<your-token> node mcp-servers/github/src/index.ts
```

## Development

```bash
pnpm --filter @spec-pilot/github-mcp-server typecheck
```

- Tool definitions live in [`src/index.ts`](src/index.ts). GitHub API calls belong in [`packages/github`](../../packages/github/github.ts), which has the tests. Keep this server a thin layer that only checks arguments and formats results.
- A tool's description is what the model reads to decide when to call it, so say what the tool does *and when to use it*.

## Limitations

- `list_issues` returns at most 50 issues; there is no pagination yet.
- There is no tool for committing files. `create_pull_request` needs a branch that already has commits, pushed with git or by the agent.
