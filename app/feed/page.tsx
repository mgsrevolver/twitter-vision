import type { Metadata } from "next";
import Link from "next/link";
import { assembleFeed, matchingAccounts, profileFromHandle, profileFromSurvey } from "@/lib/feed-engine";
import { formatCount } from "@/lib/format";
import type { Profile, SurveyAnswers, Tag } from "@/lib/types";
import { TweetCard } from "@/components/tweet-card";
import { ShareControls } from "@/components/share-controls";
import { PersonaBlurb } from "@/components/persona-blurb";

type Params = { [key: string]: string | string[] | undefined };

function str(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

function profileFromParams(params: Params): Profile | null {
  const handle = str(params.u);
  if (handle) return profileFromHandle(handle);
  if (params.lean || params.i || params.vibe) {
    const answers: SurveyAnswers = {
      lean: (["left", "right"].includes(str(params.lean)) ? str(params.lean) : "none") as SurveyAnswers["lean"],
      interests: str(params.i)
        .split(",")
        .filter(Boolean) as Tag[],
      vibe: (["wholesome", "intense"].includes(str(params.vibe))
        ? str(params.vibe)
        : "chaotic") as SurveyAnswers["vibe"],
    };
    return profileFromSurvey(answers);
  }
  return null;
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }): Promise<Metadata> {
  const params = await searchParams;
  const profile = profileFromParams(params);
  const title = profile
    ? profile.source === "handle"
      ? `what @${profile.handle} probably sees — their feed.`
      : `a ${profile.displayName.toLowerCase()}'s timeline — their feed.`
    : "their feed.";
  return {
    title,
    description: "A simulated X timeline built from real posts. No API, no login, nothing collected.",
    openGraph: { title, images: [`/api/og?${new URLSearchParams(params as Record<string, string>)}`] },
    twitter: { card: "summary_large_image" },
  };
}

export default async function FeedPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const profile = profileFromParams(params);
  const seed = str(params.s) || "default";

  if (!profile) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-24 text-center">
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl">
          We don&apos;t know that one yet.
        </h1>
        <p className="mt-3 text-ink-soft">
          That account isn&apos;t in our index of popular accounts — this little site only simulates feeds for
          accounts with enough public signal to caricature responsibly.
        </p>
        <Link href="/" className="mt-6 inline-block rounded-full bg-accent px-5 py-2 text-white">
          ← try another
        </Link>
      </div>
    );
  }

  const feed = assembleFeed(profile, seed);
  const similar = matchingAccounts(profile);

  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-10">
      <Link href="/" className="text-sm text-ink-soft hover:text-ink">
        ← their feed.
      </Link>

      <header className="mt-4 rounded-2xl border border-line bg-card p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-ink-soft">simulated timeline</p>
        <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-3xl leading-tight">
          {profile.source === "handle" ? (
            <>what @{profile.handle} probably sees</>
          ) : (
            <>the {profile.displayName.toLowerCase()}</>
          )}
        </h1>
        <PersonaBlurb profile={profile} />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ShareControls />
          {profile.handle && (
            <a
              href={`https://x.com/${profile.handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-line bg-card px-4 py-2 text-sm shadow-sm transition-colors hover:border-accent"
            >
              the real @{profile.handle} ↗
            </a>
          )}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink-soft">
          This is a <strong>simulation</strong> built from public signals and a curated archive of real posts —
          not their actual timeline. We can&apos;t see that, and neither can anyone else.
        </p>
      </header>

      <section className="mt-6 space-y-3">
        {feed.map((item) => (
          <TweetCard key={item.tweet.id} item={item} />
        ))}
      </section>

      {similar.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-[family-name:var(--font-fraunces)] text-xl">
            Real accounts that match this profile
          </h2>
          <ul className="space-y-2">
            {similar.map((a) => (
              <li
                key={a.handle}
                className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-2.5 shadow-sm"
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
                  <span className="text-xs tabular-nums text-ink-soft">{formatCount(a.followers)} followers</span>
                  <Link href={`/feed?u=${a.handle}`} className="text-xs text-teal hover:underline">
                    simulate →
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
