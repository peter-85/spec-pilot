import { DatabaseSync } from "node:sqlite";
import { writeFile, mkdir } from "node:fs/promises";

const db = new DatabaseSync(new URL("../usage.db", import.meta.url));

type Row = {
  model: string;
  task: string;
  calls: number;
  avg_prompt: number; // uncached input + cache read + cache write
  avg_in: number; // uncached input only
  avg_cache_read: number;
  avg_cache_write: number;
  avg_out: number;
  avg_ms: number;
  avg_cost: number;
  total_cost: number;
};

const rows = db
  .prepare(
    `
  SELECT model,
         task,
         COUNT(*)                                                          AS calls,
         ROUND(AVG(input_tokens + cache_read_tokens + cache_write_tokens)) AS avg_prompt,
         ROUND(AVG(input_tokens))                                          AS avg_in,
         ROUND(AVG(cache_read_tokens))                                     AS avg_cache_read,
         ROUND(AVG(cache_write_tokens))                                    AS avg_cache_write,
         ROUND(AVG(output_tokens))                                         AS avg_out,
         ROUND(AVG(duration_ms))                                           AS avg_ms,
         AVG(cost_usd)                                                     AS avg_cost,
         SUM(cost_usd)                                                     AS total_cost
  FROM llm_calls
  GROUP BY task, model
  ORDER BY task, avg_cost
`,
  )
  .all() as Row[];

const usd = (n: number) => `$${n.toFixed(5)}`;

const table = [
  "| Model | Task | Calls | Avg prompt tokens | Avg input tokens | Avg cache read | Avg cache write | Avg output tokens | Avg time | Avg cost | Total cost |",
  "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ...rows.map(
    (r) =>
      `| ${r.model} | ${r.task} | ${r.calls} | ${r.avg_prompt} | ${r.avg_in} | ${r.avg_cache_read} | ` +
      `${r.avg_cache_write} | ${r.avg_out} | ${(r.avg_ms / 1000).toFixed(1)} s | ` +
      `${usd(r.avg_cost)} | ${usd(r.total_cost)} |`,
  ),
].join("\n");

const report = `# Cost report

Generated: ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC

"Avg prompt tokens" is the full prompt: uncached input + cache read + cache write.
"Avg input tokens" is the uncached part of the prompt only.

${table}
`;

const outDir = new URL("../../docs/", import.meta.url);
await mkdir(outDir, { recursive: true });
await writeFile(new URL("cost-report.md", outDir), report);

console.table(rows);
console.log("Report written to docs/cost-report.md");
