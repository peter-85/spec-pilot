import { describe, expect, it } from "vitest";
import { toMarkdown } from "./markdown.ts";

const spec = {
  goal: "Add a health endpoint.",
  requirements: ["GET /health returns 200"],
  acceptance_criteria: ["Test hits /health and gets 200"],
  files_likely_affected: ["src/server.ts"],
  out_of_scope: [],
  open_questions: [],
};

describe("toMarkdown", () => {
  it("renders the title and list items", () => {
    const md = toMarkdown(3, "Health check", spec);
    expect(md).toContain("# Spec: #3 Health check");
    expect(md).toContain("- GET /health returns 200");
  });

  it("renders empty lists as _None_", () => {
    const md = toMarkdown(3, "Health check", spec);
    expect(md).toContain("## Out of scope\n\n_None_");
  });
});
