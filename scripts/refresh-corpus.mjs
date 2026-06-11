#!/usr/bin/env node
/**
 * Daily corpus refresh — keeps feeds semi-real-time without the X API.
 *
 * Discovery: nitter.net RSS per indexed account (newest ~20 posts, incl.
 *            replies and RTs, chronological — verified 2026-06).
 * Validation: cdn.syndication.twimg.com/tweet-result (exact text, author,
 *             engagement, media), ~1 req/s — same oracle as the pipeline.
 * Tagging: inherited from the author's accounts.json tags — no LLM needed,
 *          so this can run unattended on a cron.
 *
 * Usage: node scripts/refresh-corpus.mjs [maxAccounts]   (default: all)
 *        node scripts/refresh-corpus.mjs targets.json    (JSON array of handles;
 *                                                         order preserved)
 * Appends directly to data/corpus.json + data/corpus-sources.json.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const RSS_GAP_MS = 1100;
const CDN_GAP_MS = 1000;
const ARG = process.argv[2];
const TARGETS_FILE = ARG?.endsWith(".json") ? ARG : null;
const MAX_ACCOUNTS = (!TARGETS_FILE && Number(ARG)) || Infinity;

const accountsFile = path.join(ROOT, "data", "accounts.json");
const accountsData = JSON.parse(await readFile(accountsFile, "utf8"));
const accounts = accountsData.accounts;
const byHandle = new Map(accounts.map((a) => [a.handle.toLowerCase(), a]));

const corpusFile = path.join(ROOT, "data", "corpus.json");
const corpus = JSON.parse(await readFile(corpusFile, "utf8"));
const known = new Set(corpus.tweets.map((t) => t.id));

const seenFile = path.join(ROOT, "data", "harvest", "refresh-seen-ids.json");
let seen = new Set();
try {
  seen = new Set(JSON.parse(await readFile(seenFile, "utf8")));
} catch {}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Response on success, "gone" on a definitive 404, null on transient failure. */
async function get(url, attempt = 0) {
  try {
    // nitter serves an empty 200 without a browsery accept header
    const res = await fetch(url, {
      headers: {
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
    });
    if (res.status === 404) return "gone";
    if (!res.ok) throw new Error(String(res.status));
    return res;
  } catch (e) {
    if (attempt < 2) {
      await sleep(3000 * (attempt + 1));
      return get(url, attempt + 1);
    }
    console.error(`  failed ${url}: ${e.message}`);
    return null;
  }
}

// ---- discovery: RSS per account ----------------------------------------
const candidates = new Map(); // id -> discoveredVia handle
let targets;
if (TARGETS_FILE) {
  const handles = JSON.parse(await readFile(path.join(process.cwd(), TARGETS_FILE), "utf8"));
  targets = handles.map((h) => byHandle.get(h.toLowerCase())).filter(Boolean);
  console.error(`targeting ${targets.length}/${handles.length} handles from ${TARGETS_FILE}`);
} else {
  targets = [...accounts].sort((a, b) => b.followers - a.followers).slice(0, MAX_ACCOUNTS);
}
console.error(`discovering via nitter RSS for ${targets.length} accounts…`);
let rssOk = 0,
  livenessChanges = 0;
for (const [i, a] of targets.entries()) {
  const res = await get(`https://nitter.net/${a.handle}/rss`);
  if (res === "gone") {
    // account left X (deactivated/suspended/renamed) — flag it so the app
    // stops offering a feed; cleared automatically if it answers again
    if (!a.dead) {
      a.dead = true;
      livenessChanges++;
      console.error(`  DEAD: @${a.handle}`);
    }
  } else if (res) {
    if (a.dead) {
      delete a.dead;
      livenessChanges++;
      console.error(`  revived: @${a.handle}`);
    }
    const xml = await res.text();
    for (const m of xml.matchAll(/<link>[^<]*\/status\/(\d{5,20})/g)) {
      const id = m[1];
      if (!known.has(id) && !seen.has(id) && !candidates.has(id)) candidates.set(id, a.handle);
    }
    rssOk++;
  }
  if ((i + 1) % 25 === 0) process.stderr.write(`\r  ${i + 1}/${targets.length} feeds, ${candidates.size} new ids`);
  await sleep(RSS_GAP_MS);
}
console.error(`\n${candidates.size} new candidate ids from ${rssOk} feeds`);
if (livenessChanges) {
  await writeFile(accountsFile, JSON.stringify(accountsData, null, 1));
  console.error(`accounts.json: ${livenessChanges} liveness flag(s) updated`);
}

// ---- validation + auto-tagging ------------------------------------------
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

let added = 0,
  skipped = 0;
let n = 0;
for (const [id] of candidates) {
  n++;
  const res = await get(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=x`);
  seen.add(id);
  await sleep(CDN_GAP_MS);
  if (!res || res === "gone") continue;
  let t;
  try {
    t = await res.json();
  } catch {
    continue;
  }
  if (!t?.id_str || !t.user || t.__typename === "TweetTombstone") continue;
  if (t.lang && t.lang !== "en") continue;
  const author = byHandle.get(t.user.screen_name.toLowerCase());
  if (!author) {
    skipped++;
    continue; // only indexed authors inherit tags safely
  }
  const text = (t.text ?? "").trim();
  const media = extractMedia(t);
  // cheap quality gate: no contextless @-reply fragments, no bare links
  if (text.startsWith("@")) continue;
  if (text.replace(/https:\/\/t\.co\/\w+/g, "").trim().length < 25 && media.length === 0) continue;
  corpus.tweets.push({
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
    tags: author.tags,
    hasMedia: media.length > 0,
    ...(media.length ? { media } : {}),
    ...(quotedOf(t) ? { quoted: quotedOf(t) } : {}),
  });
  known.add(t.id_str);
  added++;
  if (n % 50 === 0) {
    process.stderr.write(`\r  ${n}/${candidates.size} validated, ${added} added`);
    await flush();
  }
}

async function flush() {
  corpus.builtAt = new Date().toISOString();
  await writeFile(corpusFile, JSON.stringify(corpus, null, 1));
  await writeFile(seenFile, JSON.stringify([...seen]));
  await writeFile(
    path.join(ROOT, "data", "corpus-sources.json"),
    JSON.stringify(
      {
        comment:
          "Canonical corpus list. Add {id, handle, tags} entries and run `npm run corpus` to verify against the live syndication endpoint and rebuild data/corpus.json.",
        tweets: corpus.tweets.map((t) => ({ id: t.id, handle: t.handle, tags: t.tags })),
      },
      null,
      1,
    ),
  );
}

await flush();
console.error(`\nrefresh done: +${added} fresh tweets (${skipped} unindexed authors skipped) → ${corpus.tweets.length} total`);
