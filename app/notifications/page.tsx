import type { Metadata } from "next";
import Link from "next/link";
import { findAccount } from "@/lib/accounts";
import { buildNotifications } from "@/lib/notifications";
import { rngFor } from "@/lib/seeded-random";
import { NotificationCard } from "@/components/notification-card";

type Params = { [key: string]: string | string[] | undefined };

function str(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

// Param parsing mirrors app/feed/page.tsx (copied, not shared — that file is
// being rewritten concurrently and we only need the lookup, not the Profile).
const LEANS = ["progressive", "liberal", "centrist", "libertarian", "maga", "conservative", "none"];
const ONLINE = ["normal", "toomuch", "terminal"];

const ONLINE_LABEL: Record<string, string> = {
  normal: "casually online",
  toomuch: "too-online",
  terminal: "terminally online",
};

const LEAN_TAG: Record<string, string | undefined> = {
  progressive: "politics-left",
  liberal: "politics-left",
  libertarian: "politics-right",
  maga: "politics-right",
  conservative: "politics-right",
};

/** Survey personas are nobodies (affectionately) — follower count by online level. */
const SURVEY_FOLLOWERS: Record<string, [number, number]> = {
  normal: [200, 600],
  toomuch: [1_000, 5_000],
  terminal: [5_000, 15_000],
};

interface Target {
  handle?: string;
  displayName: string;
  followers: number;
  verified: boolean;
  tags: string[];
}

function targetFromParams(params: Params, seed: string): Target | null {
  const handle = str(params.u).replace(/^@/, "");
  if (handle) {
    const account = findAccount(handle);
    if (account) {
      return {
        handle: account.handle,
        displayName: account.name,
        followers: account.followers,
        // accounts.json doesn't track verification; everyone indexed at this
        // scale has the checkmark anyway (display-only heuristic)
        verified: account.followers >= 200_000,
        tags: account.tags,
      };
    }
    return { handle, displayName: `@${handle}`, followers: 50_000, verified: false, tags: [] };
  }
  if (params.lean || params.i || params.online) {
    const lean = LEANS.includes(str(params.lean)) ? str(params.lean) : "none";
    const online = ONLINE.includes(str(params.online)) ? str(params.online) : "toomuch";
    const interests = str(params.i).split(",").filter(Boolean);
    const tags = [...interests];
    const leanTag = LEAN_TAG[lean];
    if (leanTag && !tags.includes(leanTag)) tags.push(leanTag);
    const [lo, hi] = SURVEY_FOLLOWERS[online];
    const rng = rngFor(`survey-followers|${seed}|${online}`);
    return {
      displayName: `${ONLINE_LABEL[online]}${lean === "none" ? "" : ` ${lean}`} poster`,
      followers: lo + Math.floor(rng() * (hi - lo)),
      verified: false,
      tags,
    };
  }
  return null;
}

function backHref(params: Params): string {
  const handle = str(params.u).replace(/^@/, "");
  const seed = str(params.s);
  if (handle) return `/u/${encodeURIComponent(handle)}${seed ? `?s=${encodeURIComponent(seed)}` : ""}`;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (typeof v === "string") qs.set(k, v);
  const s = qs.toString();
  return s ? `/feed?${s}` : "/feed";
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }): Promise<Metadata> {
  const params = await searchParams;
  const handle = str(params.u).replace(/^@/, "");
  const title = handle ? `what @${handle}'s notifications probably look like — their feed.` : "notifications — their feed.";
  return {
    title,
    description: "A simulated X notifications tab. Every notification is fictional. No API, no login, nothing collected.",
  };
}

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const seed = str(params.s) || "default";
  const target = targetFromParams(params, seed);

  if (!target) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-24 text-center">
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl">No one&apos;s phone to look at.</h1>
        <p className="mt-3 text-ink-soft">
          Pick a persona or an account first — notifications only make sense for somebody.
        </p>
        <Link href="/" className="mt-6 inline-block rounded-full bg-accent px-5 py-2 text-accent-ink">
          ← pick someone
        </Link>
      </div>
    );
  }

  const items = buildNotifications({ ...target, seed });

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-16">
      <header className="sticky top-0 z-10 -mx-4 border-b border-line bg-paper/90 px-4 pb-3 pt-4 backdrop-blur">
        <div className="flex items-baseline gap-3">
          <Link href={backHref(params)} className="text-sm text-ink-soft hover:text-ink">
            ← feed
          </Link>
          <h1 className="font-[family-name:var(--font-fraunces)] text-xl leading-tight">Notifications</h1>
        </div>
        <p className="mt-1 text-xs text-ink-soft">simulated — every notification here is fictional</p>
      </header>

      <div className="mt-4 rounded-2xl border border-line bg-card px-4 py-3">
        <p className="text-sm">
          {target.handle ? (
            <>
              what <span className="font-semibold">@{target.handle}</span>&apos;s mentions probably feel like
            </>
          ) : (
            <>
              what a <span className="font-semibold">{target.displayName}</span>&apos;s mentions probably feel like
            </>
          )}
        </p>
      </div>

      <section className="mt-4 space-y-3">
        {items.map((item) => (
          <NotificationCard key={item.id} item={item} />
        ))}
      </section>
    </div>
  );
}
