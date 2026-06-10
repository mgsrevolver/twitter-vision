#!/usr/bin/env node
/**
 * Backfills quote-tweet relationships: re-fetches every corpus tweet and
 * records the embedded quoted tweet (free in the syndication payload) so
 * cards can render the inner quote box.
 *
 * Incremental via data/harvest/quote-map.json — { [id]: QuotedTweet | null }.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const OUT = path.join(ROOT, "data", "harvest", "quote-map.json");
const CONCURRENCY = 4;
const GAP_MS = 220;

const map = {};
try {
  Object.assign(map, JSON.parse(await readFile(OUT, "utf8")));
} catch {}

const corpus = JSON.parse(await readFile(path.join(ROOT, "data", "corpus.json"), "utf8")).tweets;
const queue = corpus.filter((t) => !(t.id in map)).map((t) => t.id);
console.error(`${queue.length} tweets to check (${Object.keys(map).length} already mapped)`);

let done = 0;
let found = 0;
let failures = 0;

function bestMp4(variants = []) {
  const mp4s = variants.filter((v) => v.content_type === "video/mp4" && v.url);
  if (!mp4s.length) return null;
  mp4s.sort((a, b) => (a.bitrate ?? 0) - (b.bitrate ?? 0));
  return (mp4s.find((v) => (v.bitrate ?? 0) >= 600000) ?? mp4s[mp4s.length - 1]).url;
}

function extractMedia(t) {
  const items = [];
  for (const m of t.mediaDetails ?? []) {
    const w = m.original_info?.width ?? null;
    const h = m.original_info?.height ?? null;
    if (m.type === "photo") items.push({ type: "photo", url: m.media_url_https, w, h });
    else if (m.type === "video" || m.type === "animated_gif")
      items.push({
        type: m.type === "animated_gif" ? "gif" : "video",
        poster: m.media_url_https,
        mp4: bestMp4(m.video_info?.variants),
        w,
        h,
      });
  }
  return items;
}

function quotedOf(t) {
  const q = t.quoted_tweet;
  if (!q?.id_str || !q.user) return null;
  const media = extractMedia(q);
  return {
    id: q.id_str,
    handle: q.user.screen_name,
    name: q.user.name,
    avatar: q.user.profile_image_url_https ?? null,
    verifiedAuthor: !!q.user.is_blue_verified,
    text: (q.text ?? "").trim(),
    url: `https://x.com/${q.user.screen_name}/status/${q.id_str}`,
    ...(media.length ? { media } : {}),
  };
}

async function fetchTweet(id, attempt = 0) {
  try {
    const res = await fetch(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=x`, {
      headers: { "user-agent": "Mozilla/5.0 (corpus-builder)" },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      return fetchTweet(id, attempt + 1);
    }
    failures++;
    return null;
  }
}

async function flush() {
  await writeFile(OUT, JSON.stringify(map));
}

async function worker() {
  while (queue.length) {
    const id = queue.pop();
    const t = await fetchTweet(id);
    const q = t && t.__typename !== "TweetTombstone" ? quotedOf(t) : null;
    map[id] = q;
    if (q) found++;
    done++;
    if (done % 100 === 0) {
      process.stderr.write(`\r${done} checked, ${found} quotes, ${failures} errors`);
      await flush();
    }
    await new Promise((r) => setTimeout(r, GAP_MS));
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
await flush();
console.error(`\ndone: ${Object.keys(map).length} mapped, ${found} with quoted tweets (${failures} errors)`);
