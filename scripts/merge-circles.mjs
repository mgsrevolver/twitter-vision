#!/usr/bin/env node
/**
 * Merges curated interaction circles (data/harvest/circles-*.json) into
 * data/accounts.json as a `circle` field per account. Idempotent — later
 * files win per account; entries are validated and deduped.
 *
 * Input entries: [{handle, circle: [{handle, inPool, why}]}]
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

const accountsFile = path.join(ROOT, "data", "accounts.json");
const data = JSON.parse(await readFile(accountsFile, "utf8"));
const byHandle = new Map(data.accounts.map((a) => [a.handle.toLowerCase(), a]));

// real author pool — recompute inPool ourselves rather than trusting agents
const authors = new Set(
  JSON.parse(await readFile(path.join(ROOT, "data", "harvest", "corpus-authors.json"), "utf8")).map((a) =>
    a.handle.toLowerCase(),
  ),
);

const dir = path.join(ROOT, "data", "harvest");
let applied = 0, skipped = 0, entries = 0;
for (const f of (await readdir(dir)).filter((f) => /^circles-\d+\.json$/.test(f)).sort()) {
  let list;
  try {
    list = JSON.parse(await readFile(path.join(dir, f), "utf8"));
  } catch {
    console.error(`skipping unparseable ${f}`);
    continue;
  }
  for (const item of list) {
    const account = byHandle.get(String(item.handle ?? "").toLowerCase());
    if (!account) { skipped++; continue; }
    const seen = new Set([account.handle.toLowerCase()]);
    const circle = [];
    for (const c of item.circle ?? []) {
      const h = String(c.handle ?? "").replace(/^@/, "");
      const key = h.toLowerCase();
      if (!HANDLE_RE.test(h) || seen.has(key)) continue;
      seen.add(key);
      circle.push({ handle: h, inPool: authors.has(key), why: String(c.why ?? "").slice(0, 60) });
    }
    if (circle.length) {
      account.circle = circle;
      applied++;
      entries += circle.length;
    }
  }
}

await writeFile(accountsFile, JSON.stringify(data, null, 1));
const inPool = data.accounts.flatMap((a) => a.circle ?? []).filter((c) => c.inPool).length;
console.log(`circles merged: ${applied} accounts (${entries} edges, ${inPool} in corpus pool, ${skipped} unknown handles skipped)`);
