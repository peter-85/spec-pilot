import Anthropic from "@anthropic-ai/sdk";
import { DatabaseSync } from "node:sqlite";
import { calculateCost } from "./pricing.ts";

const anthropic = new Anthropic();
const dbPath = new URL("../../usage.db", import.meta.url);
const db = new DatabaseSync(dbPath);

db.exec(`CREATE TABLE IF NOT EXISTS llm_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  task TEXT NOT NULL,
  issue INTEGER,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cache_read_tokens INTEGER NOT NULL,
  cache_write_tokens INTEGER NOT NULL,
  cost_usd REAL NOT NULL,
  duration_ms INTEGER NOT NULL,
  stop_reason TEXT
)`);

const insert = db.prepare(`INSERT INTO llm_calls
  (created_at, task, issue, model, input_tokens, output_tokens,
   cache_read_tokens, cache_write_tokens, cost_usd, duration_ms, stop_reason)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

type Meta = { task: string; issue?: number };

export async function createMessage(
  params: Anthropic.MessageCreateParamsNonStreaming,
  meta: Meta,
): Promise<Anthropic.Message> {
  const start = Date.now();
  const response = await anthropic.messages.create(params);
  const duration = Date.now() - start;

  const u = response.usage;
  const cost = calculateCost(params.model, u);

  insert.run(
    new Date().toISOString(),
    meta.task,
    meta.issue ?? null,
    params.model,
    u.input_tokens,
    u.output_tokens,
    u.cache_read_input_tokens ?? 0,
    u.cache_creation_input_tokens ?? 0,
    cost,
    duration,
    response.stop_reason,
  );

  console.log(
    `[${meta.task}] ${params.model}: ${u.input_tokens} in ` +
      `(+${u.cache_read_input_tokens ?? 0} cache read, +${u.cache_creation_input_tokens ?? 0} cache write) ` +
      `/ ${u.output_tokens} out, ` +
      `$${cost.toFixed(5)}, ${duration} ms`,
  );
  return response;
}
