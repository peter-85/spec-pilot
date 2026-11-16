import { z } from "zod";

const GITHUB_API = "https://api.github.com";

export type Repo = { owner: string; repo: string };

// The repo SpecPilot works on by default
export const DEFAULT_REPO: Repo = { owner: "peter-85", repo: "to-do-app-node" };

export type Issue = {
  number: number;
  title: string;
  body: string;
  labels: string[];
  url: string;
};

// Shapes of the GitHub responses we read. Only the fields we use are listed;
// zod ignores the rest.
const RawIssue = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string().nullable(),
  labels: z.array(z.object({ name: z.string() })),
  html_url: z.string(),
  pull_request: z.unknown().optional(), // present when the "issue" is a PR
});
const HtmlUrl = z.object({ html_url: z.string() });
const GitRef = z.object({ object: z.object({ sha: z.string() }) });

export class GitHubError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "GitHubError";
  }
}

function headers() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not set.");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

// Every request goes through here: adds auth headers, throws on HTTP errors
async function github(
  path: string,
  init: { method?: string; body?: unknown; accept?: string } = {},
): Promise<Response> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    method: init.method ?? "GET",
    headers: {
      ...headers(),
      ...(init.accept && { Accept: init.accept }),
      ...(init.body !== undefined && { "Content-Type": "application/json" }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (!res.ok) {
    throw new GitHubError(
      res.status,
      `GitHub API ${init.method ?? "GET"} ${path} → ${res.status}: ${await res.text()}`,
    );
  }
  return res;
}

async function githubJson<T>(
  schema: z.ZodType<T>,
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  return schema.parse(await (await github(path, init)).json());
}

const repoPath = ({ owner, repo }: Repo) => `/repos/${owner}/${repo}`;

function toIssue(raw: z.infer<typeof RawIssue>): Issue {
  return {
    number: raw.number,
    title: raw.title,
    body: raw.body ?? "",
    labels: raw.labels.map((l) => l.name),
    url: raw.html_url,
  };
}

export async function listOpenIssues(
  repo: Repo = DEFAULT_REPO,
): Promise<Issue[]> {
  const raw = await githubJson(
    z.array(RawIssue),
    `${repoPath(repo)}/issues?state=open&per_page=50`,
  );
  // GitHub returns pull requests in this list too; skip them
  return raw.filter((i) => !i.pull_request).map(toIssue);
}

export async function getIssue(
  number: number,
  repo: Repo = DEFAULT_REPO,
): Promise<Issue> {
  return toIssue(
    await githubJson(RawIssue, `${repoPath(repo)}/issues/${number}`),
  );
}

/** Returns the file's text, or "" if the file doesn't exist. */
export async function getRepoFile(
  path: string,
  repo: Repo = DEFAULT_REPO,
): Promise<string> {
  try {
    const res = await github(`${repoPath(repo)}/contents/${path}`, {
      accept: "application/vnd.github.raw+json",
    });
    return res.text();
  } catch (err) {
    if (err instanceof GitHubError && err.status === 404) return "";
    throw err;
  }
}

/** Comments on an issue or PR. Returns the comment's URL. */
export async function addComment(
  number: number,
  body: string,
  repo: Repo = DEFAULT_REPO,
): Promise<string> {
  const c = await githubJson(
    HtmlUrl,
    `${repoPath(repo)}/issues/${number}/comments`,
    { method: "POST", body: { body } },
  );
  return c.html_url;
}

/** Creates `branch` pointing at the current tip of `from`. */
export async function createBranch(
  branch: string,
  from = "main",
  repo: Repo = DEFAULT_REPO,
): Promise<void> {
  const ref = await githubJson(
    GitRef,
    `${repoPath(repo)}/git/ref/heads/${from}`,
  );
  await github(`${repoPath(repo)}/git/refs`, {
    method: "POST",
    body: { ref: `refs/heads/${branch}`, sha: ref.object.sha },
  });
}

/** Opens a PR from `head` into `base`. Returns the PR's URL. */
export async function createPullRequest(
  pr: { title: string; head: string; body: string; base?: string },
  repo: Repo = DEFAULT_REPO,
): Promise<string> {
  const created = await githubJson(HtmlUrl, `${repoPath(repo)}/pulls`, {
    method: "POST",
    body: { base: "main", ...pr },
  });
  return created.html_url;
}
