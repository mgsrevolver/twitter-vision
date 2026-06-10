#!/usr/bin/env node
/**
 * Splits validated tweets into batch files for the tagging agent fleet.
 * Skips tweets that already have a verdict in data/harvest/tagged/.
 *
 * Usage: node scripts/prepare-tagging.mjs [wave-prefix]   (default: "batch")
 * Output: data/harvest/tag-batches/<prefix>-NNN.json
 */
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const BATCH_SIZE = 70;
const PREFIX = process.argv[2] ?? "batch";

const validated = JSON.parse(await readFile(path.join(ROOT, "data", "harvest", "validated.json"), "utf8"));

const tagged = new Set();
const taggedDir = path.join(ROOT, "data", "harvest", "tagged");
try {
  for (const f of await readdir(taggedDir)) {
    if (!f.endsWith(".json")) continue;
    for (const v of JSON.parse(await readFile(path.join(taggedDir, f), "utf8"))) tagged.add(String(v.id));
  }
} catch {}

const dir = path.join(ROOT, "data", "harvest", "tag-batches");
await rm(dir, { recursive: true, force: true });
await mkdir(dir, { recursive: true });

const compact = validated
  .filter((t) => !tagged.has(t.id))
  .map((t) => ({
    id: t.id,
    handle: t.handle,
    name: t.name,
    text: t.text.slice(0, 300),
    likes: t.likes,
    source: t.source,
    seedTags: t.seedTags?.length ? t.seedTags : undefined,
  }));

let n = 0;
for (let i = 0; i < compact.length; i += BATCH_SIZE) {
  await writeFile(
    path.join(dir, `${PREFIX}-${String(n).padStart(3, "0")}.json`),
    JSON.stringify(compact.slice(i, i + BATCH_SIZE), null, 1),
  );
  n++;
}
console.log(`${compact.length} untagged tweets → ${n} batches (${PREFIX}-*) in data/harvest/tag-batches/`);
