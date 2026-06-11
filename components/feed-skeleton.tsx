/**
 * Instant loading state for the feed routes — an X-shaped skeleton so the
 * person knows a timeline is coming before the server finishes assembling it.
 */
export function FeedSkeleton() {
  return (
    <div className="animate-pulse">
      {/* header ghost */}
      <div className="sticky top-0 z-30 border-b border-line bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex h-[52px] max-w-xl items-center justify-between px-4">
          <div className="h-8 w-8 rounded-full bg-card" />
          <div className="flex gap-6">
            <div className="h-4 w-16 rounded bg-card" />
            <div className="h-4 w-16 rounded bg-card" />
          </div>
          <div className="h-8 w-8 rounded-full bg-card" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-xl border-x border-line min-h-screen">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <span className="h-2 w-2 animate-ping rounded-full bg-accent" />
          <p className="text-[13px] text-ink-soft">simulating this timeline…</p>
        </div>

        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex gap-3 border-b border-line px-4 py-3.5">
            <div className="h-10 w-10 shrink-0 rounded-full bg-card" />
            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-28 rounded bg-card" />
                <div className="h-3 w-20 rounded bg-card/70" />
              </div>
              <div className="h-3.5 w-full rounded bg-card" />
              <div className="h-3.5 w-4/5 rounded bg-card" />
              {i % 3 === 1 && <div className="mt-2 h-44 w-full rounded-2xl bg-card" />}
              <div className="mt-2 flex justify-between pr-8">
                {Array.from({ length: 4 }, (_, j) => (
                  <div key={j} className="h-3 w-8 rounded bg-card/60" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
