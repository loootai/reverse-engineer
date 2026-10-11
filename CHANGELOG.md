# Changelog

## 0.1.1

Security fix for apps scaffolded from `template/`. Version 0.1.0 shipped a web UI with no sign-in. Anyone who could reach a deployed copy could read stored results and start paid looot runs on the operator's token, and the caller of `/api/run` chose the spend cap. If you built an app from 0.1.0 and run it on a reachable host, copy the new `src/proxy.ts`, `src/lib/auth/`, `src/app/login/`, `src/app/api/auth/` and the changed `api/run` route into it, set `APP_ADMIN_PASSWORD`, and redeploy.

- `template/` now ships the admin gate used by looot-reveal v0.2.1: signed session cookie, password check, lockout, CSRF token plus same-origin check, middleware plus a per-route server check, and a route map with tests generated from `src/app`.
- Spend cap for the web UI comes from `APP_SPEND_CAP_USD` on the server. `/api/run` ignores a cap in the request, always quotes first and allows 10 paid runs a minute per session.
- Demo mode stays open with a "Demo, no sign-in" badge and refuses to start next to a real `LOOOT_TOKEN`.
- Security headers, `Cache-Control: no-store` on admin responses, a "Securing a deployment" README section.
- `rebuild-on-looot` now requires the gate in every scaffolded app (checklist plus passing gate tests) and a "Securing a deployment" section in the generated README.
- `npm run check` fails if the template loses the gate files or the skill loses the checklist.

## 0.1.0

- Eight skills: `reverse-engineer`, `rebuild-on-looot`, `request-provider`, `bounded-probe`, `site-teardown`, `evidence-research`, `competitor-diff`, `claims-audit`.
- `template/`: Next.js starter with a looot client, spend cap, cost ledger, demo mode and a headless CLI with `--dry-run`.
- Three case studies in `examples/`.
- `npm run check` lints the skills and checks every job id against the live catalog.
- Claude Code plugin and marketplace manifests, `AGENTS.md`, `llms.txt`.
