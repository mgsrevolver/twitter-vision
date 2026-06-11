import type { FeedItem, QuotedTweet } from "@/lib/types";
import { cleanTweetText, formatTweetDate } from "@/lib/format";
import { Avatar } from "@/components/avatar";
import { TweetMedia } from "@/components/tweet-media";
import { LiveActions } from "@/components/live-actions";

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
          <LiveActions
            tweetId={tweet.id}
            ago={ago}
            replies={tweet.replies}
            reposts={stats.reposts}
            likes={tweet.likes}
            views={stats.views}
          />
        </div>
      </div>
    </article>
  );
}
