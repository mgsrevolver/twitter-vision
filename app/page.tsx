import { TypeaheadSearch } from "@/components/typeahead-search";
import { SketchAccordion } from "@/components/sketch-accordion";
import { corpusMeta, formatEastern } from "@/lib/corpus-meta";

export default function Home() {
  const meta = corpusMeta();
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-16 sm:pt-24">
      <h1 className="font-[family-name:var(--font-fraunces)] text-5xl font-medium tracking-tight sm:text-6xl">
        <span className="headline-shimmer">
          their{" "}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            aria-hidden="true"
            style={{ display: "inline-block", width: "0.82em", height: "0.82em", verticalAlign: "-0.1em" }}
          >
            <defs>
              <linearGradient id="bird-grad" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#edeae2" />
                <stop offset="100%" stopColor="#ffc857" />
              </linearGradient>
            </defs>
            <path
              d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"
              fill="url(#bird-grad)"
            />
          </svg>
          {" "}feed
        </span>
        <span className="accent-pulse text-accent">.</span>
      </h1>
      <p className="mt-4 max-w-prose text-lg leading-relaxed text-ink-soft">
        Choose any popular twitter account, and we&apos;ll simulate their feed, notifications, and more.
      </p>
      <p className="mt-2 inline-block rounded-full bg-accent-soft px-3 py-1 text-xs text-ink">
        a simulation, not surveillance — no API, no login, nothing collected about you
      </p>
      <p className="mt-3 text-xs text-ink-soft">
        {meta.tweetCount.toLocaleString("en-US")} real posts · corpus last refreshed {formatEastern(meta.builtAt)}
      </p>

      <section className="mt-14">
        <h2 className="mb-4 font-[family-name:var(--font-fraunces)] text-3xl">simulate their x experience</h2>
        <TypeaheadSearch />
      </section>

      <div className="mt-12 space-y-4 pb-16">
        <p className="inline-block rounded-xl bg-accent-soft px-3 py-2 text-xs text-ink">
          You can also spy on the timeline of an imaginary user based on a psychographic profile.
        </p>
        <SketchAccordion />
      </div>
    </div>
  );
}
