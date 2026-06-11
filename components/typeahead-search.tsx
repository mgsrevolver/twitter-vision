"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { searchAccounts } from "@/lib/accounts";
import { formatCount } from "@/lib/format";

export function TypeaheadSearch() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchAccounts(query), [query]);

  function go(handle: string) {
    setDestination(handle);
    setOpen(false);
    startTransition(() => {
      router.push(`/u/${encodeURIComponent(handle)}`);
    });
  }

  const navigating = pending && destination !== null;

  return (
    <div className="relative">
      <div
        className={`flex items-center gap-2 rounded-2xl border bg-card px-4 py-3 shadow-sm ${
          navigating ? "border-accent" : "border-line focus-within:border-accent"
        }`}
      >
        <span className="text-lg text-ink-soft">@</span>
        <input
          ref={inputRef}
          value={query}
          disabled={navigating}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              const handle = results[active]?.handle ?? query.replace(/^@/, "");
              if (handle) go(handle);
            }
          }}
          placeholder="type a username — try elonmusk, AOC, dril…"
          className="w-full bg-transparent text-base outline-none placeholder:text-ink-soft/60 disabled:opacity-60"
          autoComplete="off"
          spellCheck={false}
          aria-label="Search for an X account"
        />
        {navigating && (
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 animate-spin text-accent" aria-hidden>
            <path
              fill="currentColor"
              d="M12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-1.8-4.3L13 11h7V4l-2.4 2.4A8 8 0 0 0 12 4Z"
            />
          </svg>
        )}
      </div>

      {navigating && (
        <div
          className="mt-2 flex items-center gap-3 rounded-2xl border border-accent/50 bg-accent-soft px-4 py-3"
          role="status"
          aria-live="polite"
        >
          <span className="h-2.5 w-2.5 animate-ping rounded-full bg-accent" />
          <p className="text-sm">
            simulating <span className="font-semibold">@{destination}</span>&apos;s timeline — reading the
            algorithm&apos;s mind…
          </p>
        </div>
      )}

      {open && !navigating && results.length > 0 && (
        <ul className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl border border-line bg-card shadow-lg">
          {results.map((a, i) => (
            <li key={a.handle}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(a.handle)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left ${
                  i === active ? "bg-accent-soft" : ""
                }`}
              >
                <span className="min-w-0">
                  <span className="font-medium">{a.name}</span>{" "}
                  <span className="text-sm text-ink-soft">@{a.handle}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-ink-soft">
                  {formatCount(a.followers)} followers
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
