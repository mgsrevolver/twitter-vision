"use client";

import { useEffect, useState } from "react";
import type { Profile } from "@/lib/types";

/**
 * Shows the heuristic summary immediately, then upgrades to the LLM-written
 * "algorithmic read" if the persona API has a key configured. The feed itself
 * never blocks on this. The LLM result is keyed by handle so a stale fetch
 * never shows under a different profile.
 */
export function PersonaBlurb({ profile }: { profile: Profile }) {
  const [llm, setLlm] = useState<{ handle: string; text: string } | null>(null);

  useEffect(() => {
    if (profile.source !== "handle" || !profile.handle) return;
    const handle = profile.handle;
    const controller = new AbortController();
    fetch("/api/persona", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ handle }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: { summary: string | null }) => {
        if (data.summary) setLlm({ handle, text: data.summary });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [profile]);

  const summary = llm && llm.handle === profile.handle ? llm.text : profile.summary;
  return <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{summary}</p>;
}
