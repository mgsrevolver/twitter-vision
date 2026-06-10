import type { NotificationActor, NotificationItem, NotificationKind } from "@/lib/notifications";
import { hashString } from "@/lib/seeded-random";

/** Muted dark hues for the fake actors' initial-circle avatars. */
const AVATAR_BG = ["#3b3326", "#1f3a36", "#33263b", "#3b2630", "#26333b", "#2e3b26", "#3b2e26"];

const KIND_LABEL: Record<NotificationKind, string> = {
  "like-cluster": "liked your post",
  "repost-cluster": "reposted your post",
  follow: "followed you",
  reply: "replied to your post",
  quote: "quoted your post",
  mention: "mentioned you",
};

function KindIcon({ kind }: { kind: NotificationKind }) {
  const cls = "h-5 w-5";
  switch (kind) {
    case "like-cluster":
      return (
        <svg viewBox="0 0 24 24" fill="var(--accent)" aria-hidden="true" className={cls}>
          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
        </svg>
      );
    case "repost-cluster":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cls}>
          <path d="M17 2.5l3 3-3 3" />
          <path d="M20 5.5H8a4 4 0 00-4 4V11" />
          <path d="M7 21.5l-3-3 3-3" />
          <path d="M4 18.5h12a4 4 0 004-4V13" />
        </svg>
      );
    case "follow":
      return (
        <svg viewBox="0 0 24 24" fill="var(--teal)" aria-hidden="true" className={cls}>
          <path d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" />
        </svg>
      );
    case "reply":
      return (
        <svg viewBox="0 0 24 24" fill="var(--ink-soft)" aria-hidden="true" className={cls}>
          <path d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223z" />
        </svg>
      );
    case "quote":
      return (
        <svg viewBox="0 0 24 24" fill="var(--ink-soft)" aria-hidden="true" className={cls}>
          <path d="M10.5 7H7a3 3 0 00-3 3v6.5h6.5V10H7.75c0-1.24 1.01-2.25 2.25-2.25H10.5V7zm9.5 0h-3.5a3 3 0 00-3 3v6.5H20V10h-2.75c0-1.24 1.01-2.25 2.25-2.25H20V7z" />
        </svg>
      );
    case "mention":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cls}>
          <path d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 10-3.515 7.14" />
        </svg>
      );
  }
}

function Avatar({ actor }: { actor: NotificationActor }) {
  const bg = AVATAR_BG[hashString(actor.handle) % AVATAR_BG.length];
  const initial = (actor.name.match(/[A-Za-z0-9$]/) ?? ["?"])[0].toUpperCase();
  return (
    <span
      title={`@${actor.handle}`}
      style={{ backgroundColor: bg }}
      className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-ink ring-2 ring-card"
    >
      {initial}
    </span>
  );
}

export function NotificationCard({ item }: { item: NotificationItem }) {
  const [first, ...rest] = item.actors;
  const others = rest.length + (item.count ?? 0);
  return (
    <article className="flex gap-3 rounded-2xl border border-line bg-card p-4">
      <div className="w-6 shrink-0 pt-0.5">
        <KindIcon kind={item.kind} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="flex -space-x-2">
            {item.actors.map((a) => (
              <Avatar key={a.handle} actor={a} />
            ))}
          </div>
          <span className="ml-auto shrink-0 text-xs tabular-nums text-ink-soft">{item.ago}</span>
        </div>
        <p className="mt-2 text-sm leading-snug">
          <span className="font-semibold">{first.name}</span>
          {others > 0 && <span> and {others.toLocaleString("en-US")} others</span>}{" "}
          <span className="text-ink-soft">{KIND_LABEL[item.kind]}</span>
        </p>
        {item.text && (
          <p className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{item.text}</p>
        )}
        {item.targetPost && (
          <div className="mt-2 rounded-xl border border-line px-3 py-2 text-sm leading-snug text-ink-soft">
            {item.targetPost.text}
          </div>
        )}
      </div>
    </article>
  );
}
