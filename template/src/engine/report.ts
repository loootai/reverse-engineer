import type { ItemResult } from "@/lib/types";
import { usd } from "@/lib/money";

const cell = (v: string): string => (/^[=+\-@]/.test(v) ? `'${v}` : v).replaceAll('"', '""');

/** CSV of the results. A cell that starts with = + - or @ gets a leading quote so a spreadsheet does not run it. */
export function renderCsv(results: ItemResult[]): string {
  const rows = results.map((r) => [r.item, r.jobId, r.status, usd(r.costMicros), r.runId, r.error ?? ""].map((c) => `"${cell(String(c))}"`).join(","));
  return ["item,job,status,cost,run_id,note", ...rows].join("\n") + "\n";
}

/** Markdown table of the results with the totals under it. */
export function renderMarkdown(results: ItemResult[], title: string): string {
  const total = results.reduce((n, r) => n + r.costMicros, 0);
  const pending = results.filter((r) => r.status === "pending").length;
  const lines = [`# ${title}`, "", "| Item | Job | Status | Cost | Note |", "| --- | --- | --- | --- | --- |"];
  for (const r of results) lines.push(`| ${r.item} | ${r.jobId} | ${r.status} | ${usd(r.costMicros)} | ${r.error ?? ""} |`);
  lines.push("", `Spent ${usd(total)} on ${results.length} calls.${pending ? ` ${pending} pending: run the same command again to collect them. Pending calls are never charged twice.` : ""}`);
  return lines.join("\n") + "\n";
}
