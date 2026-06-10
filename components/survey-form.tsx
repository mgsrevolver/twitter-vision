"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Tag } from "@/lib/types";

const LEANS = [
  { value: "left", label: "Leans left" },
  { value: "none", label: "Doesn't do politics" },
  { value: "right", label: "Leans right" },
] as const;

const INTERESTS: { value: Tag; label: string }[] = [
  { value: "tech", label: "Tech" },
  { value: "sports", label: "Sports" },
  { value: "pop-culture", label: "Pop culture" },
  { value: "finance", label: "Money & markets" },
  { value: "media", label: "News junkie" },
  { value: "humor", label: "Shitposts" },
];

const VIBES = [
  { value: "chaotic", label: "Chaotic", hint: "feral, unhinged, online" },
  { value: "wholesome", label: "Wholesome", hint: "still thinks it's 2012 twitter" },
  { value: "intense", label: "Intense", hint: "argues with strangers at 1am" },
] as const;

export function SurveyForm() {
  const router = useRouter();
  const [lean, setLean] = useState<(typeof LEANS)[number]["value"]>("none");
  const [interests, setInterests] = useState<Tag[]>([]);
  const [vibe, setVibe] = useState<(typeof VIBES)[number]["value"]>("chaotic");

  function toggleInterest(t: Tag) {
    setInterests((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  }

  function submit() {
    const params = new URLSearchParams({ lean, vibe });
    if (interests.length) params.set("i", interests.join(","));
    params.set("s", Math.random().toString(36).slice(2, 8));
    router.push(`/feed?${params}`);
  }

  const chip = (selected: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
      selected ? "border-accent bg-accent-soft text-ink" : "border-line bg-card text-ink-soft hover:border-accent/50"
    }`;

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink-soft">Whose politics?</legend>
        <div className="flex flex-wrap gap-2">
          {LEANS.map((o) => (
            <button key={o.value} type="button" onClick={() => setLean(o.value)} className={chip(lean === o.value)}>
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink-soft">Into what? (pick any)</legend>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => toggleInterest(o.value)}
              className={chip(interests.includes(o.value))}
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink-soft">What&apos;s the vibe?</legend>
        <div className="flex flex-wrap gap-2">
          {VIBES.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setVibe(o.value)}
              className={chip(vibe === o.value)}
              title={o.hint}
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={submit}
        className="w-full rounded-2xl bg-accent px-4 py-3 font-medium text-white shadow-sm transition-transform hover:scale-[1.01] active:scale-[0.99]"
      >
        Show me this person&apos;s feed →
      </button>
    </div>
  );
}
