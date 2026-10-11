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
| `src/proxy.ts`, `src/lib/auth/` | The admin gate: session cookie, password check, lockout, CSRF, route map. Keep it in every app you scaffold. |
| `src/app/`, `src/components/` | Web UI with a sidebar shell, a run panel, a jobs page, a costs page and a sign-in page. |

## Try it

```bash
npm ci
npm run demo                                   # http://localhost:3600, sample data, no token, no cost
npm run app -- --demo                          # same engine from the terminal
npm run app -- --input items.txt --dry-run     # quote at list price, no call
LOOOT_TOKEN=... npm run app -- --input items.txt --cap 0.50
```

The CLI reads the shell environment, not `.env.local`. The web UI reads `.env.local`. Copy `.env.example` for the UI. Outside the demo the UI needs `APP_ADMIN_PASSWORD` (see [Securing a deployment](#securing-a-deployment)).

## Money rules

- The quote shows before any paid action, and the Run button shows the most it can spend.
- `--cap` stops the run before a call that would pass it, including calls running in parallel.
- In the web UI the cap comes from `APP_SPEND_CAP_USD` on the server (default $1, never above $25). A `capUsd` sent by the caller is ignored.
- Each call sends a stable idempotency key, `looot-app:<job>:<input>`, so a retry never pays twice.
- A run still queued or running when waiting stops is pending. The next run collects it with the same key. It is never failed at $0.
- A 401 or 402 stops the run. Other failures are recorded for that call only. A failed call is not charged.

## Check it

```bash
npm test && npm run typecheck && npm run lint && npm run build
```

Node 22.12 or newer runs the tests.

## Securing a deployment

Every page and API route is either public on purpose or admin. The admin routes are closed until you set a password.

| Class | Routes |
| --- | --- |
| Public | `/login`, `/api/auth/login`, `/api/auth/logout`, `/api/health`, and the static files `/llms.txt`, `/favicon.ico`, `/brand/*` |
| Admin | `/`, `/jobs`, `/costs`, `/api/run` (can spend on your looot token), and any path not listed |

A test reads `src/app` from disk and fails when a route is missing from `src/lib/auth/routes.ts` or an admin route does not call the gate. Add a route, add a line there.

- Set `APP_ADMIN_PASSWORD` (12 characters or more), or `APP_ADMIN_PASSWORD_HASH` from `npm run hash-password -- 'your password'`. Without one, admin routes answer 503 and `/login` says what to set.
- A session is a signed cookie, httpOnly, SameSite=Lax, Secure in production, valid for 8 hours. The password check is constant time. 5 wrong passwords from one address lock it for 15 minutes.
- Every state-changing admin request needs a same-origin `Origin` header and the per-session token in `x-app-csrf`. The layout puts the token in a meta tag and `adminFetch` sends it.
- Admin responses carry `Cache-Control: no-store`. All responses carry a Content-Security-Policy and the usual framing and sniffing headers.
- The spend cap for the web UI comes from `APP_SPEND_CAP_USD` on the server. `/api/run` always quotes first, ignores any cap in the request, and allows 10 paid runs a minute per session.
- Demo mode (`npm run demo`) has no sign-in and shows a "Demo, no sign-in" badge. It will not start, and the app will not serve, next to a `LOOOT_TOKEN` or a data file unless a password is set.

The rate limit and the login lockout count in memory, per server instance. On a host with several instances each one keeps its own count, so treat them as a brake. The cap applies to one run, and runs add up. Set `APP_SPEND_CAP_USD` low, and keep a small balance on the looot token, because the token balance is the only limit that holds across instances.

For anything other people can reach, put the app behind a VPN, a private network or an identity-aware proxy (Cloudflare Access, Tailscale, Google IAP, oauth2-proxy), and keep the password on as well. The address for the lockout comes from `x-forwarded-for`, so run behind a proxy that sets it.
