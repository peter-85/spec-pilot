import { DatabaseSync } from "node:sqlite";
import { writeFile, mkdir } from "node:fs/promises";

const db = new DatabaseSync(new URL("../usage.db", import.meta.url));

type Row = {
  model: string;
  calls: number;
  avg_in: number;
  avg_out: number;
  avg_ms: number;
  avg_cost: number;
  total_cost: number;
};

const rows = db
  .prepare(
    `
  SELECT model,
         COUNT(*)                  AS calls,
         ROUND(AVG(input_tokens))  AS avg_in,
         ROUND(AVG(output_tokens)) AS avg_out,
         ROUND(AVG(duration_ms))   AS avg_ms,
         AVG(cost_usd)             AS avg_cost,
         SUM(cost_usd)             AS total_cost
  FROM llm_calls
  GROUP BY model
  ORDER BY avg_cost
`,
  )
  .all() as Row[];

const usd = (n: number) => `$${n.toFixed(5)}`;

const table = [
  "| Model | Calls | Avg input tokens | Avg output tokens | Avg time | Avg cost | Total cost |",
  "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
  ...rows.map(
    (r) =>
      `| ${r.model} | ${r.calls} | ${r.avg_in} | ${r.avg_out} | ` +
      `${(r.avg_ms / 1000).toFixed(1)} s | ${usd(r.avg_cost)} | ${usd(r.total_cost)} |`,
  ),
].join("\n");

const report = `# Cost report

Generated: ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC

${table}
`;

const outDir = new URL("../../docs/", import.meta.url);
await mkdir(outDir, { recursive: true });
await writeFile(new URL("cost-report.md", outDir), report);

console.table(rows);
console.log("Report written to docs/cost-report.md");
