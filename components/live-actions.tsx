"use client";

import { useEffect, useState } from "react";
import { formatCount } from "@/lib/format";
import { rngFor } from "@/lib/seeded-random";
import { likesPerSecond, parseAgoMinutes, sampleIncrement } from "@/lib/live-rates";

/** X's icon set, redrawn — same silhouettes, our palette. */
const ICONS = {
  reply: "M9 4.5h6A6.5 6.5 0 0 1 21.5 11v.5A6.5 6.5 0 0 1 15 18h-2.6L7 21.6V18h.5A6.5 6.5 0 0 1 2.5 11.5V11A6.5 6.5 0 0 1 9 4.5Z",
  repost:
    "M7 3.5 3 7.5l1.4 1.4L6 7.3V15a3 3 0 0 0 3 3h5v-2H9a1 1 0 0 1-1-1V7.3l1.6 1.6L11 7.5l-4-4Zm10 17 4-4-1.4-1.4-1.6 1.6V9a3 3 0 0 0-3-3h-5v2h5a1 1 0 0 1 1 1v7.7l-1.6-1.6L13 16.5l4 4Z",
  like: "M12 20.5s-7.5-4.7-9.3-9.3C1.3 7.7 3.6 4.5 6.8 4.5c2 0 3.7 1.1 4.6 2.7l.6 1.1.6-1.1c.9-1.6 2.6-2.7 4.6-2.7 3.2 0 5.5 3.2 4.1 6.7-1.8 4.6-9.3 9.3-9.3 9.3Z",
  views: "M5 19.5v-7h2.5v7H5Zm5.75 0V4.5h2.5v15h-2.5Zm5.75 0v-11H19v11h-2.5Z",
  share: "M12 3.5 7 8.5l1.4 1.4L11 7.3V15h2V7.3l2.6 2.6L17 8.5l-5-5ZM5 13v6.5h14V13h-2v4.5H7V13H5Z",
};

function ActionIcon({
  d,
  count,
  hover,
  filled,
  animate,
}: {
  d: string;
  count?: number;
  hover: string;
  filled?: boolean;
  /** true once this count has moved past its server-rendered value (and motion is allowed) */
  animate?: boolean;
}) {
  const formatted = count !== undefined ? formatCount(count) : undefined;
  return (
    <span className={`flex items-center gap-1.5 text-ink-soft transition-colors ${hover}`}>
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
        <path
          d={d}
          fill={filled ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={filled ? 0 : 1.7}
          strokeLinejoin="round"
        />
      </svg>
      {formatted !== undefined && (
        <span className="inline-flex overflow-hidden">
          {/* key on the formatted string: remount (and replay the roll) only when the visible value changes */}
          <span key={formatted} className={`text-[13px] tabular-nums ${animate ? "la-roll" : ""}`}>
            {formatted}
          </span>
        </span>
      )}
    </span>
  );
}

interface Counts {
  replies: number;
  reposts: number;
  likes: number;
  views: number;
}

export function LiveActions({
  tweetId,
  ago,
  replies,
  reposts,
  likes,
  views,
}: {
  tweetId: string;
  ago: string;
  replies: number;
  reposts: number;
  likes: number;
  views: number;
}) {
  const [counts, setCounts] = useState<Counts>({ replies, reposts, likes, views });
  // reads false during SSR; the real preference on the client. Safe across
  // hydration because nothing animates until a count has actually moved.
  const [reducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  // server-rendered values, so we never animate the initial paint — only real movement
  const [initial] = useState<Counts>({ replies, reposts, likes, views });

  useEffect(() => {
    const rand = rngFor(tweetId); // per-tweet stable jitter + stagger
    const ageMinutes = parseAgoMinutes(ago);
    const heat = likesPerSecond(likes, ageMinutes); // expected likes/sec right now

    let timer: number | undefined;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      if (!document.hidden) {
        const tickSeconds = 1.5 + rand() * 2.5;
        const eLikes = heat * tickSeconds;
        // occasional burst on tweets that are actually moving — the "going viral" jolt
        const burst = eLikes >= 0.5 && rand() < 0.05 ? 3 + rand() * 5 : 1;
        const dLikes = sampleIncrement(eLikes * burst, rand);
        const dViews = sampleIncrement(eLikes * burst * (50 + rand() * 250), rand);
        const dReposts = sampleIncrement(eLikes * burst * 0.1, rand);
        const dReplies = sampleIncrement(eLikes * burst * 0.05, rand);
        if (dLikes || dViews || dReposts || dReplies) {
          setCounts((prev) => ({
            replies: prev.replies + dReplies,
            reposts: prev.reposts + dReposts,
            likes: prev.likes + dLikes,
            views: prev.views + dViews,
          }));
        }
      }
      timer = window.setTimeout(tick, 1500 + rand() * 2500);
    };

    const schedule = (delayMs: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(tick, delayMs);
    };

    const onVisibility = () => {
      if (document.hidden) window.clearTimeout(timer);
      else schedule(800 + rand() * 1500);
    };
    document.addEventListener("visibilitychange", onVisibility);

    schedule(rand() * 3000); // stagger card start so the feed doesn't pulse in lockstep

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [tweetId, ago, likes]);

  // animate only once the *displayed* string has moved past its server-rendered value —
  // raw increments too small to change the formatted count shouldn't pulse
  const motion = !reducedMotion;
  const moved = (now: number, then: number) => motion && formatCount(now) !== formatCount(then);
  return (
    <div className="mt-2 flex max-w-md items-center justify-between" aria-hidden>
      <style>{`@keyframes la-roll-up{0%{transform:translateY(0.65em);opacity:0}60%{opacity:1}100%{transform:translateY(0);opacity:1}}.la-roll{animation:la-roll-up 300ms ease-out}`}</style>
      <ActionIcon
        d={ICONS.reply}
        count={counts.replies}
        hover="group-hover:text-teal"
        animate={moved(counts.replies, initial.replies)}
      />
      <ActionIcon
        d={ICONS.repost}
        count={counts.reposts}
        hover="group-hover:text-teal"
        animate={moved(counts.reposts, initial.reposts)}
      />
      <ActionIcon
        d={ICONS.like}
        count={counts.likes}
        hover="group-hover:text-accent"
        animate={moved(counts.likes, initial.likes)}
      />
      <ActionIcon
        d={ICONS.views}
        count={counts.views}
        hover=""
        filled
        animate={moved(counts.views, initial.views)}
      />
      <ActionIcon d={ICONS.share} hover="" />
    </div>
  );
}
