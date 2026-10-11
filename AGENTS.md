# AGENTS.md

How to use this repository from any coding agent (Codex, Cursor, Claude Code and others). No install is needed. Read the skill file, then follow it.

## What this repo is

Eight skills in `skills/<name>/SKILL.md` and a starter app in `template/`.

| Skill | Use it when the user wants to |
| --- | --- |
| `reverse-engineer` | understand how a product, feature or go-to-market motion works from public evidence |
| `rebuild-on-looot` | build the looot version of a product from a reverse engineering report |
| `request-provider` | ask looot for a data source that the catalog does not have |
| `bounded-probe` | test a looot job on a few inputs before a bulk run |
| `site-teardown` | take apart a public website: pages, price, stack, ads, search |
| `evidence-research` | get a company or market brief where every claim has a source |
| `competitor-diff` | compare a competitor with its own earlier snapshot |
| `claims-audit` | find the claims in a document that no source backs |

## Procedure

1. Open the `SKILL.md` that matches the request. Follow its steps in order.
2. Start with the free path: plain GETs of public pages, `GET https://api.looot.ai/v1/catalog/overview?depth=jobs` and `GET https://api.looot.ai/v1/public-catalog?q=<words>`. These need no token.
3. Tag every finding observed, inferred or unknown, with its source.
4. Before any paid looot call, quote it and show the user the number. Ask for a yes above $0.10 or above 100 calls.
5. For a full job, run the skills in this order: `reverse-engineer`, then `rebuild-on-looot`, then `request-provider` for anything missing.

## Connect looot (optional, for paid jobs)

- Claude Code: `claude mcp add --transport http looot https://api.looot.ai/mcp`
- Codex: `codex mcp add looot --url https://api.looot.ai/mcp`, then `codex mcp login looot`
- Cursor: add `{"mcpServers":{"looot":{"url":"https://api.looot.ai/mcp"}}}` to `~/.cursor/mcp.json`
- No MCP: install the CLI with `npm install -g looot`, or call the REST API at `https://api.looot.ai` with `Authorization: Bearer $LOOOT_TOKEN`.

The sign-in happens in the browser. Never print, log or commit a token.

## looot call rules

- Quote first. `inspect` is free and shows the exact input names and the maximum cost. There is no dry-run call. Inspect is the quote. It needs a sign-in. Without one, read the price from the public catalog.
- Every run carries a stable `idempotencyKey`. Reuse it to retry the same call. The same key with a different input returns `409 idempotency_conflict`, so use a new key for a new input.
- A job id looks like `job:company.enrich`. Run it with `fallback: true` and `maxCostUsd` set to twice the quoted price.
- Read `status`, not only the HTTP code. `queued`, `running`, `pending_provider` and `reconciliation_pending` mean pending, not failed. A failed call costs nothing.
- A 402 means the balance is low. Show the user the top-up link (minimum $5). Never pay for them.
- Wrong or empty answer: send `feedback` with the run id and no personal data.

## Hard limits

- Public information only. No logging in to accounts you do not own. No bypassing access controls. No scraping behind a login.
- Read public scripts as text. Never run untrusted code.
- Respect robots.txt and terms. Send nothing to the target.
- Do not copy the target's code, text, logos or screenshots. Do not imitate its brand.
- Do not publish, deploy or file anything without the user's yes.

## Writing rules

Plain words, sentence case, short sentences. No em dashes. No hype. Every number has a source or a run id.

## Check your work

```bash
npm run check                                   # lints the skills and checks every job id against the live catalog
cd template && npm test && npm run typecheck && npm run lint && npm run build
```
