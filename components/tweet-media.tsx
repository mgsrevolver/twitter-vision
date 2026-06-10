"use client";

import { useState } from "react";
import type { MediaItem } from "@/lib/types";

function clampRatio(w: number | null, h: number | null): number {
  if (!w || !h) return 16 / 9;
  return Math.min(Math.max(w / h, 0.75), 1.91);
}

function Photo({ item }: { item: Extract<MediaItem, { type: "photo" }> }) {
  // eslint-disable-next-line @next/next/no-img-element -- pbs.twimg.com images render unoptimized by design
  return <img src={item.url} alt="" loading="lazy" className="h-full w-full object-cover" />;
}

function Video({ item }: { item: Extract<MediaItem, { type: "video" | "gif" }> }) {
  const [playing, setPlaying] = useState(false);
  const isGif = item.type === "gif";

  if (isGif && item.mp4) {
    return (
      <span className="relative block h-full w-full">
        <video src={item.mp4} autoPlay loop muted playsInline className="h-full w-full object-cover" />
        <span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">
          GIF
        </span>
      </span>
    );
  }
  if (playing && item.mp4) {
    return (
      <video
        src={item.mp4}
        poster={item.poster}
        autoPlay
        controls
        playsInline
        className="h-full w-full bg-black object-contain"
      />
    );
  }
  return (
    <span className="relative block h-full w-full">
      {/* eslint-disable-next-line @next/next/no-img-element -- video poster from pbs.twimg.com */}
      <img src={item.poster} alt="" loading="lazy" className="h-full w-full object-cover" />
      {item.mp4 && (
        <button
          type="button"
          aria-label="Play video"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPlaying(true);
          }}
          className="absolute inset-0 z-10 flex items-center justify-center"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 ring-1 ring-white/30 transition-transform hover:scale-105">
            <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 text-white" aria-hidden>
              <path fill="currentColor" d="M8 5.5v13l11-6.5-11-6.5Z" />
            </svg>
          </span>
        </button>
      )}
    </span>
  );
}

function Cell({ item }: { item: MediaItem }) {
  return item.type === "photo" ? <Photo item={item} /> : <Video item={item} />;
}

/** X-style media grid: 1 = natural ratio, 2 = split, 3 = tall lead, 4 = quad. */
export function TweetMedia({ media, compact = false }: { media: MediaItem[]; compact?: boolean }) {
  if (media.length === 0) return null;
  const frame = compact
    ? "mt-2 overflow-hidden rounded-lg border border-line"
    : "mt-3 overflow-hidden rounded-2xl border border-line";

  if (media.length === 1) {
    const m = media[0];
    return (
      <div className={frame} style={{ aspectRatio: clampRatio(m.w, m.h) }}>
        <Cell item={m} />
      </div>
    );
  }
  if (media.length === 2) {
    return (
      <div className={`${frame} grid aspect-[16/9] grid-cols-2 gap-0.5`}>
        <Cell item={media[0]} />
        <Cell item={media[1]} />
      </div>
    );
  }
  if (media.length === 3) {
    return (
      <div className={`${frame} grid aspect-[16/9] grid-cols-2 grid-rows-2 gap-0.5`}>
        <div className="row-span-2">
          <Cell item={media[0]} />
        </div>
        <Cell item={media[1]} />
        <Cell item={media[2]} />
      </div>
    );
  }
  return (
    <div className={`${frame} grid aspect-[16/9] grid-cols-2 grid-rows-2 gap-0.5`}>
      {media.slice(0, 4).map((m, i) => (
        <Cell key={i} item={m} />
      ))}
    </div>
  );
}
