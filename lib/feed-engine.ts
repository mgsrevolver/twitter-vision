import corpusData from "@/data/corpus.json";
import { rngFor, pick } from "./seeded-random";
import { ACCOUNTS, findAccount } from "./accounts";
import type { Account, CorpusTweet, FeedItem, Profile, SurveyAnswers, Tag } from "./types";

export const CORPUS = corpusData.tweets as CorpusTweet[];

const FEED_LENGTH = 11;

/** Everyone's feed has shitposts. That is simply true. */
const HUMOR_FLOOR = 0.35;

const LEAN_TAG: Record<string, Tag> = { left: "politics-left", right: "politics-right" };

export function profileFromHandle(handle: string): Profile | null {
  const account = findAccount(handle);
  if (!account) return null;
  const tagWeights: Partial<Record<Tag, number>> = { humor: HUMOR_FLOOR, iconic: 0.25 };
  for (const t of account.tags) tagWeights[t] = (tagWeights[t] ?? 0) + 1;
  return {
    source: "handle",
    handle: account.handle,
    displayName: account.name,
    tagWeights,
    summary: heuristicSummary(account.tags, account.handle),
  };
}

export function profileFromSurvey(answers: SurveyAnswers): Profile {
  const tagWeights: Partial<Record<Tag, number>> = { humor: HUMOR_FLOOR, iconic: 0.25 };
  for (const t of answers.interests) tagWeights[t] = (tagWeights[t] ?? 0) + 1;
  if (answers.lean !== "none") {
    const t = LEAN_TAG[answers.lean];
    tagWeights[t] = (tagWeights[t] ?? 0) + 1.2;
  }
  if (answers.vibe === "chaotic") tagWeights.humor = (tagWeights.humor ?? 0) + 1;
  if (answers.vibe === "wholesome") tagWeights["pop-culture"] = (tagWeights["pop-culture"] ?? 0) + 0.5;
  if (answers.vibe === "intense") {
    tagWeights.media = (tagWeights.media ?? 0) + 0.6;
    if (answers.lean !== "none") {
      const t = LEAN_TAG[answers.lean];
      tagWeights[t] = (tagWeights[t] ?? 0) + 0.5;
    }
  }
  return {
    source: "survey",
    displayName: surveyPersonaName(answers),
    tagWeights,
    summary: heuristicSummary(answers.interests, undefined, answers),
  };
}

function tweetScore(tweet: CorpusTweet, weights: Partial<Record<Tag, number>>): number {
  let s = 0.05; // every real tweet has a nonzero shot — algorithms are weird
  for (const t of tweet.tags) s += weights[t] ?? 0;
  return s;
}

/** Weighted sample without replacement, deterministic for a given key. */
export function assembleFeed(profile: Profile, seed: string): FeedItem[] {
  const rng = rngFor(`${profile.displayName}|${seed}`);
  const pool = CORPUS.filter((t) => t.handle.toLowerCase() !== profile.handle?.toLowerCase());
  const items: CorpusTweet[] = [];
  const candidates = [...pool];
  while (items.length < Math.min(FEED_LENGTH, pool.length) && candidates.length) {
    const total = candidates.reduce((sum, t) => sum + tweetScore(t, profile.tagWeights), 0);
    let roll = rng() * total;
    let idx = 0;
    for (; idx < candidates.length - 1; idx++) {
      roll -= tweetScore(candidates[idx], profile.tagWeights);
      if (roll <= 0) break;
    }
    items.push(candidates.splice(idx, 1)[0]);
  }
  // avoid the same author twice in a row — cheap pass, keeps it feeling human-curated
  for (let i = 1; i < items.length; i++) {
    if (items[i].handle === items[i - 1].handle) {
      const j = items.findIndex((t, k) => k > i && t.handle !== items[i - 1].handle);
      if (j > 0) [items[i], items[j]] = [items[j], items[i]];
    }
  }
  return items.map((tweet) => ({ tweet, reason: reasonFor(tweet, profile, rng) }));
}

const TAG_LABEL: Record<Tag, string> = {
  tech: "Tech",
  "politics-left": "Politics",
  "politics-right": "Politics",
  "pop-culture": "Pop culture",
  sports: "Sports",
  finance: "Business & finance",
  media: "News",
  humor: "Comedy",
  iconic: "Throwback",
};

function reasonFor(tweet: CorpusTweet, profile: Profile, rng: () => number): string {
  const matching = tweet.tags.filter((t) => (profile.tagWeights[t] ?? 0) >= 1);
  const topic = TAG_LABEL[matching[0] ?? tweet.tags[0]];
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
  const vibe =
    answers?.vibe === "chaotic"
      ? "with a high tolerance for chaos"
      : answers?.vibe === "wholesome"
        ? "but keeps it wholesome"
        : answers?.vibe === "intense"
          ? "and takes it all very seriously"
          : "with the occasional shitpost the algorithm insists on";
  const subject = handle ? `@${handle}'s algorithm` : "This algorithm";
  return `${subject} thinks this feed runs on ${topicStr} — ${vibe}.`;
}

function surveyPersonaName(answers: SurveyAnswers): string {
  const lean = answers.lean === "left" ? "Left-leaning" : answers.lean === "right" ? "Right-leaning" : "Politically agnostic";
  const main = answers.interests[0] ? TAG_LABEL[answers.interests[0]].toLowerCase() : "internet";
  const vibe = answers.vibe === "chaotic" ? "gremlin" : answers.vibe === "wholesome" ? "enjoyer" : "obsessive";
  return `${lean} ${main} ${vibe}`;
}
