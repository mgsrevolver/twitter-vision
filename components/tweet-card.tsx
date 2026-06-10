import Image from "next/image";
import type { FeedItem } from "@/lib/types";
import { cleanTweetText, formatCount, formatTweetDate } from "@/lib/format";

export function TweetCard({ item }: { item: FeedItem }) {
  const { tweet, reason } = item;
  const text = cleanTweetText(tweet.text);
  return (
    <a
      href={tweet.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-2xl border border-line bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <p className="mb-2 text-xs text-ink-soft">{reason}</p>
      <div className="flex gap-3">
        {tweet.avatar ? (
          <Image
            src={tweet.avatar}
            alt=""
            width={44}
            height={44}
            unoptimized
            className="h-11 w-11 shrink-0 rounded-full border border-line object-cover"
          />
        ) : (
          <div className="h-11 w-11 shrink-0 rounded-full bg-accent-soft" />
        )}
        <div className="min-w-0">
          <p className="truncate text-sm">
            <span className="font-semibold">{tweet.name}</span>{" "}
            <span className="text-ink-soft">
              @{tweet.handle} · {formatTweetDate(tweet.createdAt)}
            </span>
          </p>
          {text && <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{text}</p>}
          {tweet.hasMedia && (
            <p className="mt-2 inline-block rounded-lg bg-accent-soft px-2 py-1 text-xs text-ink-soft">
              📷 has media — view on X
            </p>
          )}
          <p className="mt-2 flex gap-5 text-xs text-ink-soft">
            <span>💬 {formatCount(tweet.replies)}</span>
            <span>❤️ {formatCount(tweet.likes)}</span>
            <span className="text-teal">view on X ↗</span>
          </p>
        </div>
      </div>
    </a>
  );
}
