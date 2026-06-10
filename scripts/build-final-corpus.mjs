#!/usr/bin/env node
/**
 * Assembles the final corpus from validated tweets + agent tag verdicts.
 *
 * Inputs:
 *   data/harvest/validated.json      — full verified tweet records
 *   data/harvest/tagged/batch-*.json — [{id, tags[], keep}] from tagging agents
 *   data/corpus.json (existing)      — prior corpus, kept as-is
 * Outputs:
 *   data/corpus.json                 — built artifact used by the app
 *   data/corpus-sources.json         — canonical editable {id, handle, tags} list
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const ALL_TAGS = new Set([
  "tech", "ai", "science", "sports", "music", "film-tv", "gaming",
  "finance", "crypto", "food", "books", "fitness", "animals", "media",
  "humor", "pop-culture", "wholesome", "politics-left", "politics-right", "iconic",
]);

const validated = new Map(
  JSON.parse(await readFile(path.join(ROOT, "data", "harvest", "validated.json"), "utf8")).map((t) => [t.id, t]),
);

// media URLs harvested by scripts/backfill-media.mjs — { [id]: MediaItem[] }
let mediaMap = {};
try {
  mediaMap = JSON.parse(await readFile(path.join(ROOT, "data", "harvest", "media-map.json"), "utf8"));
} catch {}

// quote relationships from scripts/backfill-quotes.mjs — { [id]: QuotedTweet | null }
let quoteMap = {};
try {
  quoteMap = JSON.parse(await readFile(path.join(ROOT, "data", "harvest", "quote-map.json"), "utf8"));
} catch {}

// tag verdicts
const verdicts = new Map();
const taggedDir = path.join(ROOT, "data", "harvest", "tagged");
for (const f of await readdir(taggedDir)) {
  if (!f.endsWith(".json")) continue;
  for (const v of JSON.parse(await readFile(path.join(taggedDir, f), "utf8"))) {
    verdicts.set(String(v.id), v);
  }
}

// existing corpus survives untouched (already verified + tagged)
const existing = JSON.parse(await readFile(path.join(ROOT, "data", "corpus.json"), "utf8")).tweets;
const final = new Map(existing.map((t) => [t.id, t]));

let kept = 0, dropped = 0, untagged = 0;
for (const [id, t] of validated) {
  if (final.has(id)) continue;
  const v = verdicts.get(id);
  if (!v) { untagged++; continue; }
  const tags = (v.tags ?? []).filter((x) => ALL_TAGS.has(x));
  if (!v.keep || tags.length === 0) { dropped++; continue; }
  kept++;
  final.set(id, {
    id: t.id,
    handle: t.handle,
    name: t.name,
    avatar: t.avatar,
    verifiedAuthor: t.verifiedAuthor,
    text: t.text,
    createdAt: t.createdAt,
    likes: t.likes,
    replies: t.replies,
    url: t.url,
    tags,
    hasMedia: t.hasMedia,
  });
}

// attach (or refresh) media + quote boxes on every corpus tweet
let withMedia = 0;
let withQuote = 0;
for (const t of final.values()) {
  const media = t.media?.length ? t.media : (mediaMap[t.id] ?? validated.get(t.id)?.media ?? []);
  if (media.length) {
    t.media = media;
    t.hasMedia = true;
    withMedia++;
  } else {
    delete t.media;
    if (t.hasMedia && t.id in mediaMap) t.hasMedia = false; // checked, nothing usable
  }
  const quoted = t.quoted ?? quoteMap[t.id] ?? validated.get(t.id)?.quoted ?? null;
  if (quoted) {
    t.quoted = quoted;
    withQuote++;
  } else {
    delete t.quoted;
  }
}

const tweets = [...final.values()];
await writeFile(
  path.join(ROOT, "data", "corpus.json"),
  JSON.stringify({ builtAt: new Date().toISOString(), tweets }, null, 1),
);
await writeFile(
  path.join(ROOT, "data", "corpus-sources.json"),
  JSON.stringify(
    {
      comment:
        "Canonical corpus list. Add {id, handle, tags} entries and run `npm run corpus` to verify against the live syndication endpoint and rebuild data/corpus.json.",
      tweets: tweets.map((t) => ({ id: t.id, handle: t.handle, tags: t.tags })),
    },
    null,
    1,
  ),
);

const tagCounts = {};
for (const t of tweets) for (const tag of t.tags) tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
console.log(`corpus: ${tweets.length} tweets (${kept} new, ${dropped} dropped by taggers, ${untagged} missing verdicts, ${withMedia} with media, ${withQuote} with quotes)`);
console.log("tag distribution:", JSON.stringify(tagCounts, null, 1));
