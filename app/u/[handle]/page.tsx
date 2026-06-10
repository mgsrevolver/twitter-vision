import type { Metadata } from "next";
import Link from "next/link";
import { findAccount } from "@/lib/accounts";
import { profileFromAccountLike, profileFromHandle } from "@/lib/feed-engine";
import { formatCount } from "@/lib/format";
import { inferAccount } from "@/lib/infer-profile";
import { SITE_URL } from "@/lib/site";
import { FeedView } from "@/components/feed-view";

type Props = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ s?: string; tab?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const account = findAccount(decodeURIComponent(handle));
  if (!account) {
    return { title: "their feed.", robots: { index: false } };
  }
  const title = `${account.name} (@${account.handle}) — what their Twitter / X feed probably looks like`;
  const description = `A simulated X (Twitter) timeline for ${account.name}: real posts from accounts @${account.handle} actually interacts with, reassembled by an imagined algorithm. ${formatCount(account.followers)} followers. No API, no login, nothing collected.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/u/${account.handle}` },
    openGraph: {
      title,
      description,
      type: "profile",
      images: [`/api/og?u=${account.handle}`],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function UserFeedPage({ params, searchParams }: Props) {
  const [{ handle }, { s, tab }] = await Promise.all([params, searchParams]);
  const raw = decodeURIComponent(handle);
  let profile = profileFromHandle(raw);
  let inferredFollowers: number | undefined;

  if (!profile) {
    // not in the index — let the model vouch for it (no-op without an API key)
    const inferred = await inferAccount(raw);
    if (inferred) {
      profile = profileFromAccountLike(inferred.handle, inferred.name, inferred.tags);
      inferredFollowers = inferred.followers;
    }
  }

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
        <Link href="/" className="mt-6 inline-block rounded-full bg-accent px-5 py-2 text-accent-ink">
          ← try another
        </Link>
      </div>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${profile.displayName} (@${profile.handle}) — simulated X feed`,
    description: `A simulated X/Twitter timeline for ${profile.displayName}, assembled from real posts.`,
    url: `${SITE_URL}/u/${profile.handle}`,
    mainEntity: {
      "@type": "Person",
      name: profile.displayName,
      alternateName: `@${profile.handle}`,
      sameAs: [`https://x.com/${profile.handle}`],
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FeedView
        profile={profile}
        seed={s || "default"}
        tab={tab === "following" ? "following" : "foryou"}
        followersOverride={inferredFollowers}
        inferred={inferredFollowers !== undefined}
      />
    </>
  );
}
