"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SurveyForm } from "@/components/survey-form";
import type { Lean, OnlineLevel, Tag } from "@/lib/types";

export function SketchAccordion() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lean, setLean] = useState<Lean>("none");
  const [interests, setInterests] = useState<Tag[]>([]);
  const [online, setOnline] = useState<OnlineLevel>("toomuch");

  function submit() {
    const params = new URLSearchParams({ lean, online });
    if (interests.length) params.set("i", interests.join(","));
    params.set("s", Math.random().toString(36).slice(2, 8));
    router.push(`/feed?${params}`);
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink-soft transition-colors hover:border-accent/40 hover:text-ink"
      >
        <span>sketch a person</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div style={{ animation: "fadeSlideIn 0.2s ease" }}>
          <SurveyForm
            lean={lean}
            onLeanChange={setLean}
            interests={interests}
            onInterestsChange={setInterests}
            online={online}
            onOnlineChange={setOnline}
          />
        </div>
      )}

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
