#!/usr/bin/env node
/**
 * Backfills full media data (photo URLs, video posters + mp4s) for every
 * validated tweet flagged hasMedia, by re-fetching the syndication endpoint.
 * Incremental: skips IDs already in data/harvest/media-map.json.
 *
 * Output: data/harvest/media-map.json — { [id]: MediaItem[] }
 *   MediaItem = {type:"photo", url, w, h}
 *             | {type:"video"|"gif", poster, mp4, w, h}
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const DIR = path.join(ROOT, "data", "harvest");
const OUT = path.join(DIR, "media-map.json");
const CONCURRENCY = 4;
const GAP_MS = 220;

const map = {};
try {
  Object.assign(map, JSON.parse(await readFile(OUT, "utf8")));
} catch {}

const validated = JSON.parse(await readFile(path.join(DIR, "validated.json"), "utf8"));
const queue = validated.filter((t) => t.hasMedia && !(t.id in map)).map((t) => t.id);
console.error(`${queue.length} media tweets to fetch (${Object.keys(map).length} already mapped)`);

let done = 0;
let failures = 0;

function bestMp4(variants = []) {
  const mp4s = variants.filter((v) => v.content_type === "video/mp4" && v.url);
  if (!mp4s.length) return null;
  // mid-bitrate keeps previews light; highest as fallback
  mp4s.sort((a, b) => (a.bitrate ?? 0) - (b.bitrate ?? 0));
  return (mp4s.find((v) => (v.bitrate ?? 0) >= 600000) ?? mp4s[mp4s.length - 1]).url;
}

function extract(t) {
  const items = [];
  for (const m of t.mediaDetails ?? []) {
    const w = m.original_info?.width ?? null;
    const h = m.original_info?.height ?? null;
    if (m.type === "photo") {
      items.push({ type: "photo", url: m.media_url_https, w, h });
    } else if (m.type === "video" || m.type === "animated_gif") {
      const mp4 = bestMp4(m.video_info?.variants);
      items.push({
        type: m.type === "animated_gif" ? "gif" : "video",
        poster: m.media_url_https,
        mp4,
        w,
        h,
      });
    }
  }
  return items;
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
    map[id] = t && t.__typename !== "TweetTombstone" ? extract(t) : [];
    done++;
    if (done % 100 === 0) {
      process.stderr.write(`\r${done} fetched, ${failures} errors`);
      await flush();
    }
    await new Promise((r) => setTimeout(r, GAP_MS));
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
await flush();
const withMedia = Object.values(map).filter((v) => v.length).length;
console.error(`\ndone: ${Object.keys(map).length} mapped (${withMedia} with usable media, ${failures} errors)`);
