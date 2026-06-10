"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchAccounts } from "@/lib/accounts";
import { formatCount } from "@/lib/format";

export function TypeaheadSearch() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchAccounts(query), [query]);

  function go(handle: string) {
    router.push(`/u/${encodeURIComponent(handle)}`);
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-card px-4 py-3 shadow-sm focus-within:border-accent">
        <span className="text-lg text-ink-soft">@</span>
        <input
          ref={inputRef}
          value={query}
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
          className="w-full bg-transparent text-base outline-none placeholder:text-ink-soft/60"
          autoComplete="off"
          spellCheck={false}
          aria-label="Search for an X account"
        />
      </div>

      {open && results.length > 0 && (
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
