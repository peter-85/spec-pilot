import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL, parseSpecArgs } from "./args.ts";

describe("parseSpecArgs", () => {
  it("uses the default model without caching", () => {
    expect(parseSpecArgs(["3"])).toEqual({
      issueNumber: 3,
      model: DEFAULT_MODEL,
      cache: false,
    });
  });

  it("reads the model and --cache", () => {
    expect(parseSpecArgs(["3", "claude-haiku-5-5", "--cache"])).toEqual({
      issueNumber: 3,
      model: "claude-haiku-5-5",
      cache: true,
    });
  });

  // Regression: argv[3] was read as the model, so "--cache" became the model name
  it("accepts --cache without a model", () => {
    expect(parseSpecArgs(["3", "--cache"])).toEqual({
      issueNumber: 3,
      model: DEFAULT_MODEL,
      cache: true,
    });
  });

  it("accepts --cache before the other arguments", () => {
    expect(parseSpecArgs(["--cache", "12", "claude-opus-5-5"])).toEqual({
      issueNumber: 12,
      model: "claude-opus-5-5",
      cache: true,
    });
  });

  it.each([[[]], [["abc"]], [["0"]], [["3.5"]]])(
    "rejects a missing or invalid issue number: %j",
    (args) => {
      expect(() => parseSpecArgs(args)).toThrow("Invalid issue number");
    },
  );

  it("rejects unknown options", () => {
    expect(() => parseSpecArgs(["3", "--cahce"])).toThrow("Usage:");
  });

  it("rejects extra arguments", () => {
    expect(() => parseSpecArgs(["3", "claude-haiku-5-5", "extra"])).toThrow(
      "Unexpected arguments: extra",
    );
  });
});
