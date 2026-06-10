import Link from "next/link";
import { assembleFeed, assembleFollowingFeed, matchingAccounts, CORPUS } from "@/lib/feed-engine";
import { findAccount } from "@/lib/accounts";
import { formatCount } from "@/lib/format";
import { formatNotificationCount, notificationCount } from "@/lib/notifications";
import type { Profile } from "@/lib/types";
import { TweetCard } from "@/components/tweet-card";
import { FeedShell } from "@/components/feed-shell";

/** Most recent stored avatar for an account that authored corpus tweets. */
export function corpusAvatar(handle?: string): string | null {
  if (!handle) return null;
  const h = handle.toLowerCase();
  return CORPUS.find((t) => t.handle.toLowerCase() === h)?.avatar ?? null;
}

/** The whole simulated-timeline experience — shared by /u/[handle] and /feed. */
export function FeedView({
  profile,
  seed,
  tab = "foryou",
  followersOverride,
  inferred = false,
}: {
  profile: Profile;
  seed: string;
  tab?: "foryou" | "following";
  /** follower count when the account isn't in the index (LLM-inferred) */
  followersOverride?: number;
  inferred?: boolean;
}) {
  const feed = tab === "following" ? assembleFollowingFeed(profile, seed) : assembleFeed(profile, seed);
  const similar = matchingAccounts(profile);
  const avatarSrc = corpusAvatar(profile.handle);
  const followers =
    followersOverride ?? (profile.handle ? (findAccount(profile.handle)?.followers ?? 50_000) : 1_200);
  const unread = notificationCount(followers, seed, profile.handle);
  const notifBadge = unread > 0 ? formatNotificationCount(unread) : "";

  return (
    <FeedShell
      displayName={profile.displayName}
      handle={profile.handle}
      avatarSrc={avatarSrc}
      notifBadge={notifBadge}
    >
      <div className="mx-auto w-full max-w-xl border-x border-line min-h-screen">
        <div className="border-b border-line px-4 py-2.5">
          <h1 className="text-[13px] font-medium">
            {profile.source === "handle" ? (
              <>what @{profile.handle}&apos;s X feed probably looks like</>
            ) : (
              <>the {profile.displayName.toLowerCase()}&apos;s timeline</>
            )}
            <span className="font-normal text-ink-soft">
              {" "}
              · simulated{inferred && " · profile guessed by AI, not in our index"}
            </span>
          </h1>
        </div>

        <section aria-label="Simulated timeline">
          {feed.map((item) => (
            <TweetCard key={item.tweet.id} item={item} />
          ))}
          {feed.length === 0 && (
            <p className="px-4 py-16 text-center text-sm text-ink-soft">
              Quiet in here — we don&apos;t know enough about who this person follows yet.
            </p>
          )}
        </section>

        {similar.length > 0 && (
          <section className="px-4 py-6">
            <h2 className="mb-1 font-[family-name:var(--font-fraunces)] text-xl">
              Real accounts that match this profile
            </h2>
            <p className="mb-3 text-sm text-ink-soft">Follow the real thing — or simulate them next.</p>
            <ul>
              {similar.map((a) => (
                <li
                  key={a.handle}
                  className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0"
                >
                  <a
                    href={`https://x.com/${a.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 hover:text-accent"
                  >
                    <span className="font-medium">{a.name}</span>{" "}
                    <span className="text-sm text-ink-soft">@{a.handle} ↗</span>
                  </a>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-xs tabular-nums text-ink-soft">
                      {formatCount(a.followers)} followers
                    </span>
                    <Link href={`/u/${a.handle}`} className="text-xs text-teal hover:underline">
                      simulate →
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="border-t border-line px-4 py-4 text-xs leading-relaxed text-ink-soft">
          This is a <strong>simulation</strong> built from public signals and a curated archive of real posts —
          not their actual timeline. We can&apos;t see that, and neither can anyone else. Every post links to the
          original on X.
        </p>
      </div>
    </FeedShell>
  );
}
