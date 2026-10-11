#!/usr/bin/env node
// Lints every skill in skills/ and the docs around it. Run: npm run check
//
// Per SKILL.md: frontmatter present, name matches the folder, description has trigger phrases.
// Per text file: no internal paths, no em or en dashes, no unpinned npx, every relative link resolves.
// Across the repo: every `job:<id>` it mentions exists in the live looot catalog.
//
// Flags:
//   --catalog <file>   read the catalog overview from a saved JSON file instead of the network
//   --offline          skip the job id check (prints a warning)
// Node 18 or newer. No dependencies. Exit 0 clean, 1 findings, 2 usage or network error.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OVERVIEW_URL = "https://api.looot.ai/v1/catalog/overview?depth=jobs";
const argv = process.argv.slice(2);
const offline = argv.includes("--offline");
const catalogFlag = argv.indexOf("--catalog");
const catalogFile = catalogFlag >= 0 ? argv[catalogFlag + 1] : null;

const findings = [];
const add = (file, msg) => findings.push(`${relative(ROOT, file) || file}: ${msg}`);

const SKIP_DIRS = new Set([".git", "node_modules", ".next", "coverage", "out"]);
const TEXT_EXT = new Set([".md", ".mjs", ".js", ".ts", ".tsx", ".json", ".yml", ".yaml", ".txt", ".css", ".html", ".sh", ".py", ".mts"]);

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

const extOf = (f) => {
  const i = f.lastIndexOf(".");
  return i < 0 ? "" : f.slice(i);
};
const allFiles = walk(ROOT);
const textFiles = allFiles.filter((f) => TEXT_EXT.has(extOf(f)) && !f.endsWith("package-lock.json") && !f.endsWith("scripts/check.mjs") && !f.endsWith("scripts/leak-scan.sh"));

// Built from pieces so this file does not trip its own rule.
const INTERNAL = [
  ["a local home path", new RegExp("/Us" + "ers/[A-Za-z0-9._-]+/")],
  ["a local home path", new RegExp("/ho" + "me/[A-Za-z0-9._-]+/")],
  ["an internal notes folder", new RegExp("~/\\.cos" + "et|/\\.cos" + "et/")],
  ["an internal repo name", new RegExp("cos" + "et-gateway", "i")],
  ["an internal host", new RegExp("onren" + "der\\.com|supa" + "base\\.co|:8" + "787")],
  ["a person's name in public text", new RegExp("\\bWal" + "id\\b")],
  ["a personal email address", new RegExp("[A-Za-z0-9._%+-]+@(gmail|outlook|hotmail|yahoo|icloud)\\.[a-z]+")],
];

// 1. Skills
const skillsDir = join(ROOT, "skills");
const skillDirs = readdirSync(skillsDir).filter((n) => statSync(join(skillsDir, n)).isDirectory());
const EXPECTED = ["reverse-engineer", "rebuild-on-looot", "request-provider", "bounded-probe", "site-teardown", "evidence-research", "competitor-diff", "claims-audit"];
for (const n of EXPECTED) if (!skillDirs.includes(n)) add(skillsDir, `missing skill folder ${n}`);

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const k = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (!k) continue;
    let v = k[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[k[1]] = v;
  }
  return out;
}

for (const dir of skillDirs) {
  const file = join(skillsDir, dir, "SKILL.md");
  if (!existsSync(file)) {
    add(join(skillsDir, dir), "no SKILL.md");
    continue;
  }
  const text = readFileSync(file, "utf8");
  const fm = parseFrontmatter(text);
  if (!fm) {
    add(file, "no frontmatter");
    continue;
  }
  if (!fm.name) add(file, "frontmatter has no name");
  else if (fm.name !== dir) add(file, `name "${fm.name}" does not match folder "${dir}"`);
  if (!fm.description) add(file, "frontmatter has no description");
  else {
    const d = fm.description;
    if (!/\b(use when|the user says|when the user)\b/i.test(d)) add(file, 'description has no trigger phrases (add "Use when the user says: ...")');
    if ((d.match(/,/g) ?? []).length < 4) add(file, "description lists fewer than 5 trigger phrases");
    if (d.length > 1024) add(file, `description is ${d.length} characters, the limit is 1024`);
  }
  for (const h of ["## When to use", "## Failure handling", "## Example"]) if (!text.includes(h)) add(file, `missing section "${h}"`);
  if (dir !== "request-provider" && dir !== "reverse-engineer" && dir !== "rebuild-on-looot" && !/## Output format/.test(text)) add(file, 'missing section "## Output format"');
}

// 2. Text rules
const jobRefs = new Map(); // id -> files
for (const file of textFiles) {
  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    const at = `${i + 1}`;
    if (/[—–]/.test(line)) add(file, `line ${at} has an em or en dash`);
    for (const [label, re] of INTERNAL) if (re.test(line)) add(file, `line ${at} has ${label}`);
    if (/@latest\b/.test(line)) add(file, `line ${at} uses @latest`);
    const npx = line.match(/(?:^|[`$]\s*|&&\s*|;\s*|\|\s*)npx\s+(?:-y\s+|--yes\s+)?([@A-Za-z0-9._/-]+)/);
    if (npx && extOf(file) === ".md" && !/@\d+\.\d+\.\d+/.test(npx[1])) add(file, `line ${at} runs npx without an exact version (${npx[1]})`);
  });
  for (const m of text.matchAll(/(?<![A-Za-z0-9._-])job:([a-z0-9][a-z0-9._-]*)/g)) {
    const id = m[1].replace(/[._-]+$/, "");
    if (!jobRefs.has(id)) jobRefs.set(id, new Set());
    jobRefs.get(id).add(relative(ROOT, file));
  }
  if (extOf(file) === ".md") {
    for (const m of text.matchAll(/(?<!\!)\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const target = m[1];
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      const path = decodeURIComponent(target.split("#")[0]);
      if (!path) continue;
      if (!existsSync(resolve(dirname(file), path))) add(file, `link does not resolve: ${target}`);
    }
    for (const m of text.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const target = m[1];
      if (/^https?:/.test(target)) continue;
      if (!existsSync(resolve(dirname(file), target.split("#")[0]))) add(file, `image does not resolve: ${target}`);
    }
  }
}

// 3. Duplicated helper must stay identical.
const copies = ["rebuild-on-looot", "request-provider"].map((d) => join(skillsDir, d, "scripts", "catalog-search.mjs"));
if (copies.every(existsSync)) {
  if (readFileSync(copies[0], "utf8") !== readFileSync(copies[1], "utf8")) add(copies[1], "differs from the copy in rebuild-on-looot, keep them identical");
} else add(skillsDir, "catalog-search.mjs missing from rebuild-on-looot or request-provider");

// 4. Job ids against the live catalog.
let catalogIds = null;
if (offline) {
  console.warn("warning: --offline, job ids were not checked against the catalog");
} else {
  try {
    let overview;
    if (catalogFile) overview = JSON.parse(readFileSync(resolve(catalogFile), "utf8"));
    else {
      const res = await fetch(OVERVIEW_URL, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      overview = await res.json();
    }
    catalogIds = new Set();
    for (const c of overview.categories ?? []) for (const p of c.platforms ?? []) for (const j of p.jobs ?? []) catalogIds.add(j.id);
    if (catalogIds.size === 0) throw new Error("the overview has no jobs");
    console.log(`catalog revision ${overview.revision}: ${catalogIds.size} jobs, ${jobRefs.size} job ids mentioned here`);
  } catch (e) {
    console.error(`could not read the catalog (${e.message}). Use --offline to skip the job id check or --catalog <file>.`);
    process.exit(2);
  }
}
const unknown = [];
if (catalogIds) {
  for (const [id, files] of jobRefs) if (!catalogIds.has(id)) unknown.push(`job:${id} (in ${[...files].join(", ")})`);
  for (const u of unknown) findings.push(`unknown job id ${u}`);
}

if (findings.length) {
  console.error(`\n${findings.length} finding(s):`);
  for (const f of findings) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`ok: ${skillDirs.length} skills, ${textFiles.length} text files checked${catalogIds ? ", 0 unknown job ids" : ""}`);
