import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

/** Single source of truth: the TypeScript type, the runtime check, and the tool's JSON schema all come from this. */
export const SpecSchema = z.object({
  goal: z.string().describe("One or two sentences."),
  requirements: z.array(z.string()).describe("Numbered, testable statements."),
  acceptance_criteria: z
    .array(z.string())
    .describe("What must be true for the change to be done."),
  files_likely_affected: z.array(z.string()),
  out_of_scope: z.array(z.string()),
  open_questions: z
    .array(z.string())
    .describe("Anything the issue left unclear. Never guess silently."),
});

export type Spec = z.infer<typeof SpecSchema>;

// The API doesn't need the "$schema" meta key, so drop it.
const { $schema: _meta, ...specJsonSchema } = z.toJSONSchema(SpecSchema);

export const submitSpecTool: Anthropic.Tool = {
  name: "submit_spec",
  description: "Submit the finished implementation spec.",
  strict: true, // API guarantees the input matches the schema
  input_schema: {
    ...specJsonSchema,
    type: "object",
    additionalProperties: false,
  },
};

/** Validates the model's tool input. Throws a readable error if it doesn't match. */
export function parseSpec(input: unknown): Spec {
  const result = SpecSchema.safeParse(input);
  if (!result.success) {
    throw new Error(
      `Model returned an invalid spec:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}
