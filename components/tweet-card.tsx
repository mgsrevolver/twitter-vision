import type { FeedItem, QuotedTweet } from "@/lib/types";
import { cleanTweetText, formatCount, formatTweetDate } from "@/lib/format";
import { Avatar } from "@/components/avatar";
import { TweetMedia } from "@/components/tweet-media";

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
}: {
  d: string;
  count?: number;
  hover: string;
  filled?: boolean;
}) {
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
      {count !== undefined && <span className="text-[13px] tabular-nums">{formatCount(count)}</span>}
    </span>
  );
}

function VerifiedBadge() {
  return (
    <svg viewBox="0 0 22 22" className="ml-0.5 inline h-[17px] w-[17px] align-text-bottom text-teal" aria-label="verified">
      <path
        fill="currentColor"
        d="M20.4 11c0-1.1-.6-2.1-1.5-2.6.2-1-.1-2.2-.9-2.9-.8-.8-1.9-1.1-2.9-.9C14.6 3.6 13.6 3 12.5 3h-1c-1.1 0-2.1.6-2.6 1.5-1-.2-2.2.1-2.9.9-.8.8-1.1 1.9-.9 2.9-.9.6-1.5 1.6-1.5 2.7s.6 2.1 1.5 2.6c-.2 1 .1 2.2.9 2.9.8.8 1.9 1.1 2.9.9.6.9 1.6 1.5 2.7 1.5h.9c1.1 0 2.1-.6 2.6-1.5 1 .2 2.2-.1 2.9-.9.8-.8 1.1-1.9.9-2.9 1-.5 1.5-1.5 1.5-2.6Zm-10.1 3.7-3-3 1.4-1.4 1.6 1.6 4-4L15.7 9l-5.4 5.7Z"
      />
    </svg>
  );
}

/** The inner quote box — X's nested-tweet look, clickable to the quoted post. */
function QuoteBox({ quoted }: { quoted: QuotedTweet }) {
  const text = cleanTweetText(quoted.text);
  return (
    <a
      href={quoted.url}
      target="_blank"
      rel="noopener noreferrer"
      className="relative mt-3 block overflow-hidden rounded-xl border border-line transition-colors hover:bg-paper/60"
    >
      <div className="px-3 pt-2.5 pb-1">
        <p className="flex items-center gap-1.5 truncate text-[14px] leading-5">
          <Avatar src={quoted.avatar} handle={quoted.handle} size={18} />
          <span className="font-bold">{quoted.name}</span>
          {quoted.verifiedAuthor && <VerifiedBadge />}
          <span className="text-ink-soft">@{quoted.handle}</span>
        </p>
        {text && <p className="mt-1 whitespace-pre-wrap break-words text-[14px] leading-snug">{text}</p>}
      </div>
      {quoted.media?.length ? (
        <div className="px-3 pb-3">
          <TweetMedia media={quoted.media} compact />
        </div>
      ) : (
        <div className="pb-2" />
      )}
    </a>
  );
}

export function TweetCard({ item }: { item: FeedItem }) {
  const { tweet, reason, ago, stats } = item;
  const text = cleanTweetText(tweet.text);
  return (
    <article className="group relative border-b border-line px-4 py-3 transition-colors hover:bg-card/60">
      {/* stretched link: tap anywhere opens the real tweet on X */}
      <a
        href={tweet.url}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0"
        aria-label={`View @${tweet.handle}'s post on X`}
      />
      {reason && <p className="mb-1.5 pl-[52px] text-xs text-ink-soft">{reason}</p>}
      <div className="flex gap-3">
        <Avatar src={tweet.avatar} handle={tweet.handle} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] leading-5">
            <span className="font-bold">{tweet.name}</span>
            {tweet.verifiedAuthor && <VerifiedBadge />}{" "}
            <span className="text-ink-soft">
              @{tweet.handle} ·{" "}
              {/* relative => paints above the stretched link, so the tooltip can fire */}
              <a
                href={tweet.url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative cursor-help hover:underline"
                title={`actually posted ${formatTweetDate(tweet.createdAt)} — simulated feeds run on dream time`}
              >
                <time>{ago}</time>
              </a>
            </span>
          </p>
          {text && (
            <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{text}</p>
          )}
          {tweet.media?.length ? (
            <div className="relative">
              <TweetMedia media={tweet.media} />
            </div>
          ) : null}
          {tweet.quoted && <QuoteBox quoted={tweet.quoted} />}
          <div className="mt-2 flex max-w-md items-center justify-between" aria-hidden>
            <ActionIcon d={ICONS.reply} count={tweet.replies} hover="group-hover:text-teal" />
            <ActionIcon d={ICONS.repost} count={stats.reposts} hover="group-hover:text-teal" />
            <ActionIcon d={ICONS.like} count={tweet.likes} hover="group-hover:text-accent" />
            <ActionIcon d={ICONS.views} count={stats.views} hover="" filled />
            <ActionIcon d={ICONS.share} hover="" />
          </div>
        </div>
      </div>
    </article>
  );
}
