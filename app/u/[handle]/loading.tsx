export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-xl animate-pulse border-x border-line px-4 pt-14 min-h-screen">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex gap-3 border-b border-line py-4">
          <div className="h-10 w-10 shrink-0 rounded-full bg-card" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/2 rounded bg-card" />
            <div className="h-3.5 w-11/12 rounded bg-card" />
            <div className="h-3.5 w-3/4 rounded bg-card" />
          </div>
        </div>
      ))}
    </div>
  );
}
