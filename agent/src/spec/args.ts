import { parseArgs } from "node:util";

export const DEFAULT_MODEL = "claude-sonnet-5-5";

export const USAGE = "Usage: pnpm spec <issue-number> [model] [--cache]";

export type SpecArgs = { issueNumber: number; model: string; cache: boolean };

/** Parses the spec writer's CLI arguments (process.argv without node and script). */
export function parseSpecArgs(args: string[]): SpecArgs {
  let parsed;
  try {
    parsed = parseArgs({
      args,
      options: { cache: { type: "boolean", default: false } },
      allowPositionals: true,
      strict: true, // reject unknown options like --cahce
    });
  } catch (err) {
    throw new Error(`${(err as Error).message}\n${USAGE}`);
  }

  const [issue, model = DEFAULT_MODEL, ...extra] = parsed.positionals;
  const issueNumber = Number(issue);

  if (!Number.isInteger(issueNumber) || issueNumber <= 0)
    throw new Error(`Invalid issue number: ${issue ?? "(missing)"}\n${USAGE}`);
  if (extra.length > 0)
    throw new Error(`Unexpected arguments: ${extra.join(" ")}\n${USAGE}`);

  return { issueNumber, model, cache: parsed.values.cache };
}
