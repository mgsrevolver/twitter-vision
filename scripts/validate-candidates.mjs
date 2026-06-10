#!/usr/bin/env node
/**
 * Validates harvested candidate tweet IDs against X's public syndication
 * endpoint. Keeps English tweets that still exist, captures exact text,
 * author, date, and engagement, and opportunistically harvests embedded
 * quoted tweets (full data comes back for free — no extra request).
 *
 * Input:  data/harvest/*-candidates.json  — [{id, handle?, tags?, source?}]
 * Output: data/harvest/validated.json     — full tweet records
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const DIR = path.join(ROOT, "data", "harvest");
const OUT = path.join(DIR, "validated.json");
const CONCURRENCY = 4;
const GAP_MS = 220;

// incremental: previously validated tweets are kept and their IDs skipped
const validated = new Map();
const checked = new Set();
try {
  for (const t of JSON.parse(await readFile(OUT, "utf8"))) {
    validated.set(t.id, t);
    checked.add(t.id);
  }
} catch {}
try {
  for (const id of JSON.parse(await readFile(path.join(DIR, "checked-ids.json"), "utf8"))) checked.add(id);
} catch {}

const candidates = new Map();
for (const f of await readdir(DIR)) {
  if (!f.endsWith("-candidates.json")) continue;
  let list;
  try {
    list = JSON.parse(await readFile(path.join(DIR, f), "utf8"));
  } catch {
    console.error(`skipping unparseable ${f}`);
    continue;
  }
  for (const c of list) {
    const id = String(c.id);
    if (/^\d{1,20}$/.test(id) && !candidates.has(id) && !checked.has(id)) candidates.set(id, c);
  }
}
console.error(`${candidates.size} new candidates (${validated.size} already validated)`);
let done = 0;
let failures = 0;

function mediaOf(t) {
  return !!(t.mediaDetails?.length || t.entities?.media?.length);
}

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

function record(t, hint) {
  if (!t?.id_str || !t.user || validated.has(t.id_str)) return;
  if (t.lang && t.lang !== "en") return;
  const text = (t.text ?? "").trim();
  if (!text && !mediaOf(t)) return;
  validated.set(t.id_str, {
    id: t.id_str,
    handle: t.user.screen_name,
    name: t.user.name,
    avatar: t.user.profile_image_url_https ?? null,
    verifiedAuthor: !!t.user.is_blue_verified,
    text,
    createdAt: t.created_at,
    likes: t.favorite_count ?? 0,
    replies: t.conversation_count ?? t.reply_count ?? 0,
    url: `https://x.com/${t.user.screen_name}/status/${t.id_str}`,
    hasMedia: mediaOf(t),
    media: extractMedia(t),
    quoted: quotedOf(t),
    seedTags: hint?.tags ?? [],
    source: hint?.source ?? "harvest",
  });
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

const queue = [...candidates.values()];
async function flush() {
  await writeFile(OUT, JSON.stringify([...validated.values()], null, 1));
  await writeFile(path.join(DIR, "checked-ids.json"), JSON.stringify([...checked]));
}

async function worker() {
  while (queue.length) {
    const c = queue.pop();
    const t = await fetchTweet(c.id);
    checked.add(c.id);
    if (t && t.__typename !== "TweetTombstone") {
      record(t, c);
      if (t.quoted_tweet) record(t.quoted_tweet, { source: "quoted" });
    }
    done++;
    if (done % 100 === 0) {
      process.stderr.write(`\r${done}/${candidates.size} checked — ${validated.size} valid, ${failures} errors`);
      await flush();
    }
    await new Promise((r) => setTimeout(r, GAP_MS));
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
await flush();
console.error(`\ntotal ${validated.size} validated tweets → data/harvest/validated.json (${failures} errors this run)`);
