---
name: rebuild-on-looot
description: "Take a reverse engineering report and build the looot version of the product: map each capability the mechanism needs to real looot jobs from the free catalog, mark each as covered, partly covered or missing, decide what to drop, then scaffold a working project (demo mode, headless CLI with --dry-run, web UI, tests with mocked HTTP, spend cap and idempotency). Use when the user says: rebuild this on looot, build an open-source version of X, clone this with looot, what would it take to build X on looot, turn this report into an app, make our own version of this tool."
---

# Rebuild on looot

Turn a "how it works" report into a small working product on one looot key. The catalog decides what is possible. Anything it cannot supply is dropped or requested, never faked.

## When to use

- You have a report from `reverse-engineer`, or the user names a target and wants the full route. If there is no report, run `reverse-engineer` first.
- The goal is a real small product the user can run, not a script and not a mock.
- Not for copying a product. See the limits below.

## Limits

- Build from the mechanism and the capabilities. Do not copy the original's code, text, logos, screenshots or trade dress.
- Do not name or style the project so it can pass as the original. Say "an open-source alternative to X" once in the README, with X's public starting price and the date you read it, and add "not affiliated with X".
- Use only the public data the report came from. Do not add steps that need someone else's login.
- Anything that identifies a person needs a lawful basis and consent. Leave it off by default, and say so in the README.
- No paid looot calls while building or testing. The build uses fixtures and mocked HTTP.

## Inputs

- A report file from `reverse-engineer` (its "what the mechanism needs" table), or a target name.
- A project folder name, such as `<service>-on-looot`.
- A default spend cap for one run. Default $1.

## Steps

### 1. Read the capabilities

Take the "what the mechanism needs" table. One row per capability, each with its tag (observed, inferred, unknown). Keep the tags. An inferred capability that no catalog job covers is the first one to drop.

### 2. Map each capability to the catalog (free reads, no sign-in)

For each capability, search the catalog with at least two phrasings. Use plain words ("IP to company", "company from ip address").

- `GET https://api.looot.ai/v1/catalog/overview?depth=jobs` lists every job id with its cheapest price.
- `GET https://api.looot.ai/v1/public-catalog?q=<words>` lists endpoints with provider, price and verification state.
- `node scripts/catalog-search.mjs "<words>" "<other words>"`, run from this skill's folder, runs both for each phrase and prints a table.

For each hit, write down the job id (as `job:<id>`), one or two example endpoints, the list price per call or per result, and whether it runs now. Take only ids that appear in the catalog. Never invent one. Inspect the job (free, needs a sign-in) for exact input names when you can. Without a sign-in, say the input names are unconfirmed.

Write the capability map as a table:

| Capability | Tag | looot job | List price | Status | Note |
|---|---|---|---|---|---|
| IP to approximate location | observed | `job:ip.lookup` | from $0 | covered | |
| Daily salted hash id | observed | none | none | own code | a few lines, no data needed |

Read the script output in this order. The first list, "jobs the matching endpoints belong to", is usually the right one. The second list matches job names word by word and is noisy, so read the titles before you trust a row.

Status is one of:

- own code: plain code does it and no data supplier is needed (hashing, parsing a user agent, stripping a query string, a cache). This is not a gap. Say so, and list it as work in the plan.
- covered: a job does the whole capability.
- partly covered: a job does part of it, or only in some cases. Say which part.
- missing: no job. Search again with different words before you write this. If still missing, go to step 4.

### 3. Decide what to drop

Drop a capability when one of these is true, and write the reason next to it:

- The catalog has nothing and the capability is not the core of the product.
- It needs a login, a bypass or data the report could not observe.
- It identifies a person without a clear lawful basis. Keep it as an off-by-default slot, or drop it.
- It is a hosted-service feature that a local tool cannot honestly offer (shared inboxes, multi-user, uptime).
- A price makes the typical run absurd. Say what the run would cost and let the user choose.

If the catalog lacks the capability that is the whole point of the product, stop and tell the user. Offer the closest product the catalog can serve, or run `request-provider`.

### 4. Request what is missing

For each missing capability that matters, run `request-provider`. Carry on with what exists. Mark the feature "waiting on a provider" in the README. Do not stub it with fake data in real mode.

### 5. Write the plan

Before any code, write `PLAN.md` for the user with: the capability map, the drop list with reasons, the signals or steps in the pipeline, the typical run and its list-price cost, and the spend cap. Ask for a yes. Then build.

### 6. Scaffold from the template

Copy `template/` from this repository into the project folder. If this skill was installed alone, clone `https://github.com/loootai/reverse-engineer` and copy `template/` from it.

Before installing anything in the copy, run the pin-guard or supply-chain scan your setup uses. Install with `--ignore-scripts`. Keep every version pinned exactly. Never run an npx command without an exact version.

The template gives you:

- `src/lib/looot.ts`: the client. Run with wait, poll, idempotency, error mapping.
- `src/lib/budget.ts` and `src/lib/ledger.ts`: spend cap and cost ledger.
- `src/lib/quote.ts`: the quote from list prices.
- `src/jobs.ts`: the jobs the app uses. Edit this first.
- `src/engine/pipeline.ts`: where the product logic goes.
- `src/demo/`: sample data and a fake runner.
- `src/cli/`: the headless command.
- `src/app/`: the web UI with a sidebar shell.
- `src/proxy.ts` and `src/lib/auth/`: the admin gate (session cookie, password check, lockout, CSRF, route map). It ships with its tests. Keep all of it.

Rename the app, set the port, rename the `APP_` environment prefix if you like (change `src/lib/auth`, `.env.example`, `scripts/` and the README together), and fill `src/jobs.ts` with the jobs from step 2. The shared tests use their own test job, so they stay green after you change `src/jobs.ts`. The demo runner reads the first string in each input as the item, so replace its sample rows in `src/demo/fixtures.ts` with data that fits your product.

### 7. Build the engine

Rules every rebuild follows:

- The engine has no framework imports. The CLI and the web UI both call it.
- Quote before any paid action. Show the quoted cost, the job id and the provider behind each line.
- Enforce a spend cap per run, checked before every call, including calls running in parallel.
- Send a stable `idempotencyKey` per input and job, such as `<app>:<job>:<input>`. A retry never pays twice.
- A run that is still queued or running when waiting stops is pending. Store it as pending and collect it on the next run with the same key. Never record it as failed at $0.
- Map errors: 401 stops the run (bad token), 402 stops the run (balance), 429 backs off, other failures are recorded per call. A failed call is not charged.
- Score with signals you can list. Every score shows the signals behind it, the provider that supplied each, its weight and its cost. Weights live in a config file the user can edit. No hidden constants and no invented precision.
- Parsers read defensively and mark `shapeVerified: false` until they were checked against a real response.

### 8. Three ways to run

- Demo: `npm run demo`. Sample data, no token, no network, costs nothing. Use reserved example domains and documentation IP ranges, never real people or companies.
- Headless CLI: one command that takes a file or list and writes JSON, CSV and markdown. `--dry-run` prints the list-price quote and makes no call. A real run needs `LOOOT_TOKEN` and exits 2 when it is missing.
- Web UI: the same engine behind a sidebar app. Outside the demo it sits behind the admin gate from the template. Keep it. See the gate checklist below.

### Admin gate checklist (required in every scaffolded app)

A generated web UI that can spend on the user's looot token must not be open to whoever reaches it. Before you call the project done, every line is true:

- [ ] `src/proxy.ts` and `src/lib/auth/` are present and unchanged in behavior: signed httpOnly SameSite=Lax cookie (Secure in production, with expiry), constant-time password check, lockout after repeated failures, CSRF token plus same-origin check on every state-changing admin request.
- [ ] Every page and route handler you add is listed in `src/lib/auth/routes.ts` and calls `await requireAdminPage()` (pages) or `await requireAdminRoute(req)` (route handlers). A path not listed is admin. Only health, sign-in and sign-out, static files and a third-party receiver you name are public.
- [ ] Any route that spends takes its cap from server config (`APP_SPEND_CAP_USD`), never from the request, goes through the quote step, and has a per-session rate limit.
- [ ] A webhook receiver, if you add one, is public but verifies the sender's signature or shared secret and rejects everything else.
- [ ] The client sends the CSRF token with `adminFetch`, not bare `fetch`, on every call to an admin route.
- [ ] Demo mode is open with the "Demo, no sign-in" badge and refuses to start next to a real `LOOOT_TOKEN` or data file.
- [ ] The generated project passes its own gate tests: `npm test` runs `src/lib/auth/routeMap.test.ts`, `routeGate.test.ts` and `flow.test.ts`. They read `src/app` from disk, so a new route with no gate fails them. Add a test for each route you add that proves it answers 401 without a session.
- [ ] The README has a "Securing a deployment" section: what is public, what is admin, the environment variables, the in-memory rate limit note, and the stronger option of a VPN or identity-aware proxy. Start from the template README.

### 9. Test

Write tests first where you can, and keep the failing run. Unit tests use mocked HTTP for the client, the engine, scoring and the CLI. Cover: quote math, cap stops a run, same key sent twice, pending is not failed, 401 and 402 stop the run, a dry run makes no call.

Run tests (the gate tests included), typecheck, lint and build. Start the app outside the demo with a dummy password and confirm with curl that `/` and `/api/run` are closed without a cookie. Keep the real output.

### 10. README and the status section

The README has: what it is in two sentences, a "Securing a deployment" section, what it replaces and at what public price (with the date), a quickstart with no paid call, the signals table with job ids and prices, the cost of a typical run at list price, what was dropped and why, what was requested, how the money rules work, and the install-for-agents block.

End with an honest Status section. State plainly:

- That no paid looot run was made, if that is true.
- Which parsers were built from docs and fixtures and not from a real response.
- Which catalog entries are marked unverified.
- Which steps were never exercised against a live service.

Do not write "works" about anything that ran only against mocks.

## Failure handling

- The catalog search returns nothing in a category: try three more phrasings, the job id words, and the overview list before calling it missing.
- The only match is marked unverified: use it, and say so in the Status section.
- A job's price is unknown (`price.state` is not `known`): do not quote a number. Show "price not published" and let the cap stop the run.
- The template fails its own checks after your edits: fix before you add features.
- A gate test fails after you add a route: add the route to `src/lib/auth/routes.ts` and call the gate in it. Never loosen the test.

## Example

A report says a visitor identification tool needs "IP to company". Searches for "ip to company", "company from ip" and "reverse ip lookup" find `job:ip.lookup` (from $0) and `job:ip.enrich` ($0.28 a match). Status: covered. The report also needs "browser to hashed email". Searches for "hashed email", "visitor identification" and "identity graph" return endpoints that create a hash and endpoints that read one, and none that turns a browser into a hash. Status: missing. Decision: ship company level only, keep person level as an off-by-default slot that takes the user's own hashes or supplier, and request the missing supplier. The finished version of this case is in `examples/rb2b-to-looot-reveal.md`.

## Related

Run `reverse-engineer` before this skill and `request-provider` for anything missing.
