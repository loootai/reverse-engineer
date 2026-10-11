import { mkdirSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { POST as run, RUNS_PER_MINUTE } from "@/app/api/run/route";
import { proxy } from "@/proxy";
import { resetLimits } from "./limits";

const PW = "test-password-123456";
const H = { host: "localhost:3000", origin: "http://localhost:3000", "content-type": "application/json", "x-forwarded-for": "198.51.100.7" };
const saved = { pw: process.env.APP_ADMIN_PASSWORD, data: process.env.APP_DATA, demo: process.env.NEXT_PUBLIC_DEMO };

const post = (url: string, body: unknown, headers: Record<string, string> = {}) => new Request(`http://localhost:3000${url}`, { method: "POST", headers: { ...H, ...headers }, body: JSON.stringify(body) });
const cookieOf = (res: Response) => /app_session=[^;]+/.exec(res.headers.get("set-cookie") ?? "")?.[0] ?? "";

beforeEach(() => {
  mkdirSync(join(process.cwd(), ".vitest"), { recursive: true });
  const dir = mkdtempSync(join(process.cwd(), ".vitest", "flow-"));
  process.env.APP_DATA = join(dir, "state.json");
  delete process.env.APP_SPEND_CAP_USD;
  delete process.env.LOOOT_TOKEN;
  process.env.APP_ADMIN_PASSWORD = PW;
  delete process.env.NEXT_PUBLIC_DEMO;
  resetLimits();
});
afterEach(() => {
  for (const [k, v] of [["APP_ADMIN_PASSWORD", saved.pw], ["APP_DATA", saved.data], ["NEXT_PUBLIC_DEMO", saved.demo]] as const) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("sign in", () => {
  it("a wrong password gets 401 and no cookie", async () => {
    const res = await login(post("/api/auth/login", { password: "nope-nope-nope-nope" }));
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });
  it("the right password sets a hardened cookie that opens admin routes", async () => {
    const res = await login(post("/api/auth/login", { password: PW }));
    expect(res.status).toBe(200);
    const sc = res.headers.get("set-cookie")!;
    expect(sc).toMatch(/HttpOnly/);
    expect(sc).toMatch(/SameSite=Lax/);
    expect(sc).toMatch(/Max-Age=/);
    const page = await proxy(new NextRequest("http://localhost:3000/people", { headers: { cookie: cookieOf(res) } }));
    expect(page.status).toBe(200);
    expect(page.headers.get("cache-control")).toBe("no-store");
  });
  it("a form post redirects to the page asked for, and never off site", async () => {
    const form = (next: string) => new Request("http://localhost:3000/api/auth/login", { method: "POST", headers: { host: H.host, origin: H.origin, "content-type": "application/x-www-form-urlencoded", "x-forwarded-for": H["x-forwarded-for"] }, body: new URLSearchParams({ password: PW, next }) });
    expect((await login(form("/costs"))).headers.get("location")).toBe("/costs");
    expect((await login(form("//evil.example"))).headers.get("location")).toBe("/");
    expect((await login(form("https://evil.example"))).headers.get("location")).toBe("/");
  });
  it("locks the address after 5 wrong passwords, and the right password does not help until the window ends", async () => {
    for (let i = 0; i < 5; i++) expect((await login(post("/api/auth/login", { password: `wrong-password-${i}-xx` }))).status).toBe(401);
    const locked = await login(post("/api/auth/login", { password: PW }));
    expect(locked.status).toBe(429);
    expect(Number(locked.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(locked.headers.get("set-cookie")).toBeNull();
  });
  it("refuses a sign-in posted from another site", async () => {
    const res = await login(post("/api/auth/login", { password: PW }, { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
  });
  it("sign out clears the cookie, and only for a same-site request", async () => {
    const ok = await logout(post("/api/auth/logout", {}));
    expect(ok.headers.get("set-cookie")).toMatch(/Max-Age=0/);
    expect((await logout(post("/api/auth/logout", {}, { origin: "https://evil.example" }))).status).toBe(403);
  });
});

describe("CSRF on state-changing admin requests", () => {
  async function session() {
    const res = await login(post("/api/auth/login", { password: PW }));
    const cookie = cookieOf(res);
    const { csrfToken, verifySession } = await import("./session");
    const s = (await verifySession(process.env, cookie.split("=")[1]))!;
    return { cookie, token: await csrfToken(process.env, s.sid) };
  }
  const quote = { items: ["acme.example"], dryRun: true };
  it("rejects a cross-site origin even with a valid session", async () => {
    const { cookie, token } = await session();
    const res = await run(post("/api/run", quote, { cookie, "x-app-csrf": token, origin: "https://evil.example" }));
    expect(res.status).toBe(403);
  });
  it("rejects a same-origin request without the token, or with someone else's", async () => {
    const { cookie } = await session();
    expect((await run(post("/api/run", quote, { cookie }))).status).toBe(403);
    expect((await run(post("/api/run", quote, { cookie, "x-app-csrf": "AAAA" }))).status).toBe(403);
  });
  it("accepts a same-origin request with the session token", async () => {
    const { cookie, token } = await session();
    const res = await run(post("/api/run", quote, { cookie, "x-app-csrf": token }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
  it("a request with no Origin and no fetch metadata is refused", async () => {
    const { cookie, token } = await session();
    const res = await run(new Request("http://localhost:3000/api/run", { method: "POST", headers: { host: H.host, cookie, "x-app-csrf": token }, body: JSON.stringify(quote) }));
    expect(res.status).toBe(403);
  });
});

describe("spend cap and rate limit on /api/run", () => {
  async function ok() {
    const res = await login(post("/api/auth/login", { password: PW }));
    const cookie = cookieOf(res);
    const { csrfToken, verifySession } = await import("./session");
    const s = (await verifySession(process.env, cookie.split("=")[1]))!;
    return { cookie, "x-app-csrf": await csrfToken(process.env, s.sid) };
  }
  it("takes the cap from server config and ignores capUsd in the body", async () => {
    const h = await ok();
    process.env.APP_SPEND_CAP_USD = "0.5";
    const res = await run(post("/api/run", { items: ["acme.example"], dryRun: true, capUsd: 9999 }, h));
    expect((await res.json()).quote.capMicros).toBe(500_000);
  });
  it("uses 1 dollar when the server cap is unset or invalid, and never more than the ceiling", async () => {
    const h = await ok();
    for (const [value, micros] of [[undefined, 1_000_000], ["abc", 1_000_000], ["-3", 1_000_000], ["100000", 25_000_000]] as const) {
      if (value === undefined) delete process.env.APP_SPEND_CAP_USD;
      else process.env.APP_SPEND_CAP_USD = value;
      const res = await run(post("/api/run", { items: ["acme.example"], dryRun: true }, h));
      expect((await res.json()).quote.capMicros, String(value)).toBe(micros);
    }
  });
  it("limits paid runs per session and does not limit quotes", async () => {
    const h = await ok();
    for (let i = 0; i < RUNS_PER_MINUTE; i++) expect((await run(post("/api/run", { items: ["acme.example"], dryRun: false }, h))).status).toBe(503);
    const res = await run(post("/api/run", { items: ["acme.example"], dryRun: false }, h));
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
    expect((await run(post("/api/run", { items: ["acme.example"], dryRun: true }, h))).status).toBe(200);
  });
});

describe("demo mode", () => {
  it("is open with no session, runs on sample data, and still refuses a cross-site post", async () => {
    delete process.env.APP_ADMIN_PASSWORD;
    process.env.NEXT_PUBLIC_DEMO = "1";
    const open = await run(post("/api/run", { items: ["acme.example"], dryRun: true }));
    expect(open.status).toBe(200);
    expect((await run(post("/api/run", { items: ["acme.example"], dryRun: true }, { origin: "https://evil.example" }))).status).toBe(403);
  });
  it("refuses to open next to a real token", async () => {
    delete process.env.APP_ADMIN_PASSWORD;
    process.env.NEXT_PUBLIC_DEMO = "1";
    process.env.LOOOT_TOKEN = "lt_real_looking_token";
    expect((await run(post("/api/run", { items: ["acme.example"], dryRun: true }))).status).toBe(503);
  });
});
