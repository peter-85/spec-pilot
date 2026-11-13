import { describe, expect, it } from "vitest";
import { parseSpec, submitSpecTool } from "./schema.ts";

const valid = {
  goal: "Add a health endpoint.",
  requirements: ["GET /health returns 200"],
  acceptance_criteria: ["Test hits /health and gets 200"],
  files_likely_affected: ["src/server.ts"],
  out_of_scope: [],
  open_questions: [],
};

describe("parseSpec", () => {
  it("accepts a valid spec", () => {
    expect(parseSpec(valid)).toEqual(valid);
  });

  // Regression: claude-haiku-5-5 returned a list field as a string,
  // which crashed toMarkdown with "items.map is not a function".
  it("rejects a list field returned as a string", () => {
    const bad = { ...valid, requirements: "- GET /health returns 200" };
    expect(() => parseSpec(bad)).toThrow(/invalid spec[\s\S]*requirements/);
  });

  it("rejects a missing field", () => {
    const { goal: _goal, ...missingGoal } = valid;
    expect(() => parseSpec(missingGoal)).toThrow(/goal/);
  });
});

describe("submitSpecTool", () => {
  // Strict tool use needs every field required and no extra properties.
  it("generates a strict-compatible input schema from SpecSchema", () => {
    const schema = submitSpecTool.input_schema;
    expect(schema.type).toBe("object");
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(Object.keys(valid));
    expect(schema).not.toHaveProperty("$schema");
  });
});
