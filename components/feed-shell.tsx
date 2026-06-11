"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { BottomNav } from "@/components/bottom-nav";

const PULL_THRESHOLD = 70;

function MenuRow({ children, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      className="flex w-full items-center gap-3 px-5 py-3.5 text-left text-[15px] transition-colors hover:bg-paper"
    >
      {children}
    </button>
  );
}

const rowLink =
  "flex w-full items-center gap-3 px-5 py-3.5 text-left text-[15px] transition-colors hover:bg-paper";

/**
 * The X-app chrome: locked translucent header (avatar opens drawer,
 * For-you tabs, refresh), a slide-in drawer with the essentials, a fixed
 * bottom nav (home / notifications / messages) with the unread badge, and
 * touch pull-to-refresh that reseeds the algorithm.
 */
export function FeedShell({
  displayName,
  handle,
  avatarSrc,
  unread = 0,
  children,
}: {
  displayName: string;
  handle?: string;
  avatarSrc?: string | null;
  /** simulated unread notification count; 0 = no badge on the bottom nav */
  unread?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function newSeed() {
    const params = new URLSearchParams(searchParams);
    params.set("s", Math.random().toString(36).slice(2, 8));
    setRefreshing(true);
    setOpen(false);
    router.push(`${pathname}?${params}`);
    setTimeout(() => setRefreshing(false), 600);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  // Following is the default: the circle graph (who they actually engage
  // with) is our strongest signal, so it makes the best first impression
  const activeTab = searchParams.get("tab") === "foryou" ? "foryou" : "following";
  const tabHref = (tab: "foryou" | "following") => {
    const params = new URLSearchParams(searchParams);
    if (tab === "foryou") params.set("tab", "foryou");
    else params.delete("tab");
    const q = params.toString();
    return `${pathname}${q ? `?${q}` : ""}`;
  };

  return (
    <div
      onTouchStart={(e) => {
        if (window.scrollY === 0) startY.current = e.touches[0].clientY;
      }}
      onTouchMove={(e) => {
        if (startY.current === null) return;
        const delta = e.touches[0].clientY - startY.current;
        if (delta > 0 && window.scrollY === 0) setPull(Math.min(delta * 0.5, 110));
      }}
      onTouchEnd={() => {
        if (pull >= PULL_THRESHOLD) newSeed();
        startY.current = null;
        setPull(0);
      }}
    >
      {/* pull-to-refresh indicator */}
      <div
        className="pointer-events-none fixed left-1/2 top-0 z-40 -translate-x-1/2 transition-transform"
        style={{ transform: `translate(-50%, ${pull > 0 || refreshing ? Math.max(pull, 64) - 44 : -44}px)` }}
        aria-hidden
      >
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card shadow-lg ${
            refreshing ? "animate-spin" : ""
          }`}
          style={{ transform: refreshing ? undefined : `rotate(${pull * 3}deg)` }}
        >
          <svg viewBox="0 0 24 24" className={`h-5 w-5 ${pull >= PULL_THRESHOLD || refreshing ? "text-accent" : "text-ink-soft"}`}>
            <path
              fill="currentColor"
              d="M12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-1.8-4.3L13 11h7V4l-2.4 2.4A8 8 0 0 0 12 4Z"
            />
          </svg>
        </span>
      </div>

      {/* locked header */}
      <header className="sticky top-0 z-30 border-b border-line bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex h-[52px] max-w-xl items-center justify-between px-4">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative shrink-0"
            aria-label="Open menu"
          >
            <Avatar src={avatarSrc} handle={handle} size={32} alt={displayName} />
          </button>
          <nav className="absolute left-1/2 flex -translate-x-1/2 gap-6 text-[15px]" aria-label="Timeline tabs">
            {(
              [
                ["foryou", "For you"],
                ["following", "Following"],
              ] as const
            ).map(([tab, label]) => (
              <Link
                key={tab}
                href={tabHref(tab)}
                className={`relative ${activeTab === tab ? "font-bold" : "text-ink-soft hover:text-ink"}`}
              >
                {label}
                {activeTab === tab && (
                  <span className="absolute -bottom-[15px] left-1/2 h-1 w-14 -translate-x-1/2 rounded-full bg-accent" />
                )}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={newSeed}
            aria-label="Refresh the algorithm"
            title="refresh the algorithm — same person, new scroll session"
            className="shrink-0 rounded-full p-2 text-ink-soft transition-colors hover:bg-card hover:text-accent"
          >
            <svg viewBox="0 0 24 24" className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}>
              <path
                fill="currentColor"
                d="M12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-1.8-4.3L13 11h7V4l-2.4 2.4A8 8 0 0 0 12 4Z"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* drawer */}
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/60"
        />
      )}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-line bg-card transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="border-b border-line px-5 py-5">
          <Avatar src={avatarSrc} handle={handle} size={48} alt={displayName} />
          <p className="mt-3 truncate font-bold">{displayName}</p>
          {handle && <p className="truncate text-sm text-ink-soft">@{handle}</p>}
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {handle && (
            <a
              href={`https://x.com/${handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className={rowLink}
              onClick={() => setOpen(false)}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                <path
                  fill="currentColor"
                  d="M18.2 2.5h3.3l-7.3 8.3 8.6 11.3h-6.7l-5.3-6.9-6 6.9H1.5l7.8-8.9L1 2.5h6.9l4.8 6.3 5.5-6.3Zm-1.2 17.6h1.8L7 4.4H5l12 15.7Z"
                />
              </svg>
              the real @{handle} ↗
            </a>
          )}
          <MenuRow onClick={copyLink}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path
                fill="currentColor"
                d="M10 14a4 4 0 0 0 6 .4l3-3a4 4 0 1 0-5.7-5.6L11.6 7.5l1.4 1.4 1.7-1.7a2 2 0 1 1 2.9 2.8l-3 3a2 2 0 0 1-3-.2L10 14Zm4-4a4 4 0 0 0-6-.4l-3 3a4 4 0 1 0 5.7 5.6l1.7-1.7-1.4-1.4-1.7 1.7a2 2 0 1 1-2.9-2.8l3-3a2 2 0 0 1 3 .2L14 10Z"
              />
            </svg>
            {copied ? "copied ✓" : "Share this feed"}
          </MenuRow>
          <MenuRow onClick={newSeed}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path
                fill="currentColor"
                d="M12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-1.8-4.3L13 11h7V4l-2.4 2.4A8 8 0 0 0 12 4Z"
              />
            </svg>
            Refresh the algorithm
          </MenuRow>
          <Link href="/" className={rowLink} onClick={() => setOpen(false)}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path fill="currentColor" d="M12 3 2 12h3v8h6v-5h2v5h6v-8h3L12 3Z" />
            </svg>
            Start over
          </Link>
        </nav>
        <p className="border-t border-line px-5 py-4 text-xs leading-relaxed text-ink-soft">
          A simulation, not surveillance. Every post is real and links to X; the feed itself is imagined.
        </p>
      </aside>

      <div className="pb-[64px]">{children}</div>

      <BottomNav active="home" handle={handle} initialBadge={unread ?? 0} />
    </div>
  );
}
