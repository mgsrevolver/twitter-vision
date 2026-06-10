import { TypeaheadSearch } from "@/components/typeahead-search";
import { SurveyForm } from "@/components/survey-form";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-16 sm:pt-24">
      <h1 className="font-[family-name:var(--font-fraunces)] text-5xl font-medium tracking-tight sm:text-6xl">
        their feed<span className="text-accent">.</span>
      </h1>
      <p className="mt-4 max-w-prose text-lg leading-relaxed text-ink-soft">
        Walk a mile in someone else&apos;s timeline. Pick any account — or sketch a person — and we&apos;ll
        simulate the feed their algorithm probably serves them. Every post is real and links to the original on X.
      </p>
      <p className="mt-2 inline-block rounded-full bg-accent-soft px-3 py-1 text-xs text-ink">
        a simulation, not surveillance — no API, no login, nothing collected about you
      </p>

      <section className="mt-12">
        <h2 className="mb-3 font-[family-name:var(--font-fraunces)] text-2xl">Spy on a timeline</h2>
        <TypeaheadSearch />
      </section>

      <div className="my-10 flex items-center gap-4 text-sm text-ink-soft">
        <span className="h-px flex-1 bg-line" />
        or describe a person instead
        <span className="h-px flex-1 bg-line" />
      </div>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-fraunces)] text-2xl">Sketch a person instead</h2>
        <SurveyForm />
      </section>
    </div>
  );
}
