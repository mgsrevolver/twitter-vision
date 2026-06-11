"use client";

import { useEffect, useState } from "react";
import type { NotificationItem } from "@/lib/notifications";
import { NotificationCard } from "@/components/notification-card";

/**
 * Makes the notifications tab feel live: the first few server-built items
 * are held back, then trickle in one at a time with a slide + unread tint —
 * paced by how famous this person is. Nothing is fabricated client-side;
 * we only re-time what the server already wrote.
 */

/** Deterministic holdback so server HTML and first client render match. */
function holdbackFor(count: number): number {
  if (count >= 8) return 4;
  if (count >= 6) return 3;
  if (count >= 4) return 2;
  return 0;
}

function revealDelay(followers: number): number {
  const r = Math.random();
  if (followers >= 5_000_000) return 5_000 + r * 10_000; // ~5-15s
  if (followers >= 500_000) return 10_000 + r * 15_000; // ~10-25s
  if (followers >= 50_000) return 20_000 + r * 25_000; // ~20-45s
  return 40_000 + r * 50_000; // ~40-90s
}

export function LiveNotificationFeed({
  items,
  followers,
}: {
  items: NotificationItem[];
  followers: number;
}) {
  const holdback = holdbackFor(items.length);
  const [revealed, setRevealed] = useState(0);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [reduceMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  // new seed / new person → start the trickle over (state-from-previous-render
  // pattern, so the reset happens in the same render that sees the new items)
  const [prevItems, setPrevItems] = useState(items);
  if (prevItems !== items) {
    setPrevItems(items);
    setRevealed(0);
    setFreshId(null);
  }

  useEffect(() => {
    if (holdback === 0) return;

    const ids = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        ids.delete(id);
        fn();
      }, ms);
      ids.add(id);
    };

    let released = 0;
    const tick = () => {
      if (document.hidden) {
        // pause while backgrounded; check again soon
        later(tick, 4_000);
        return;
      }
      released += 1;
      const item = items[holdback - released];
      setRevealed(released);
      setFreshId(item.id);
      later(() => setFreshId((f) => (f === item.id ? null : f)), 2_600);
      if (released < holdback) later(tick, revealDelay(followers));
    };

    later(tick, revealDelay(followers));
    return () => ids.forEach((id) => clearTimeout(id));
  }, [items, holdback, followers]);

  const visible = items.slice(Math.max(0, holdback - revealed));

  return (
    <div className="space-y-3">
      <style>{`@keyframes lnf-tint { from { opacity: 0.14; } to { opacity: 0; } }`}</style>
      {visible.map((item) => {
        const fresh = item.id === freshId && !reduceMotion;
        return (
          <div
            key={item.id}
            className="relative"
            style={fresh ? { animation: "fadeSlideIn 0.45s ease-out" } : undefined}
          >
            <NotificationCard item={item} />
            {fresh && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl bg-accent"
                style={{ opacity: 0, animation: "lnf-tint 2.4s ease-out forwards" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
