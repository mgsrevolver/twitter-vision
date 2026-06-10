import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { profileFromSurvey } from "@/lib/feed-engine";
import type { Profile, SurveyAnswers, Tag } from "@/lib/types";
import { FeedView } from "@/components/feed-view";

type Params = { [key: string]: string | string[] | undefined };

function str(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

const LEANS = ["progressive", "liberal", "centrist", "libertarian", "maga", "conservative", "none"];
const ONLINE = ["normal", "toomuch", "terminal"];

function surveyProfile(params: Params): Profile | null {
  if (!params.lean && !params.i && !params.online) return null;
  const answers: SurveyAnswers = {
    lean: (LEANS.includes(str(params.lean)) ? str(params.lean) : "none") as SurveyAnswers["lean"],
    interests: str(params.i)
      .split(",")
      .filter(Boolean) as Tag[],
    online: (ONLINE.includes(str(params.online)) ? str(params.online) : "toomuch") as SurveyAnswers["online"],
  };
  return profileFromSurvey(answers);
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }): Promise<Metadata> {
  const params = await searchParams;
  const profile = surveyProfile(params);
  const title = profile ? `a ${profile.displayName.toLowerCase()}'s timeline — their feed.` : "their feed.";
  return {
    title,
    description: "A simulated X timeline built from real posts. No API, no login, nothing collected.",
    openGraph: { title, images: [`/api/og?${new URLSearchParams(params as Record<string, string>)}`] },
    twitter: { card: "summary_large_image" },
  };
}

export default async function FeedPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;

  // handle lookups live at /u/[handle] now — the URL that can rank
  const handle = str(params.u);
  if (handle) {
    const s = str(params.s);
    permanentRedirect(`/u/${encodeURIComponent(handle)}${s ? `?s=${encodeURIComponent(s)}` : ""}`);
  }

  const profile = surveyProfile(params);
  if (!profile) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-24 text-center">
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl">Nothing to simulate yet.</h1>
        <p className="mt-3 text-ink-soft">Pick an account or sketch a person first.</p>
        <Link href="/" className="mt-6 inline-block rounded-full bg-accent px-5 py-2 text-accent-ink">
          ← start over
        </Link>
      </div>
    );
  }

  return (
    <FeedView
      profile={profile}
      seed={str(params.s) || "default"}
      tab={str(params.tab) === "following" ? "following" : "foryou"}
    />
  );
}
