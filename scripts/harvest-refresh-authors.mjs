#!/usr/bin/env node
/**
 * One-off runner: regenerate data/harvest/corpus-authors.json from
 * data/corpus.json so merge-circles.mjs computes inPool against the
 * current author pool. Format: [{handle, n}] sorted by tweet count.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const corpus = JSON.parse(await readFile(path.join(ROOT, "data", "corpus.json"), "utf8"));

const counts = new Map();
for (const t of corpus.tweets) {
  counts.set(t.handle, (counts.get(t.handle) ?? 0) + 1);
}
const authors = [...counts.entries()]
  .map(([handle, n]) => ({ handle, n }))
  .sort((a, b) => b.n - a.n);

await writeFile(path.join(ROOT, "data", "harvest", "corpus-authors.json"), JSON.stringify(authors));
console.log(`corpus-authors.json: ${authors.length} authors, ${corpus.tweets.length} tweets`);
