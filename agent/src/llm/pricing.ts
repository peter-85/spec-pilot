// USD per million tokens
type Price = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
};

const PRICES: Record<string, Price> = {
  "claude-haiku-5-5": {
    input: 0.1,
    output: 0.5,
    cacheRead: 0.01,
    cacheWrite: 0.125,
  },
  "claude-sonnet-5-5": {
    input: 2.0,
    output: 10.0,
    cacheRead: 0.1,
    cacheWrite: 2.5,
  },
  "claude-opus-5-5": {
    input: 4.0,
    output: 20.0,
    cacheRead: 0.2,
    cacheWrite: 5.0,
  },
};

// Haiku 5.5 bills 5x more when the prompt is over 100K tokens
const HAIKU_LONG = {
  input: 0.5,
  output: 2.5,
  cacheRead: 0.05,
  cacheWrite: 0.625,
};

export type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

export function calculateCost(model: string, u: Usage): number {
  let p = PRICES[model];
  if (!p) throw new Error(`No price for model ${model}; add it to pricing.ts`);

  const cacheRead = u.cache_read_input_tokens ?? 0;
  const cacheWrite = u.cache_creation_input_tokens ?? 0;
  const promptSize = u.input_tokens + cacheRead + cacheWrite;
  if (model === "claude-haiku-5-5" && promptSize > 100_000) p = HAIKU_LONG;

  return (
    (u.input_tokens * p.input +
      u.output_tokens * p.output +
      cacheRead * p.cacheRead +
      cacheWrite * p.cacheWrite) /
    1_000_000
  );
}
