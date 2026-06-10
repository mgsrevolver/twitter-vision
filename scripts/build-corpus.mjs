#!/usr/bin/env node
/**
 * Verifies every tweet in data/corpus-sources.json against X's public
 * syndication endpoint (no API key) and writes the validated corpus to
 * data/corpus.json with exact text, author, date, and engagement stats.
 *
 * Tweets that 404, were deleted, or whose author no longer matches the
 * expected handle are dropped and reported. Run: npm run corpus
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const SOURCES = path.join(ROOT, "data", "corpus-sources.json");
const OUT = path.join(ROOT, "data", "corpus.json");

async function fetchTweet(id) {
  const url = `https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=x`;
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (corpus-builder)" },
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data || data.__typename === "TweetTombstone" || !data.user) return null;
  return data;
}

const { tweets: sources } = JSON.parse(await readFile(SOURCES, "utf8"));
const verified = [];
const dropped = [];

for (const src of sources) {
  const t = await fetchTweet(src.id);
  // gentle pacing to avoid rate limits
  await new Promise((r) => setTimeout(r, 400));
  if (!t) {
    dropped.push({ ...src, reason: "not found / deleted" });
    continue;
  }
  const actualHandle = t.user.screen_name;
  if (actualHandle.toLowerCase() !== src.handle.toLowerCase()) {
    dropped.push({ ...src, reason: `author mismatch: got @${actualHandle}` });
    continue;
  }
  verified.push({
    id: t.id_str,
    handle: actualHandle,
    name: t.user.name,
    avatar: t.user.profile_image_url_https ?? null,
    verifiedAuthor: !!t.user.is_blue_verified,
    text: t.text,
    createdAt: t.created_at,
    likes: t.favorite_count ?? 0,
    replies: t.conversation_count ?? 0,
    url: `https://x.com/${actualHandle}/status/${t.id_str}`,
    tags: src.tags,
    hasMedia: !!(t.mediaDetails && t.mediaDetails.length),
  });
  console.log(`✓ @${actualHandle}: ${t.text.slice(0, 60).replace(/\n/g, " ")}`);
}

await writeFile(OUT, JSON.stringify({ builtAt: new Date().toISOString(), tweets: verified }, null, 2));
console.log(`\n${verified.length} verified → data/corpus.json`);
if (dropped.length) {
  console.log(`${dropped.length} dropped:`);
  for (const d of dropped) console.log(`  ✗ @${d.handle}/${d.id} — ${d.reason}`);
}
