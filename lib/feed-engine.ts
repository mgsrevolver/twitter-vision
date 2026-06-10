import corpusData from "@/data/corpus.json";
import { rngFor, pick } from "./seeded-random";
import { ACCOUNTS, findAccount } from "./accounts";
import type { Account, CorpusTweet, FeedItem, Lean, OnlineLevel, Profile, SurveyAnswers, Tag } from "./types";

export const CORPUS = corpusData.tweets as CorpusTweet[];

const FEED_LENGTH = 18;

/** Everyone's feed has shitposts. That is simply true. */
const HUMOR_FLOOR = 0.3;

/**
 * Share of feed slots reserved for accounts the person ACTUALLY interacts
 * with — the strongest verisimilitude signal we have. Mirrors how the real
 * algorithm splits in-network from out-of-network content.
 */
const CIRCLE_SHARE = 0.5;

/**
 * Cards wear simulated "3m/7h ago" timestamps, so a 2023 news clip on a
 * "current" feed reads as a glitch. Anything older than this is excluded —
 * unless it's a timeless, placeless joke (see isCurrentEnough).
 */
const FRESHNESS_CUTOFF = Date.UTC(2026, 0, 1);

/** Hand-curated exceptions: specific old posts welcome on a current feed anyway. */
const TIMELESS_EXCEPTIONS = new Set<string>([]);

/** Tags that anchor a post to its moment — even a funny one goes stale. */
const DATED_TAGS = new Set<Tag>(["politics-left", "politics-right", "media", "sports", "finance", "crypto"]);

function isCurrentEnough(t: CorpusTweet): boolean {
  if (new Date(t.createdAt).getTime() >= FRESHNESS_CUTOFF) return true;
  if (TIMELESS_EXCEPTIONS.has(t.id)) return true;
  const timeless = t.tags.includes("humor") || t.tags.includes("wholesome") || t.tags.includes("animals");
  return timeless && !t.tags.some((x) => DATED_TAGS.has(x));
}

/** Per-lean tag weights — finer than the corpus tags, blended in code. */
const LEAN_WEIGHTS: Record<Exclude<Lean, "none">, Partial<Record<Tag, number>>> = {
  progressive: { "politics-left": 1.4 },
  liberal: { "politics-left": 1.0, media: 0.4 },
  centrist: { media: 0.6, "politics-left": 0.3, "politics-right": 0.3 },
  libertarian: { "politics-right": 0.7, finance: 0.5, crypto: 0.5, tech: 0.3 },
  maga: { "politics-right": 1.5, humor: 0.2 },
  conservative: { "politics-right": 1.0, media: 0.4 },
};

/**
 * What each lean scrolls right past. Nobody's For You page feeds them the
 * other side's commentators unless they actually engage with them (that's
 * what circles are for).
 */
const LEAN_AVOID: Record<Exclude<Lean, "none">, Partial<Record<Tag, number>>> = {
  progressive: { "politics-right": 0.05 },
  liberal: { "politics-right": 0.1 },
  centrist: {},
  libertarian: { "politics-left": 0.35 },
  maga: { "politics-left": 0.05 },
  conservative: { "politics-left": 0.1 },
};

const LEAN_LABEL: Record<Exclude<Lean, "none">, string> = {
  progressive: "progressive",
  liberal: "liberal",
  centrist: "centrist",
  libertarian: "libertarian",
  maga: "MAGA",
  conservative: "conservative",
};

const ONLINE_LABEL: Record<OnlineLevel, string> = {
  normal: "casually online",
  toomuch: "too-online",
  terminal: "terminally online",
};

export function profileFromHandle(handle: string): Profile | null {
  const account = findAccount(handle);
  if (!account) return null;
  const profile = profileFromAccountLike(account.handle, account.name, account.tags);
  const circle: Record<string, string> = {};
  for (const c of account.circle ?? []) circle[c.handle.toLowerCase()] = c.why;
  if (Object.keys(circle).length) profile.circle = circle;
  return profile;
}

/** Profile from bare account facts — used for LLM-inferred handles outside the index. */
export function profileFromAccountLike(handle: string, name: string, tags: Tag[]): Profile {
  const tagWeights: Partial<Record<Tag, number>> = { humor: HUMOR_FLOOR, iconic: 0.25 };
  for (const t of tags) tagWeights[t] = (tagWeights[t] ?? 0) + 1;
  const avoid: Profile["avoid"] = tags.includes("politics-left")
    ? { "politics-right": 0.25 }
    : tags.includes("politics-right")
      ? { "politics-left": 0.25 }
      : undefined;
  return {
    source: "handle",
    handle,
    displayName: name,
    tagWeights,
    online: "toomuch", // they're a public figure on this site; of course they are
    summary: heuristicSummary(tags, handle),
    avoid,
  };
}

export function profileFromSurvey(answers: SurveyAnswers): Profile {
  const tagWeights: Partial<Record<Tag, number>> = { humor: HUMOR_FLOOR, iconic: 0.25 };
  for (const t of answers.interests) tagWeights[t] = (tagWeights[t] ?? 0) + 1;
  if (answers.lean !== "none") {
    for (const [t, w] of Object.entries(LEAN_WEIGHTS[answers.lean]) as [Tag, number][]) {
      tagWeights[t] = (tagWeights[t] ?? 0) + w;
    }
  }
  if (answers.online === "toomuch") tagWeights.humor = (tagWeights.humor ?? 0) + 0.7;
  if (answers.online === "terminal") tagWeights.humor = (tagWeights.humor ?? 0) + 1.2;
  if (answers.online === "normal") tagWeights.iconic = (tagWeights.iconic ?? 0) + 0.15;
  return {
    source: "survey",
    displayName: surveyPersonaName(answers),
    tagWeights,
    online: answers.online,
    summary: heuristicSummary(answers.interests, undefined, answers),
    avoid: answers.lean !== "none" ? LEAN_AVOID[answers.lean] : undefined,
  };
}

/**
 * How online someone is shapes WHICH version of a topic they see:
 * casual scrollers get the bangers everyone saw; the terminally online
 * get the 4k-likes deep cuts. log10(likes) runs ~2 (niche) to ~6.5 (mega).
 */
function popularityFactor(tweet: CorpusTweet, online: OnlineLevel): number {
  const pop = Math.log10((tweet.likes ?? 0) + 100);
  if (online === "normal") return 0.3 + pop / 4;
  if (online === "terminal") return 0.3 + Math.max(0, 7 - pop) / 4;
  return 1;
}

/**
 * Mild recency preference. The cards conceal real dates behind simulated
 * relative timestamps, but fresher material still reads truer.
 */
function recencyFactor(tweet: CorpusTweet): number {
  const days = (Date.now() - new Date(tweet.createdAt).getTime()) / 86_400_000;
  if (days < 45) return 1.7;
  if (days < 365) return 1.3;
  if (days < 1095) return 1.0;
  return 0.75;
}

/** Author-level politics: a commentator's apolitical posts still carry their lean. */
const AUTHOR_POLITICS = new Map<string, Tag[]>(
  ACCOUNTS.filter((a) => a.tags.some((t) => t === "politics-left" || t === "politics-right")).map((a) => [
    a.handle.toLowerCase(),
    a.tags.filter((t): t is Tag => t === "politics-left" || t === "politics-right"),
  ]),
);

function tweetScore(tweet: CorpusTweet, profile: Profile, skipAvoid = false): number {
  let s = 0.04; // every real tweet has a nonzero shot — algorithms are weird
  for (const t of tweet.tags) s += profile.tagWeights[t] ?? 0;
  s *= popularityFactor(tweet, profile.online) * recencyFactor(tweet);
  if (!skipAvoid && profile.avoid) {
    const effective = new Set<Tag>(tweet.tags);
    for (const t of AUTHOR_POLITICS.get(tweet.handle.toLowerCase()) ?? []) effective.add(t);
    for (const t of effective) s *= profile.avoid[t] ?? 1;
  }
  return s;
}

/**
 * Engagement the corpus doesn't carry, derived from real likes. Keyed by
 * tweet id alone so a tweet's numbers stay consistent across every feed.
 */
function simulatedStats(tweet: CorpusTweet): { reposts: number; views: number } {
  const rng = rngFor(`stats|${tweet.id}`);
  const likes = Math.max(tweet.likes ?? 0, 8);
  return {
    reposts: Math.round(likes * (0.08 + rng() * 0.17)),
    views: Math.round(likes * (28 + rng() * 75)),
  };
}

type Candidate = { t: CorpusTweet; score: number };

function drawWeighted(rng: () => number, candidates: Candidate[]): CorpusTweet {
  const total = candidates.reduce((sum, c) => sum + c.score, 0);
  let roll = rng() * total;
  let idx = 0;
  for (; idx < candidates.length - 1; idx++) {
    roll -= candidates[idx].score;
    if (roll <= 0) break;
  }
  return candidates.splice(idx, 1)[0].t;
}

/**
 * Weighted sample without replacement, deterministic for a given key.
 * Stratified: when a curated interaction circle exists, ~half the slots
 * come from accounts the person actually engages with (in-network),
 * the rest from interest-weighted discovery (out-of-network).
 */
export function assembleFeed(profile: Profile, seed: string): FeedItem[] {
  const rng = rngFor(`${profile.displayName}|${seed}`);
  const pool = CORPUS.filter((t) => isCurrentEnough(t) && t.handle.toLowerCase() !== profile.handle?.toLowerCase());
  const items: CorpusTweet[] = [];
  const inNetwork: Candidate[] = [];
  const discovery: Candidate[] = [];
  for (const t of pool) {
    // circle members skip the avoid penalty — hate-follows and dunk targets
    // are real engagement, and the curators encoded them on purpose
    if (profile.circle?.[t.handle.toLowerCase()]) {
      inNetwork.push({ t, score: tweetScore(t, profile, true) + 0.6 });
    } else {
      discovery.push({ t, score: tweetScore(t, profile) });
    }
  }
  const authorCount = new Map<string, number>();
  while (items.length < Math.min(FEED_LENGTH, pool.length) && (inNetwork.length || discovery.length)) {
    const fromCircle = inNetwork.length > 0 && (discovery.length === 0 || rng() < CIRCLE_SHARE);
    const chosen = drawWeighted(rng, fromCircle ? inNetwork : discovery);
    items.push(chosen);
    // soft per-author cap: each appearance dampens that author's remaining scores
    const n = (authorCount.get(chosen.handle) ?? 0) + 1;
    authorCount.set(chosen.handle, n);
    for (const c of inNetwork) if (c.t.handle === chosen.handle) c.score *= 0.2;
    for (const c of discovery) if (c.t.handle === chosen.handle) c.score *= 0.2;
  }
  // avoid the same author twice in a row — cheap pass, keeps it feeling curated
  for (let i = 1; i < items.length; i++) {
    if (items[i].handle === items[i - 1].handle) {
      const j = items.findIndex((t, k) => k > i && t.handle !== items[i - 1].handle);
      if (j > 0) [items[i], items[j]] = [items[j], items[i]];
    }
  }
  // simulated freshness: ages walk from minutes-ago down to deep-scroll hours
  let minutes = 1 + Math.floor(rng() * 8);
  return items.map((tweet) => {
    const ago = minutes < 60 ? `${minutes}m` : `${Math.min(23, Math.round(minutes / 60))}h`;
    minutes += 4 + Math.floor(rng() * 110);
    return { tweet, reason: reasonFor(tweet, profile, rng), ago, stats: simulatedStats(tweet) };
  });
}

/**
 * The Following tab: only accounts this person actually follows — the
 * curated interaction circle when we have one, else the accounts that best
 * match the profile. Recency-flavored like X's chronological tab: no banger
 * bias, no discovery, no "why you're seeing this".
 */
export function assembleFollowingFeed(profile: Profile, seed: string): FeedItem[] {
  const rng = rngFor(`${profile.displayName}|${seed}|following`);
  const followed = new Set(Object.keys(profile.circle ?? {}));
  if (followed.size === 0) {
    for (const a of matchingAccounts(profile, 12)) followed.add(a.handle.toLowerCase());
  }
  const followedPool = CORPUS.filter(
    (t) => followed.has(t.handle.toLowerCase()) && t.handle.toLowerCase() !== profile.handle?.toLowerCase(),
  );
  // freshness-gate like For You, but a sparse circle may not post much — top
  // up with the followed accounts' most recent older posts rather than run empty
  let pool = followedPool.filter(isCurrentEnough);
  if (pool.length < FEED_LENGTH) {
    const older = followedPool
      .filter((t) => !isCurrentEnough(t))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    pool = pool.concat(older.slice(0, FEED_LENGTH - pool.length));
  }
  const candidates: Candidate[] = pool.map((t) => ({ t, score: 0.2 + recencyFactor(t) }));
  const items: CorpusTweet[] = [];
  while (items.length < Math.min(FEED_LENGTH, pool.length) && candidates.length) {
    const chosen = drawWeighted(rng, candidates);
    items.push(chosen);
    for (const c of candidates) if (c.t.handle === chosen.handle) c.score *= 0.45;
  }
  for (let i = 1; i < items.length; i++) {
    if (items[i].handle === items[i - 1].handle) {
      const j = items.findIndex((t, k) => k > i && t.handle !== items[i - 1].handle);
      if (j > 0) [items[i], items[j]] = [items[j], items[i]];
    }
  }
  let minutes = 2 + Math.floor(rng() * 10);
  return items.map((tweet) => {
    const ago = minutes < 60 ? `${minutes}m` : `${Math.min(23, Math.round(minutes / 60))}h`;
    minutes += 6 + Math.floor(rng() * 140);
    return { tweet, reason: "", ago, stats: simulatedStats(tweet) };
  });
}

const TAG_LABEL: Record<Tag, string> = {
  tech: "Tech",
  ai: "AI",
  science: "Science",
  sports: "Sports",
  music: "Music",
  "film-tv": "Movies & TV",
  gaming: "Gaming",
  finance: "Markets",
  crypto: "Crypto",
  food: "Food",
  books: "Books",
  fitness: "Fitness",
  animals: "Animals",
  media: "News",
  humor: "Comedy",
  "pop-culture": "Pop culture",
  wholesome: "Wholesome",
  "politics-left": "Politics",
  "politics-right": "Politics",
  iconic: "Throwback",
};

function reasonFor(tweet: CorpusTweet, profile: Profile, rng: () => number): string {
  const why = profile.circle?.[tweet.handle.toLowerCase()];
  if (why) {
    const options = [
      `@${tweet.handle} — ${why}`,
      `Because @${profile.handle} interacts with @${tweet.handle}`,
      `From @${tweet.handle}, who @${profile.handle} actually engages with`,
    ];
    return pick(rng, options);
  }
  const matching = tweet.tags.filter((t) => (profile.tagWeights[t] ?? 0) >= 1);
  const topic = TAG_LABEL[matching[0] ?? tweet.tags[0]] ?? "the timeline";
  const who = profile.source === "handle" ? `@${profile.handle}` : "people like this";
  const options = [
    `Popular in ${topic}`,
    `Trending with accounts ${who} follows`,
    `Because ${who} engaged with similar posts`,
    `${topic} · Suggested for this feed`,
    tweet.tags.includes("iconic") ? "Resurfaced classic · the algorithm never forgets" : `Popular in ${topic}`,
  ];
  return pick(rng, options);
}

/** Accounts that fit a profile — the "see who actually posts like this" links. */
export function matchingAccounts(profile: Profile, limit = 6): Account[] {
  return ACCOUNTS.filter((a) => a.handle.toLowerCase() !== profile.handle?.toLowerCase())
    .map((a) => ({
      a,
      score: a.tags.reduce((s, t) => s + (profile.tagWeights[t] ?? 0), 0),
    }))
    .filter((x) => x.score >= 1)
    .sort((x, y) => y.score - x.score || y.a.followers - x.a.followers)
    .slice(0, limit)
    .map((x) => x.a);
}

function heuristicSummary(tags: Tag[], handle?: string, answers?: SurveyAnswers): string {
  const topics = [...new Set(tags.map((t) => TAG_LABEL[t]))].slice(0, 3);
  const topicStr =
    topics.length > 1 ? `${topics.slice(0, -1).join(", ")} and ${topics.at(-1)}` : topics[0] ?? "a little of everything";
  const flavor =
    answers?.online === "terminal"
      ? "served from the deepest corners of the site"
      : answers?.online === "normal"
        ? "mostly the posts everyone else saw too"
        : "with the shitposts the algorithm insists on";
  const subject = handle ? `@${handle}'s algorithm` : "This algorithm";
  return `${subject} thinks this feed runs on ${topicStr} — ${flavor}.`;
}

function surveyPersonaName(answers: SurveyAnswers): string {
  const online = ONLINE_LABEL[answers.online];
  const lean = answers.lean === "none" ? "" : ` ${LEAN_LABEL[answers.lean]}`;
  const main = answers.interests[0] ? TAG_LABEL[answers.interests[0]].toLowerCase() : "internet";
  return `${online}${lean} ${main} enjoyer`;
}
