import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBranch, getIssue, getRepoFile, GitHubError } from "./github.ts";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubEnv("GITHUB_TOKEN", "test-token");
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status });

describe("getRepoFile", () => {
  it("sends the auth token and the raw Accept header", async () => {
    fetchMock.mockResolvedValue(new Response("# Readme"));

    expect(await getRepoFile("README.md")).toBe("# Readme");

    const headers = fetchMock.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-token");
    expect(headers.Accept).toBe("application/vnd.github.raw+json");
  });

  it("returns an empty string when the file doesn't exist", async () => {
    fetchMock.mockResolvedValue(new Response("Not Found", { status: 404 }));
    expect(await getRepoFile("missing.md")).toBe("");
  });

  it("throws on other errors", async () => {
    fetchMock.mockResolvedValue(new Response("Forbidden", { status: 403 }));
    await expect(getRepoFile("README.md")).rejects.toBeInstanceOf(GitHubError);
  });
});

describe("createBranch", () => {
  // Reads the sha of the source branch, then creates the new ref at it
  it("creates the branch at the tip of the source branch", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ object: { sha: "abc123" } }))
      .mockResolvedValueOnce(json({}, 201));

    await createBranch("feat/x", "main", { owner: "o", repo: "r" });

    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toBe("https://api.github.com/repos/o/r/git/refs");
    expect(init!.method).toBe("POST");
    expect(JSON.parse(init!.body as string)).toEqual({
      ref: "refs/heads/feat/x",
      sha: "abc123",
    });
  });
});

describe("getIssue", () => {
  it("maps the API response and treats a null body as empty", async () => {
    fetchMock.mockResolvedValue(
      json({
        number: 3,
        title: "Add due dates",
        body: null,
        labels: [{ name: "enhancement" }],
        html_url: "https://github.com/o/r/issues/3",
      }),
    );

    expect(await getIssue(3)).toEqual({
      number: 3,
      title: "Add due dates",
      body: "",
      labels: ["enhancement"],
      url: "https://github.com/o/r/issues/3",
    });
  });

  it("rejects a response with an unexpected shape", async () => {
    fetchMock.mockResolvedValue(json({ number: "3" }));
    await expect(getIssue(3)).rejects.toThrow();
  });

  it("fails clearly when GITHUB_TOKEN is missing", async () => {
    vi.stubEnv("GITHUB_TOKEN", "");
    await expect(getIssue(3)).rejects.toThrow("GITHUB_TOKEN is not set.");
  });
});
