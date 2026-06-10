import { TypeaheadSearch } from "@/components/typeahead-search";
import { SketchAccordion } from "@/components/sketch-accordion";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-16 sm:pt-24">
      <h1 className="font-[family-name:var(--font-fraunces)] text-5xl font-medium tracking-tight sm:text-6xl">
        their feed<span className="text-accent">.</span>
      </h1>
      <p className="mt-4 max-w-prose text-lg leading-relaxed text-ink-soft">
        Walk a mile in someone else&apos;s timeline. Choose any popular account, and we&apos;ll simulate what they
        might see based on their timeline and behavior.
      </p>
      <p className="mt-2 inline-block rounded-full bg-accent-soft px-3 py-1 text-xs text-ink">
        a simulation, not surveillance — no API, no login, nothing collected about you
      </p>

      <section className="mt-14">
        <h2 className="mb-4 font-[family-name:var(--font-fraunces)] text-3xl">Spy on a timeline</h2>
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
