const GITHUB_API = "https://api.github.com";
const OWNER = "peter-85";
const REPO = "to-do-app-node";

const headers = {
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

export type Issue = {
  number: number;
  title: string;
  body: string;
  labels: string[];
  url: string;
};

async function githubGet(path: string) {
  const res = await fetch(`${GITHUB_API}${path}`, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

function toIssue(raw: any): Issue {
  return {
    number: raw.number,
    title: raw.title,
    body: raw.body ?? "",
    labels: raw.labels.map((l: any) => l.name),
    url: raw.html_url,
  };
}

export async function listOpenIssues(): Promise<Issue[]> {
  const raw = await githubGet(
    `/repos/${OWNER}/${REPO}/issues?state=open&per_page=50`,
  );
  // GitHub returns pull requests in this list too; skip them
  return raw.filter((i: any) => !i.pull_request).map(toIssue);
}

export async function getIssue(number: number): Promise<Issue> {
  return toIssue(await githubGet(`/repos/${OWNER}/${REPO}/issues/${number}`));
}

export async function getRepoFile(path: string): Promise<string> {
  const res = await fetch(
    `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${path}`,
    {
      headers: { ...headers, Accept: "application/vnd.github.raw+json" },
    },
  );
  if (res.status === 404) return ""; // file doesn't exist, that's fine
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  return res.text();
}
