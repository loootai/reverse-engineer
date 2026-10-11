import { NextResponse } from "next/server";
import { isDemo, MAX_UI_CAP_USD, quoteItems, runItems } from "@/lib/app";
import { hasLoootToken, LoootError } from "@/lib/looot";

export const dynamic = "force-dynamic";

interface Body {
  items?: unknown;
  capUsd?: unknown;
  dryRun?: unknown;
}

/** POST { items: string[], capUsd: number, dryRun: boolean }. A dry run returns the quote and spends nothing. */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Send JSON: { items, capUsd, dryRun }." }, { status: 400 });
  }
  const items = Array.isArray(body.items) ? body.items.filter((s): s is string => typeof s === "string").map((s) => s.trim()).filter(Boolean) : [];
  if (items.length === 0 || items.length > 500 || items.some((s) => s.length > 200)) return NextResponse.json({ error: "Send 1 to 500 items of at most 200 characters." }, { status: 400 });
  const capUsd = typeof body.capUsd === "number" ? body.capUsd : 1;
  if (!Number.isFinite(capUsd) || capUsd < 0 || capUsd > MAX_UI_CAP_USD) return NextResponse.json({ error: `capUsd must be between 0 and ${MAX_UI_CAP_USD}.` }, { status: 400 });

  const quote = await quoteItems(items, capUsd);
  if (body.dryRun !== false) return NextResponse.json({ quote });
  if (!isDemo() && !hasLoootToken()) return NextResponse.json({ error: "LOOOT_TOKEN is not set on the server. Set it in .env.local, or start the demo with npm run demo.", quote }, { status: 503 });
  try {
    const run = await runItems(items, capUsd);
    return NextResponse.json({ quote, spentMicros: run.spentMicros, stopped: run.stopped ?? null, results: run.results.map(({ raw: _raw, ...r }) => r) });
  } catch (e) {
    if (e instanceof LoootError) return NextResponse.json({ error: e.message }, { status: 502 });
    throw e;
  }
}
