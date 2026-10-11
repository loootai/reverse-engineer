import { NextResponse } from "next/server";
import { isDemo, quoteItems, runItems, uiSpendCapUsd } from "@/lib/app";
import { checkAdmin, denied } from "@/lib/auth/guard";
import { allow, clientIp, retryAfter } from "@/lib/auth/limits";
import { hasLoootToken, LoootError } from "@/lib/looot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

/** Paid runs one session may start per minute. A per-instance brake, see the README. The spend cap is the hard limit. */
export const RUNS_PER_MINUTE = 10;

interface Body {
  items?: unknown;
  dryRun?: unknown;
}

/**
 * POST { items: string[], dryRun: boolean }. A dry run returns the quote and spends nothing.
 * The spend cap comes from server config (APP_SPEND_CAP_USD). A capUsd in the body is ignored.
 */
export async function POST(req: Request) {
  const gate = await checkAdmin(req.method, req.headers);
  if (!gate.ok) return denied(gate);
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Send JSON: { items, dryRun }." }, { status: 400, headers: NO_STORE });
  }
  const items = Array.isArray(body.items) ? body.items.filter((s): s is string => typeof s === "string").map((s) => s.trim()).filter(Boolean) : [];
  if (items.length === 0 || items.length > 500 || items.some((s) => s.length > 200)) return NextResponse.json({ error: "Send 1 to 500 items of at most 200 characters." }, { status: 400, headers: NO_STORE });
  const capUsd = uiSpendCapUsd();

  const quote = await quoteItems(items, capUsd);
  if (body.dryRun !== false) return NextResponse.json({ quote }, { headers: NO_STORE });

  const who = gate.sid ?? `ip:${clientIp(req.headers)}`;
  if (!allow(`run:${who}`, RUNS_PER_MINUTE, 60_000)) return NextResponse.json({ error: "Too many runs. Wait a minute and try again." }, { status: 429, headers: { ...NO_STORE, "Retry-After": String(retryAfter(`run:${who}`) || 60) } });
  if (!isDemo() && !hasLoootToken()) return NextResponse.json({ error: "LOOOT_TOKEN is not set on the server. Set it in .env.local, or start the demo with npm run demo.", quote }, { status: 503, headers: NO_STORE });
  try {
    const run = await runItems(items, capUsd);
    return NextResponse.json({ quote, spentMicros: run.spentMicros, stopped: run.stopped ?? null, results: run.results.map(({ raw: _raw, ...r }) => r) }, { headers: NO_STORE });
  } catch (e) {
    if (e instanceof LoootError) return NextResponse.json({ error: e.message }, { status: 502, headers: NO_STORE });
    throw e;
  }
}
