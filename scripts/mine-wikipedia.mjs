#!/usr/bin/env node
/**
 * Mines real tweet IDs from Wikipedia's {{cite tweet}} templates.
 * Enumerates article pages embedding the template, pulls wikitext in batches,
 * extracts (id, handle) pairs → data/harvest/wikipedia-candidates.json.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "data", "harvest");
const OUT = path.join(OUT_DIR, "wikipedia-candidates.json");
const MAX_PAGES = Number(process.argv[2] ?? 4000);
const API = "https://en.wikipedia.org/w/api.php";
const HEADERS = { "user-agent": "their-feed-corpus-builder/1.0 (personal project)" };

async function api(params, attempt = 0) {
  const url = `${API}?${new URLSearchParams({ format: "json", ...params })}`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      return api(params, attempt + 1);
    }
    console.error(`\nfailed after retries: ${e.message}`);
    return null;
  }
}

// 1. Enumerate pages embedding the template
const titles = [];
let cont = {};
while (titles.length < MAX_PAGES) {
  const d = await api({
    action: "query",
    list: "embeddedin",
    eititle: "Template:Cite tweet",
    einamespace: "0",
    eilimit: "500",
    ...cont,
  });
  if (!d) break;
  titles.push(...d.query.embeddedin.map((p) => p.title));
  if (!d.continue) break;
  cont = d.continue;
}
console.error(`${titles.length} pages enumerated`);

// 2. Fetch wikitext in batches, extract cite-tweet number/user pairs.
// Find each "{{cite tweet" and scan a bounded window after it — avoids
// pathological regex backtracking on huge wikitext.
const candidates = new Map();

function extract(text, source) {
  let idx = 0;
  const lower = text.toLowerCase();
  while ((idx = lower.indexOf("{{cite tweet", idx)) !== -1) {
    const window = text.slice(idx, idx + 800);
    const id = window.match(/\|\s*number\s*=\s*(\d{5,20})/i)?.[1];
    const user = window.match(/\|\s*user\s*=\s*([A-Za-z0-9_]{1,15})/i)?.[1];
    if (id && user && !candidates.has(id)) candidates.set(id, { id, handle: user, source });
    idx += 12;
  }
}

for (let i = 0; i < titles.length; i += 40) {
  const batch = titles.slice(i, i + 40);
  const d = await api({
    action: "query",
    prop: "revisions",
    rvprop: "content",
    rvslots: "main",
    titles: batch.join("|"),
  });
  if (d?.query?.pages) {
    for (const page of Object.values(d.query.pages)) {
      const text = page.revisions?.[0]?.slots?.main?.["*"];
      if (text) extract(text, page.title);
    }
  }
  if ((i / 40) % 10 === 0) {
    console.error(`pages ${Math.min(i + 40, titles.length)}/${titles.length} — ${candidates.size} candidates`);
    await writeFile(OUT, JSON.stringify([...candidates.values()], null, 1)).catch(() => {});
  }
  await new Promise((r) => setTimeout(r, 200));
}

await mkdir(OUT_DIR, { recursive: true });
await writeFile(OUT, JSON.stringify([...candidates.values()], null, 1));
console.error(`done: ${candidates.size} candidates → data/harvest/wikipedia-candidates.json`);
