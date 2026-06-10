/**
 * Deterministic notification-tab simulator. Pure computation: same input +
 * seed always yields the same flood (or trickle) of fictional notifications.
 * Volume, mix, and tone scale with follower count, verification, and tags —
 * politicians get vitriol from the opposing side, celebrities get thirst,
 * crypto people get scam bots. Everything here is invented except the
 * targetPost snippets, which quote the person's real corpus tweets.
 */

import corpusData from "@/data/corpus.json";
import templatesData from "@/data/notification-templates.json";
import { rngFor, pick } from "./seeded-random";
import type { CorpusTweet } from "./types";

export type NotificationKind =
  | "like-cluster"
  | "repost-cluster"
  | "follow"
  | "reply"
  | "quote"
  | "mention";

export interface NotificationActor {
  handle: string;
  name: string;
}

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  /** named actors shown with avatars; first one is bolded in the card */
  actors: NotificationActor[];
  /** additional unnamed actors beyond `actors` — "and 2,847 others" */
  count?: number;
  /** reply/quote/mention body text */
  text?: string;
  /** the target's real post this notification reacts to (corpus-backed) */
  targetPost?: { id: string; text: string };
  /** relative timestamp, e.g. "2m", "1h" — increases down the list */
  ago: string;
}

export interface BuildNotificationsInput {
  handle?: string;
  displayName: string;
  followers: number;
  verified: boolean;
  tags: string[];
  seed: string;
}

type IdentityKey =
  | "left"
  | "right"
  | "replyGuy"
  | "conspiracy"
  | "cryptoBot"
  | "stan"
  | "thirst"
  | "journalist"
  | "brand"
  | "normie";

type Tone =
  | "supportive"
  | "supportive-left"
  | "supportive-right"
  | "hostile-from-left"
  | "hostile-from-right"
  | "vicious"
  | "mocking"
  | "thirsty"
  | "reply-guy"
  | "conspiracy"
  | "crypto-spam"
  | "stan"
  | "journalist"
  | "brand";

interface TemplateData {
  identities: Record<IdentityKey, NotificationActor[]>;
  replies: Record<Tone, string[]>;
  mentions: string[];
}

const TEMPLATES = templatesData as unknown as TemplateData;
const CORPUS = corpusData.tweets as CorpusTweet[];

/** Which fake-identity pools plausibly write each tone. */
const TONE_IDENTITY: Record<Tone, IdentityKey[]> = {
  supportive: ["normie", "normie", "stan"],
  "supportive-left": ["left"],
  "supportive-right": ["right"],
  "hostile-from-left": ["left"],
  "hostile-from-right": ["right"],
  vicious: ["normie", "replyGuy"],
  mocking: ["normie", "normie", "replyGuy"],
  thirsty: ["thirst"],
  "reply-guy": ["replyGuy"],
  conspiracy: ["conspiracy"],
  "crypto-spam": ["cryptoBot"],
  stan: ["stan"],
  journalist: ["journalist"],
  brand: ["brand"],
};

const HOSTILE_TONES: Tone[] = ["hostile-from-left", "hostile-from-right", "vicious", "mocking", "conspiracy"];

function weightedPick<T extends string>(rng: () => number, weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((s, [, w]) => s + Math.max(0, w), 0);
  let roll = rng() * total;
  for (const [key, w] of entries) {
    roll -= Math.max(0, w);
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

function shuffle<T>(rng: () => number, items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Deals from a pool in seeded-shuffled order so templates don't repeat early. */
function makeDealer(rng: () => number) {
  const cursors = new Map<string, { order: number[]; i: number }>();
  return <T>(key: string, pool: T[]): T => {
    let st = cursors.get(key);
    if (!st) {
      st = { order: shuffle(rng, pool.map((_, i) => i)), i: 0 };
      cursors.set(key, st);
    }
    const idx = st.order[st.i % st.order.length];
    st.i++;
    return pool[idx];
  };
}

function itemCount(rng: () => number, followers: number, verified: boolean): number {
  let lo = 4;
  let hi = 8;
  if (followers >= 5_000_000) [lo, hi] = [35, 45];
  else if (followers >= 500_000) [lo, hi] = [25, 35];
  else if (followers >= 50_000) [lo, hi] = [12, 20];
  let n = lo + Math.floor(rng() * (hi - lo + 1));
  if (verified) n = Math.min(hi, n + 2);
  return n;
}

function kindWeights(followers: number, canMention: boolean): Record<NotificationKind, number> {
  let w: Record<NotificationKind, number>;
  if (followers < 50_000) {
    w = { "like-cluster": 34, follow: 30, reply: 22, "repost-cluster": 8, quote: 6, mention: 4 };
  } else if (followers < 500_000) {
    w = { "like-cluster": 26, follow: 14, reply: 30, "repost-cluster": 12, quote: 12, mention: 6 };
  } else {
    w = { "like-cluster": 22, follow: 8, reply: 32, "repost-cluster": 12, quote: 18, mention: 8 };
  }
  if (!canMention) w.mention = 0;
  return w;
}

/**
 * The tone distribution is where "accuracy" lives: politicians get a
 * 35-45% hostile/mocking share from the OPPOSING side, big entertainers
 * drown in thirst and stan energy, finance/crypto attracts the bots.
 */
function toneWeights(tags: string[], followers: number, verified: boolean): Record<Tone, number> {
  const has = (t: string) => tags.includes(t);
  const w: Record<Tone, number> = {
    supportive: 34,
    "supportive-left": 0,
    "supportive-right": 0,
    "hostile-from-left": 0,
    "hostile-from-right": 0,
    vicious: 3,
    mocking: 10,
    thirsty: 3,
    "reply-guy": 14,
    conspiracy: 3,
    "crypto-spam": 2,
    stan: 6,
    journalist: 3,
    brand: 2,
  };
  const political = has("politics-left") || has("politics-right");
  if (political) {
    const own: Tone = has("politics-left") ? "supportive-left" : "supportive-right";
    const opp: Tone = has("politics-left") ? "hostile-from-right" : "hostile-from-left";
    w.supportive = 6;
    w[own] = 26;
    w[opp] = 24;
    w.mocking = 9;
    w.vicious = 6;
    w.conspiracy = 7;
    w["reply-guy"] = 8;
    w.journalist = 5;
    w.stan = 3;
    w.thirsty = 2;
    w["crypto-spam"] = 1;
    w.brand = 1;
  }
  if ((has("film-tv") || has("music") || has("pop-culture")) && followers > 1_000_000) {
    w.thirsty += 20;
    w.stan += 24;
    w.brand += 4;
    w["reply-guy"] = Math.max(2, w["reply-guy"] - 8);
  }
  if (has("finance") || has("crypto")) {
    w["crypto-spam"] += 20;
    w["reply-guy"] += 6;
  }
  if (has("media")) {
    w["reply-guy"] += 14;
    w.mocking += 8;
    w.conspiracy += 6;
  }
  if (has("tech") || has("ai")) {
    w["reply-guy"] += 8;
    w["crypto-spam"] += 3;
  }
  if (verified) w.journalist += 3;
  // small accounts have small enemies — keep their mentions mostly friendly
  if (followers < 50_000) {
    for (const t of HOSTILE_TONES) w[t] *= 0.35;
  }
  return w;
}

/** Who plausibly likes/reposts/follows this person, in aggregate. */
function clusterIdentityKeys(tags: string[], followers: number): IdentityKey[] {
  const has = (t: string) => tags.includes(t);
  if (has("politics-left")) return ["left", "left", "normie", "journalist"];
  if (has("politics-right")) return ["right", "right", "normie", "journalist"];
  if ((has("film-tv") || has("music") || has("pop-culture")) && followers > 1_000_000)
    return ["stan", "stan", "thirst", "normie"];
  if (has("finance") || has("crypto")) return ["normie", "cryptoBot", "replyGuy", "normie"];
  return ["normie", "normie", "stan", "replyGuy"];
}

/** Aggregate "and N others" size, scaled to reach but kept plausible. */
function clusterCount(rng: () => number, followers: number, kind: NotificationKind): number {
  const scale = kind === "like-cluster" ? 1 : kind === "repost-cluster" ? 0.3 : 0.05;
  const base = Math.min(followers, 50_000_000);
  return Math.floor(base * 0.0015 * rng() * rng() * scale);
}

function formatAgo(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / (24 * 60))}d`;
}

/** Strip t.co links, decode entities, squeeze whitespace; truncate for the sub-box. */
function snippet(text: string): string {
  const clean = text
    .replace(/https:\/\/t\.co\/\w+/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > 90 ? `${clean.slice(0, 90).trimEnd()}…` : clean;
}

function firstNameOf(displayName: string): string {
  const m = displayName.match(/[A-Za-z][A-Za-z.'-]*/);
  return m ? m[0] : "";
}

const FRIENDLY_TONES: Tone[] = ["supportive", "supportive-left", "supportive-right", "thirsty", "stan"];

function fillTemplate(tpl: string, tone: Tone, firstName: string, handle: string | undefined): string {
  const fallback = FRIENDLY_TONES.includes(tone) ? "bestie" : HOSTILE_TONES.includes(tone) ? "buddy" : "friend";
  return tpl.replaceAll("{name}", firstName || fallback).replaceAll("{handle}", handle ?? "");
}

/**
 * Simulated unread-notification count for the header badge — the tier system
 * is the point: megafame means the badge is permanently maxed out, a normal
 * person sees a quiet 0-5.
 */
export function notificationCount(followers: number, seed: string, handle?: string): number {
  const rng = rngFor(`${handle ?? "persona"}|${seed}|notif-count`);
  if (followers >= 5_000_000) return 100 + Math.floor(rng() * 400);
  if (followers >= 500_000) return 40 + Math.floor(rng() * 70);
  if (followers >= 50_000) return 6 + Math.floor(rng() * 20);
  return Math.floor(rng() * 6);
}

/** X-style badge label: caps at "100+". */
export function formatNotificationCount(n: number): string {
  return n > 100 ? "100+" : String(n);
}

export function buildNotifications(input: BuildNotificationsInput): NotificationItem[] {
  const { handle, displayName, followers, verified, tags, seed } = input;
  const rng = rngFor(`${handle ?? displayName}|${seed}|notifications`);
  const deal = makeDealer(rng);

  const myPosts = handle
    ? CORPUS.filter((t) => t.handle.toLowerCase() === handle.toLowerCase())
    : [];
  const firstName = handle ? firstNameOf(displayName) : "";

  const n = itemCount(rng, followers, verified);
  const kindW = kindWeights(followers, Boolean(handle));
  const toneW = toneWeights(tags, followers, verified);
  const clusterKeys = clusterIdentityKeys(tags, followers);

  const usedHandles = new Set<string>();
  const pickActor = (key: IdentityKey): NotificationActor => {
    const pool = TEMPLATES.identities[key];
    for (let tries = 0; tries < 6; tries++) {
      const actor = pick(rng, pool);
      if (!usedHandles.has(actor.handle)) {
        usedHandles.add(actor.handle);
        return actor;
      }
    }
    return pick(rng, pool); // crowded mentions repeat eventually; that's X baby
  };

  // Reactions hit real posts: prefer standalone tweets (no contextless
  // @-reply fragments), newest first — and like real X, most of the flood
  // piles onto the couple of things they posted most recently.
  const standalone = myPosts
    .filter((t) => !t.text.startsWith("@") && snippet(t.text).length >= 12)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const targetPool = (standalone.length ? standalone : myPosts).slice(0, 12);
  const hotSet = targetPool.slice(0, 3);

  const targetPostFor = (): NotificationItem["targetPost"] => {
    if (!targetPool.length) return undefined;
    const post = pick(rng, rng() < 0.7 ? hotSet : targetPool);
    return { id: post.id, text: snippet(post.text) };
  };

  const items: NotificationItem[] = [];
  let minutes = 1 + Math.floor(rng() * 4);

  for (let i = 0; i < n; i++) {
    const kind = weightedPick(rng, kindW);
    const ago = formatAgo(minutes);
    minutes += 1 + Math.floor(rng() * (3 + i * 1.2));
    const id = `n${i}`;

    if (kind === "like-cluster" || kind === "repost-cluster" || kind === "follow") {
      const named = 1 + Math.floor(rng() * 2);
      const actors: NotificationActor[] = [];
      for (let a = 0; a < named; a++) actors.push(pickActor(pick(rng, clusterKeys)));
      const extra = clusterCount(rng, followers, kind);
      items.push({
        id,
        kind,
        actors,
        count: extra >= 2 ? extra : undefined,
        targetPost: kind === "follow" ? undefined : targetPostFor(),
        ago,
      });
      continue;
    }

    if (kind === "mention") {
      const actor = pickActor(pick(rng, ["normie", "stan", "replyGuy"] as IdentityKey[]));
      items.push({
        id,
        kind,
        actors: [actor],
        text: fillTemplate(deal("mention", TEMPLATES.mentions), "mocking", firstName, handle),
        ago,
      });
      continue;
    }

    // reply or quote — pick a tone, then a voice that matches it
    const tone = weightedPick(rng, toneW);
    const actor = pickActor(pick(rng, TONE_IDENTITY[tone]));
    items.push({
      id,
      kind,
      actors: [actor],
      text: fillTemplate(deal(tone, TEMPLATES.replies[tone]), tone, firstName, handle),
      targetPost: targetPostFor(),
      ago,
    });
  }

  return items;
}
