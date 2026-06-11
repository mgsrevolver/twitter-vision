"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Avatar } from "@/components/avatar";

/**
 * The real-time "celebrity phone" director. Renders almost nothing itself —
 * it dispatches `theirfeed:live` badge pulses, occasionally drops an X-style
 * notification banner under the header, and surfaces the signature
 * "Show N posts" pill. Pace scales with audience size.
 */

interface Pace {
  /** ms until the next notification pulse */
  pulseDelay: () => number;
  /** badge increment per pulse */
  amount: () => number;
  /** true = this pulse fizzles (small accounts go quiet for minutes) */
  skip: () => boolean;
  /** show a banner every Nth pulse */
  toastEvery: () => number;
  pillInitial: () => number;
  pillGrowDelay: () => number;
  pillGrowBy: () => number;
}

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const randInt = (lo: number, hi: number) => Math.floor(rand(lo, hi + 1));

function paceFor(followers: number): Pace {
  if (followers >= 5_000_000) {
    return {
      pulseDelay: () => rand(2_000, 5_000),
      // mostly 1-4, with the occasional viral spurt
      amount: () => (Math.random() < 0.12 ? randInt(5, 14) : randInt(1, 4)),
      skip: () => false,
      toastEvery: () => randInt(4, 8),
      pillInitial: () => randInt(5, 8),
      pillGrowDelay: () => rand(7_000, 14_000),
      pillGrowBy: () => randInt(1, 3),
    };
  }
  if (followers >= 500_000) {
    return {
      pulseDelay: () => rand(4_000, 10_000),
      amount: () => randInt(1, 2),
      skip: () => false,
      toastEvery: () => randInt(5, 10),
      pillInitial: () => randInt(4, 6),
      pillGrowDelay: () => rand(10_000, 18_000),
      pillGrowBy: () => randInt(1, 2),
    };
  }
  if (followers >= 50_000) {
    return {
      pulseDelay: () => rand(15_000, 40_000),
      amount: () => 1,
      skip: () => Math.random() < 0.15,
      toastEvery: () => randInt(3, 6),
      pillInitial: () => randInt(3, 4),
      pillGrowDelay: () => rand(15_000, 25_000),
      pillGrowBy: () => 1,
    };
  }
  return {
    pulseDelay: () => rand(45_000, 90_000),
    amount: () => 1,
    // sometimes nothing happens for minutes — being a nobody is peaceful
    skip: () => Math.random() < 0.4,
    toastEvery: () => randInt(2, 4),
    pillInitial: () => randInt(2, 3),
    pillGrowDelay: () => rand(25_000, 40_000),
    pillGrowBy: () => 1,
  };
}

function buildToastLine(name: string, followers: number): string {
  const roll = Math.random();
  if (roll < 0.38) {
    const others = Math.floor(Math.min(followers, 50_000_000) * 0.0009 * Math.random() * Math.random());
    return others >= 2
      ? `Liked by ${name} and ${others.toLocaleString("en-US")} others`
      : `${name} liked your post`;
  }
  if (roll < 0.58) return `${name} reposted your post`;
  if (roll < 0.74) return `${name} started following you`;
  if (roll < 0.9) return `${name} replied to your post`;
  return `${name} mentioned you in a post`;
}

export function LivePulse({
  followers,
  seed,
  avatars,
  names,
  handle,
}: {
  followers: number;
  seed: string;
  /** avatars of accounts in the current feed — pill + banner art */
  avatars: (string | null)[];
  /** display names matching `avatars` by index */
  names: string[];
  handle?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // false on the server and during hydration, true right after — keeps all
  // randomness client-side without an effect-driven setState
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [reduceMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [toast, setToast] = useState<{ id: number; line: string; avatar: string | null } | null>(null);
  const [toastLeaving, setToastLeaving] = useState(false);
  const [pillCount, setPillCount] = useState<number | null>(null);
  const [pillCycle, setPillCycle] = useState(0);

  // refs so timer closures always see current visibility without re-running effects
  const toastActive = useRef(false);
  const pillVisible = useRef(false);
  useEffect(() => {
    pillVisible.current = pillCount !== null;
  }, [pillCount]);

  // ---- notification pulse + banner director ----
  useEffect(() => {
    if (!mounted) return;
    const pace = paceFor(followers);
    const ids = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        ids.delete(id);
        fn();
      }, ms);
      ids.add(id);
    };

    let sinceToast = 0;
    let nextToastAt = pace.toastEvery();

    const showToast = () => {
      // never two at once; if the pill is up, let it breathe first
      if (toastActive.current) return;
      const wait = pillVisible.current ? 2_500 : 0;
      later(() => {
        if (toastActive.current || document.hidden) return;
        toastActive.current = true;
        const idx = names.length ? Math.floor(Math.random() * names.length) : -1;
        setToast({
          id: Date.now(),
          line: buildToastLine(idx >= 0 ? names[idx] : "Someone", followers),
          avatar: idx >= 0 ? (avatars[idx] ?? null) : null,
        });
        setToastLeaving(false);
        later(() => setToastLeaving(true), 3_500);
        later(() => {
          setToast(null);
          setToastLeaving(false);
          toastActive.current = false;
        }, 3_900);
      }, wait);
    };

    const pulse = () => {
      if (!document.hidden && !pace.skip()) {
        window.dispatchEvent(
          new CustomEvent("theirfeed:live", {
            detail: { kind: "notification", amount: pace.amount() },
          }),
        );
        sinceToast += 1;
        if (sinceToast >= nextToastAt) {
          sinceToast = 0;
          nextToastAt = pace.toastEvery();
          showToast();
        }
      }
      later(pulse, pace.pulseDelay());
    };

    later(pulse, pace.pulseDelay());
    return () => ids.forEach((id) => clearTimeout(id));
  }, [mounted, followers, seed, names, avatars]);

  // ---- "Show new posts" pill ----
  useEffect(() => {
    if (!mounted) return;
    const pace = paceFor(followers);
    const ids = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        ids.delete(id);
        fn();
      }, ms);
      ids.add(id);
    };

    const grow = () => {
      if (!document.hidden) setPillCount((c) => (c === null ? c : c + pace.pillGrowBy()));
      later(grow, pace.pillGrowDelay());
    };

    later(
      () => {
        if (document.hidden) {
          // arrive to it already waiting when the tab regains focus instead
          later(() => setPillCount((c) => c ?? pace.pillInitial()), 1_000);
        } else {
          setPillCount(pace.pillInitial());
        }
        later(grow, pace.pillGrowDelay());
      },
      pillCycle === 0 ? rand(12_000, 25_000) : rand(35_000, 70_000),
    );

    return () => ids.forEach((id) => clearTimeout(id));
  }, [mounted, followers, seed, pillCycle]);

  function refreshFeed() {
    setPillCount(null);
    setPillCycle((c) => c + 1);
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    const params = new URLSearchParams(searchParams);
    params.set("s", Math.random().toString(36).slice(2, 8));
    router.push(`${pathname}?${params}`);
  }

  function openNotifications() {
    const params = new URLSearchParams(searchParams);
    params.delete("tab");
    if (handle && !params.get("u")) params.set("u", handle);
    const q = params.toString();
    router.push(`/notifications${q ? `?${q}` : ""}`);
  }

  if (!mounted) return null;

  return (
    <>
      <style>{`
        @keyframes lp-drop-in { from { opacity: 0; transform: translateY(-14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lp-rise-out { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-14px); } }
      `}</style>

      {pillCount !== null && (
        <div className="fixed left-1/2 top-[64px] z-40 -translate-x-1/2">
          <button
            type="button"
            onClick={refreshFeed}
            className="flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-accent-ink shadow-lg"
            style={reduceMotion ? undefined : { animation: "fadeSlideIn 0.3s ease-out" }}
          >
            {avatars.length > 0 && (
              <span className="flex items-center">
                {avatars.slice(0, 3).map((src, i) => (
                  <Avatar
                    key={i}
                    src={src}
                    size={20}
                    alt=""
                    className={`ring-2 ring-accent ${i > 0 ? "-ml-1.5" : ""}`}
                  />
                ))}
              </span>
            )}
            Show {pillCount} posts
          </button>
        </div>
      )}

      {toast && (
        <div
          className="fixed left-1/2 z-40 w-[calc(100%-24px)] max-w-sm -translate-x-1/2"
          style={{ top: pillCount !== null ? 112 : 60 }}
        >
          <button
            type="button"
            onClick={openNotifications}
            className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-left shadow-lg"
            style={
              reduceMotion
                ? undefined
                : {
                    animation: toastLeaving
                      ? "lp-rise-out 0.25s ease-in forwards"
                      : "lp-drop-in 0.3s ease-out",
                  }
            }
          >
            <Avatar src={toast.avatar} size={28} alt="" />
            <span className="min-w-0 truncate text-sm">{toast.line}</span>
          </button>
        </div>
      )}
    </>
  );
}
