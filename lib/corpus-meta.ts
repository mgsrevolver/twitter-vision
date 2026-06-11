import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Corpus freshness facts for display. Read via fs (not import) so the 12MB
 * corpus never lands in a page bundle; the homepage is static, so this runs
 * at build time — exactly when deployed data can change.
 */
let cached: { builtAt: string; tweetCount: number } | null = null;

export function corpusMeta(): { builtAt: string; tweetCount: number } {
  if (!cached) {
    const raw = readFileSync(path.join(process.cwd(), "data", "corpus.json"), "utf8");
    const corpus = JSON.parse(raw) as { builtAt: string; tweets: unknown[] };
    cached = { builtAt: corpus.builtAt, tweetCount: corpus.tweets.length };
  }
  return cached;
}

/** "Jun 11, 10:44 AM ET" */
export function formatEastern(iso: string): string {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
  return `${formatted} ET`;
}
