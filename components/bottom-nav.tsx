"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { formatNotificationCount } from "@/lib/notifications";

function HomeIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2.4 2 10.6h2.5V20A1.5 1.5 0 0 0 6 21.5h3.8v-6.3h4.4v6.3H18a1.5 1.5 0 0 0 1.5-1.5v-9.4H22L12 2.4Z"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1v-9.5Z"
      />
    </svg>
  );
}

function BellIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      <path
        fill="currentColor"
        d="M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22Zm7-5v-1l-1.5-1.8V9.5A5.5 5.5 0 0 0 13 4.1V3a1 1 0 1 0-2 0v1.1a5.5 5.5 0 0 0-4.5 5.4v4.7L5 16v1h14Z"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        d="M12 3.2a5.5 5.5 0 0 0-5.5 5.5v5.2L5 16v1h14v-1l-1.5-2.1V8.7A5.5 5.5 0 0 0 12 3.2Z"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        d="M10.3 20a2 2 0 0 0 3.4 0"
      />
    </svg>
  );
}

function MailIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      <path
        fill="currentColor"
        d="M3.5 4.5h17A1.5 1.5 0 0 1 22 6v.4l-10 6.2L2 6.4V6a1.5 1.5 0 0 1 1.5-1.5ZM2 8.7V18a1.5 1.5 0 0 0 1.5 1.5h17A1.5 1.5 0 0 0 22 18V8.7l-10 6.1L2 8.7Z"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m4.5 7.5 7.5 5 7.5-5"
      />
    </svg>
  );
}

const itemClass = (isActive: boolean) =>
  `relative flex h-[52px] min-w-[72px] items-center justify-center transition-colors ${
    isActive ? "text-ink" : "text-ink-soft hover:text-ink"
  }`;

/**
 * X-style fixed bottom navigation: Home, Notifications (live unread badge),
 * and an inert Messages icon. The badge listens for "theirfeed:live"
 * CustomEvents and pops when new notifications arrive.
 */
export function BottomNav({
  active,
  handle,
  homeHref,
  initialBadge,
}: {
  /** which icon is highlighted */
  active: "home" | "notifications" | "messages";
  /** account handle, used to carry u=<handle> into the notifications href on /u/[handle] pages */
  handle?: string;
  /** explicit Home destination (the notifications page passes its back-to-feed href); if omitted, Home links to current pathname+params */
  homeHref?: string;
  /** initial unread notification count, raw number (0 = no bubble) */
  initialBadge: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [badge, setBadge] = useState(initialBadge);
  const [pop, setPop] = useState(0);
  const [hint, setHint] = useState(0);
  const hintTimer = useRef<number | null>(null);

  useEffect(() => {
    function onLive(e: Event) {
      const detail = (e as CustomEvent<{ kind?: string; amount?: number }>).detail;
      if (!detail || detail.kind !== "notification" || !detail.amount) return;
      if (active === "notifications") return; // you're looking at them
      setBadge((n) => n + detail.amount!);
      setPop((k) => k + 1);
    }
    window.addEventListener("theirfeed:live", onLive);
    return () => window.removeEventListener("theirfeed:live", onLive);
  }, [active]);

  useEffect(() => {
    return () => {
      if (hintTimer.current !== null) window.clearTimeout(hintTimer.current);
    };
  }, []);

  function onMessagesTap() {
    setHint((k) => k + 1);
    if (hintTimer.current !== null) window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHint(0), 1200);
  }

  const homeQuery = searchParams.toString();
  const home = homeHref ?? `${pathname}${homeQuery ? `?${homeQuery}` : ""}`;

  // on /u/[handle] the handle is a path param — carry it into the query
  const notifParams = new URLSearchParams(searchParams);
  notifParams.delete("tab");
  if (handle && !notifParams.get("u")) notifParams.set("u", handle);
  const notificationsHref = `/notifications?${notifParams}`;

  const showBadge = active !== "notifications" && badge > 0;

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-30 border-t border-line bg-paper/80 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <style>{`
        @keyframes theirfeed-bnav-pop {
          0% { transform: scale(1); }
          40% { transform: scale(1.35); }
          100% { transform: scale(1); }
        }
        @keyframes theirfeed-bnav-hint {
          0% { opacity: 0; transform: translate(-50%, 3px); }
          15% { opacity: 1; transform: translate(-50%, 0); }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
      <div className="mx-auto flex max-w-xl items-stretch justify-around">
        <Link href={home} aria-label="Home" className={itemClass(active === "home")}>
          <HomeIcon filled={active === "home"} />
        </Link>
        <Link
          href={notificationsHref}
          aria-label="Notifications"
          className={itemClass(active === "notifications")}
        >
          <span className="relative">
            <BellIcon filled={active === "notifications"} />
            {showBadge && (
              <span
                key={pop}
                className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-accent-ink ring-2 ring-paper"
                style={pop > 0 ? { animation: "theirfeed-bnav-pop 300ms ease" } : undefined}
              >
                {formatNotificationCount(badge)}
              </span>
            )}
          </span>
        </Link>
        <button
          type="button"
          onClick={onMessagesTap}
          aria-label="Messages (coming soon)"
          className={itemClass(active === "messages")}
        >
          <MailIcon filled={active === "messages"} />
          {hint > 0 && (
            <span
              key={hint}
              className="pointer-events-none absolute -top-1.5 left-1/2 rounded-full bg-card px-2 py-0.5 text-[10px] font-medium text-ink-soft shadow-sm ring-1 ring-line"
              style={{ animation: "theirfeed-bnav-hint 1.2s ease forwards" }}
              aria-hidden
            >
              soon
            </span>
          )}
        </button>
      </div>
    </nav>
  );
}
