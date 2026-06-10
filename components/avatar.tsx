"use client";

import { useState } from "react";

const SILHOUETTE = (
  <svg viewBox="0 0 24 24" aria-hidden className="h-[62%] w-[62%] text-ink-soft/70">
    <path
      fill="currentColor"
      d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.1 0-7.5 2.6-7.5 6v1h15v-1c0-3.4-3.4-6-7.5-6Z"
    />
  </svg>
);

/**
 * Avatar with a live fallback chain: stored corpus URL → unavatar (current
 * profile image, no key needed) → grey silhouette, X-default style.
 */
export function Avatar({
  src,
  handle,
  alt = "",
  size = 40,
  className = "",
}: {
  src?: string | null;
  handle?: string;
  alt?: string;
  size?: number;
  className?: string;
}) {
  const sources = [
    ...(src ? [src] : []),
    ...(handle ? [`https://unavatar.io/twitter/${handle}?fallback=false`] : []),
  ];
  const [step, setStep] = useState(0);
  const url = sources[step];

  if (!url) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-line ${className}`}
        style={{ width: size, height: size }}
        aria-hidden
      >
        {SILHOUETTE}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote avatars stay unoptimized; onError drives the fallback chain
    <img
      src={url}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setStep((s) => s + 1)}
      className={`shrink-0 rounded-full bg-line object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
