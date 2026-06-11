#!/usr/bin/env node
/**
 * SimClusters-lite: detect communities in the curated circle graph via
 * label propagation, so the feed can say "Popular in Film Twitter" and mean
 * something structural instead of dressing up a tag lookup.
 *
 * Graph: undirected. Edge A–B for every circle link between two indexed
 * accounts; mutual links weigh 2. Deterministic: seeded shuffle + lowest-id
 * tie-break, so the same accounts.json always yields the same communities.
 *
 * Usage: node scripts/build-communities.mjs
 * Writes data/communities.json: {communities: [{id, name, size, top}], byHandle}
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const MIN_COMMUNITY = 5; // smaller clusters aren't "a Twitter", they're a group chat

const { accounts } = JSON.parse(await readFile(path.join(ROOT, "data", "accounts.json"), "utf8"));
const byHandle = new Map(accounts.map((a) => [a.handle.toLowerCase(), a]));

// ---- build the undirected weighted graph --------------------------------
const edges = new Map(); // "a|b" (sorted) -> weight
for (const a of accounts) {
  const from = a.handle.toLowerCase();
  for (const c of a.circle ?? []) {
    const to = c.handle.toLowerCase();
    if (to === from || !byHandle.has(to)) continue;
    const key = from < to ? `${from}|${to}` : `${to}|${from}`;
    edges.set(key, (edges.get(key) ?? 0) + 1);
  }
}
const neighbors = new Map(); // handle -> [{h, w}]
for (const [key, w] of edges) {
  const [a, b] = key.split("|");
  if (!neighbors.has(a)) neighbors.set(a, []);
  if (!neighbors.has(b)) neighbors.set(b, []);
  neighbors.get(a).push({ h: b, w });
  neighbors.get(b).push({ h: a, w });
}
const nodes = [...neighbors.keys()].sort();
console.error(`graph: ${nodes.length} nodes, ${edges.size} edges`);

// ---- deterministic label propagation ------------------------------------
function mulberry32(seed) {
  let h = 1779033703;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const label = new Map(nodes.map((h, i) => [h, i]));
const rng = mulberry32("their-feed-communities-v1");
for (let iter = 0; iter < 50; iter++) {
  const order = [...nodes];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  let changed = 0;
  for (const h of order) {
    const tally = new Map();
    for (const { h: n, w } of neighbors.get(h)) {
      const l = label.get(n);
      tally.set(l, (tally.get(l) ?? 0) + w);
    }
    if (!tally.size) continue;
    let best = label.get(h),
      bestW = -1;
    for (const [l, w] of tally) {
      if (w > bestW || (w === bestW && l < best)) {
        best = l;
        bestW = w;
      }
    }
    if (best !== label.get(h)) {
      label.set(h, best);
      changed++;
    }
  }
  console.error(`  iter ${iter + 1}: ${changed} moves`);
  if (changed === 0) break;
}

// ---- collect + name communities ------------------------------------------
const groups = new Map(); // label -> [handles]
for (const [h, l] of label) {
  if (!groups.has(l)) groups.set(l, []);
  groups.get(l).push(h);
}

// dominant tag, weighted by log-followers so megafame anchors the name
const TAG_NAME = {
  "film-tv": "Film & TV Twitter",
  music: "Music Twitter",
  sports: "Sports Twitter",
  tech: "Tech Twitter",
  ai: "AI Twitter",
  science: "Science Twitter",
  finance: "FinTwit",
  crypto: "Crypto Twitter",
  "politics-left": "Left Twitter",
  "politics-right": "Right Twitter",
  media: "Media Twitter",
  humor: "Shitposting Twitter",
  books: "Book Twitter",
  gaming: "Gaming Twitter",
  food: "Food Twitter",
  "pop-culture": "Pop Culture Twitter",
  wholesome: "Wholesome Twitter",
  animals: "Animal Twitter",
  fitness: "Fitness Twitter",
};
// generic vibes-tags that describe tone, not a scene — never name a community
const TONE_TAGS = new Set(["humor", "iconic", "wholesome", "pop-culture", "media"]);

// hand-labeled clusters, SimClusters-style: if a community contains the anchor
// account, it gets the curated name. First match wins; keep anchors distinctive.
const ANCHOR_NAMES = [
  ["dril", "Weird Twitter"],
  ["nytimes", "Media Twitter"],
  ["conanobrien", "Comedy Twitter"],
  ["kingjames", "Sports Twitter"],
  ["barackobama", "Politics Twitter"],
  ["cristiano", "Football Twitter"],
  ["rafaelnadal", "Tennis Twitter"],
  ["f1", "F1 Twitter"],
  ["marvel", "Marvel Twitter"],
  ["erdayastronaut", "Space Twitter"],
  ["nws", "Weather Twitter"],
  ["leodicaprio", "Film Twitter"],
  ["billboardcharts", "Music Press Twitter"],
];

function nameOf(handles) {
  const set = new Set(handles);
  for (const [anchor, name] of ANCHOR_NAMES) if (set.has(anchor)) return name;
  const tally = new Map();
  for (const h of handles) {
    const a = byHandle.get(h);
    const w = Math.log10((a.followers ?? 0) + 10);
    for (const t of a.tags ?? []) tally.set(t, (tally.get(t) ?? 0) + w);
  }
  const ranked = [...tally.entries()].sort((x, y) => y[1] - x[1]);
  const scene = ranked.find(([t]) => !TONE_TAGS.has(t)) ?? ranked[0];
  return scene ? (TAG_NAME[scene[0]] ?? `${scene[0]} Twitter`) : "the timeline";
}

const communities = [...groups.entries()]
  .filter(([, hs]) => hs.length >= MIN_COMMUNITY)
  .sort((a, b) => b[1].length - a[1].length)
  .map(([, hs], i) => {
    const top = hs
      .slice()
      .sort((a, b) => (byHandle.get(b).followers ?? 0) - (byHandle.get(a).followers ?? 0))
      .slice(0, 5)
      .map((h) => byHandle.get(h).handle);
    return { id: i, name: nameOf(hs), size: hs.length, top, members: hs };
  });

const out = {
  builtAt: new Date().toISOString(),
  communities: communities.map(({ members, ...meta }) => meta),
  byHandle: Object.fromEntries(communities.flatMap((c) => c.members.map((h) => [h, c.id]))),
};
await writeFile(path.join(ROOT, "data", "communities.json"), JSON.stringify(out, null, 1));

console.error(`\n${communities.length} communities (≥${MIN_COMMUNITY} members), ${Object.keys(out.byHandle).length}/${nodes.length} nodes assigned:`);
for (const c of communities.slice(0, 25)) {
  console.error(`  #${c.id} ${c.name} (${c.size}): ${c.top.join(", ")}`);
}
