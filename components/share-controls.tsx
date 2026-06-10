"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function ShareControls() {
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function remix() {
    const params = new URLSearchParams(searchParams);
    params.set("s", Math.random().toString(36).slice(2, 8));
    router.push(`${pathname}?${params}`);
  }

  const btn =
    "rounded-full border border-line bg-card px-4 py-2 text-sm shadow-sm transition-colors hover:border-accent";

  return (
    <div className="flex gap-2">
      <button type="button" onClick={copyLink} className={btn}>
        {copied ? "copied ✓" : "share this feed 🔗"}
      </button>
      <button type="button" onClick={remix} className={btn} title="same person, different scroll session">
        refresh the algorithm ↻
      </button>
    </div>
  );
}
