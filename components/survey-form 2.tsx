"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Lean, OnlineLevel, Tag } from "@/lib/types";

const LEANS: { value: Lean; label: string; hint?: string }[] = [
  { value: "progressive", label: "Progressive left" },
  { value: "liberal", label: "Liberal" },
  { value: "centrist", label: "Centrist" },
  { value: "libertarian", label: "Libertarian" },
  { value: "conservative", label: "Old-school conservative" },
  { value: "maga", label: "MAGA" },
  { value: "none", label: "Doesn't do politics" },
];

const INTERESTS: { value: Tag; label: string }[] = [
  { value: "tech", label: "Tech" },
  { value: "ai", label: "AI" },
  { value: "science", label: "Science" },
  { value: "sports", label: "Sports" },
  { value: "music", label: "Music" },
  { value: "film-tv", label: "Movies & TV" },
  { value: "gaming", label: "Gaming" },
  { value: "finance", label: "Money & markets" },
  { value: "crypto", label: "Crypto" },
  { value: "food", label: "Food" },
  { value: "books", label: "Books" },
  { value: "fitness", label: "Fitness" },
  { value: "animals", label: "Animals" },
  { value: "media", label: "News junkie" },
  { value: "pop-culture", label: "Pop culture" },
  { value: "humor", label: "Shitposts" },
];

const ONLINE: { value: OnlineLevel; label: string; hint: string }[] = [
  { value: "normal", label: "A normal amount", hint: "sees what everyone else saw" },
  { value: "toomuch", label: "Too much", hint: "knows the discourse before you do" },
  { value: "terminal", label: "Terminally", hint: "fluent in posts with 43 likes" },
];

export function SurveyForm() {
  const router = useRouter();
  const [lean, setLean] = useState<Lean>("none");
  const [interests, setInterests] = useState<Tag[]>([]);
  const [online, setOnline] = useState<OnlineLevel>("toomuch");

  function toggleInterest(t: Tag) {
    setInterests((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  }

  function submit() {
    const params = new URLSearchParams({ lean, online });
    if (interests.length) params.set("i", interests.join(","));
    params.set("s", Math.random().toString(36).slice(2, 8));
    router.push(`/feed?${params}`);
  }

  const chip = (selected: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
      selected ? "border-accent bg-accent-soft text-ink" : "border-line bg-card text-ink-soft hover:border-accent/60"
    }`;

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink-soft">Where do they sit politically?</legend>
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
        <legend className="mb-2 text-sm font-medium text-ink-soft">How online are they?</legend>
        <div className="flex flex-wrap gap-2">
          {ONLINE.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setOnline(o.value)}
              className={chip(online === o.value)}
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
        className="w-full rounded-2xl bg-accent px-4 py-3 font-medium text-accent-ink shadow-sm transition-transform hover:scale-[1.01] active:scale-[0.99]"
      >
        Show me this person&apos;s feed →
      </button>
    </div>
  );
}
