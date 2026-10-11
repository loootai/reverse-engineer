# looot app template

A small starter that the `rebuild-on-looot` skill copies. It is TypeScript, Next.js App Router and Tailwind. The client, the spend cap and the sidebar shell come from [looot-reveal](https://github.com/loootai/looot-reveal), cut down to what every rebuild needs.

## What is in it

| Path | What it does |
| --- | --- |
| `src/lib/looot.ts` | The looot client: run with wait, poll, idempotency key, error mapping (401 and 402 stop a run). |
| `src/lib/budget.ts` | Spend cap. Reserves the list price before a call, settles with the real cost. |
| `src/lib/ledger.ts` | Cost ledger. Every call, its key, status and cost. |
| `src/jobs.ts` | The looot jobs the app calls, with list prices. Edit this first. |
| `src/engine/` | Quote, pipeline (the product logic goes here), CSV and markdown reports. No framework imports. |
| `src/demo/` | A stand-in for looot with made-up `.example` companies. |
| `src/cli/` | The headless command with `--dry-run` and `--demo`. |
| `src/app/`, `src/components/` | Web UI with a sidebar shell, a run panel, a jobs page and a costs page. |

## Try it

```bash
npm ci
npm run demo                                   # http://localhost:3600, sample data, no token, no cost
npm run app -- --demo                          # same engine from the terminal
npm run app -- --input items.txt --dry-run     # quote at list price, no call
LOOOT_TOKEN=... npm run app -- --input items.txt --cap 0.50
```

The CLI reads the shell environment, not `.env.local`. The web UI reads `.env.local`. Copy `.env.example` for the UI.

## Money rules

- The quote shows before any paid action, and the Run button shows the most it can spend.
- `--cap` stops the run before a call that would pass it, including calls running in parallel.
- Each call sends a stable idempotency key, `looot-app:<job>:<input>`, so a retry never pays twice.
- A run still queued or running when waiting stops is pending. The next run collects it with the same key. It is never failed at $0.
- A 401 or 402 stops the run. Other failures are recorded for that call only. A failed call is not charged.

## Check it

```bash
npm test && npm run typecheck && npm run lint && npm run build
```

Node 22.12 or newer runs the tests. The web UI has no sign-in. If you deploy it, put your own access control in front.
