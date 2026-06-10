#!/usr/bin/env node
/**
 * Merges curated account lists from data/harvest/accounts-*.json into
 * data/accounts.json. Existing entries win on conflict; tags are filtered
 * to the taxonomy; output sorted by follower count.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const ALL_TAGS = new Set([
  "tech", "ai", "science", "sports", "music", "film-tv", "gaming",
  "finance", "crypto", "food", "books", "fitness", "animals", "media",
  "humor", "pop-culture", "wholesome", "politics-left", "politics-right", "iconic",
]);

const file = path.join(ROOT, "data", "accounts.json");
const existing = JSON.parse(await readFile(file, "utf8"));
const merged = new Map(existing.accounts.map((a) => [a.handle.toLowerCase(), a]));
const before = merged.size;

const dir = path.join(ROOT, "data", "harvest");
for (const f of await readdir(dir)) {
  if (!f.startsWith("accounts-") || !f.endsWith(".json")) continue;
  let list;
  try {
    list = JSON.parse(await readFile(path.join(dir, f), "utf8"));
  } catch {
    console.error(`skipping unparseable ${f}`);
    continue;
  }
  for (const a of list) {
    if (typeof a?.handle !== "string" || !/^[A-Za-z0-9_]{1,15}$/.test(a.handle)) continue;
    const key = a.handle.toLowerCase();
    if (merged.has(key)) continue;
    const tags = (a.tags ?? []).filter((t) => ALL_TAGS.has(t));
    const followers = Number(a.followers);
    if (!a.name || !tags.length || !Number.isFinite(followers) || followers < 1000) continue;
    merged.set(key, { handle: a.handle, name: a.name, followers: Math.round(followers), tags });
  }
}

const accounts = [...merged.values()].sort((x, y) => y.followers - x.followers);
await writeFile(file, JSON.stringify({ comment: existing.comment, accounts }, null, 1));
console.log(`accounts: ${before} → ${accounts.length}`);
