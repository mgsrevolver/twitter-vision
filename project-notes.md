# their feed — session notes (2026-06-10 evening, v2.5)

## PAUSED — clean state, nothing in flight

Everything from the v2.5 batch is DONE and built. **Next milestone: deploy to Vercel** (set `NEXT_PUBLIC_SITE_URL`; everything is static data + pure computation, deploys as-is).

## Where things stand

**Corpus: 5,369 verified real tweets** — 2,870 with renderable media, 386 with quote boxes, ~2,000 harvested fresh TODAY via the nitter-RSS refresh pipeline. **1,193 indexed accounts, 1,190 with curated interaction circles** (8,388 edges, 6,862 pointing at authors in the corpus pool; 3 accounts have honest empty circles and fall back to matching accounts). A **daily 7:30 AM refresh cron** is installed as launchd agent `com.clay.their-feed-refresh` (logs: `~/Library/Logs/their-feed-refresh.log`). Production build + lint + typecheck clean.

## v2.5 features shipped since the v2 list below (same day, later session)

- **Notification count badges**: follower-tiered seeded counts (`notificationCount` in lib/notifications.ts) — 100+ for megafame, 0-5 for randos; amber pill on the header avatar + drawer row.
- **Following tab works**: `?tab=following` — only circle accounts (fallback: matching accounts), recency-flavored, no reason lines (`assembleFollowingFeed`).
- **Persona blurb line removed** (user: too reductive); slim H1 only.
- **Quote tweets render**: `CorpusTweet.quoted` + `QuoteBox` in tweet-card.tsx; captured by validate/refresh inline + `scripts/backfill-quotes.mjs` (386 found, merged via build-final-corpus).
- **Unknown-handle support**: `lib/infer-profile.ts` — claude-opus-4-8 structured-output vouching for handles outside the index; needs `ANTHROPIC_API_KEY` in .env.local (NOT yet present — falls back gracefully); inferred pages get noindex + "profile guessed by AI" notice + loading skeleton.
- **Lean-mismatch fix** (user caught Tucker/Rogan/WWE in a progressive feed): `Profile.avoid` multipliers (progressive crushes politics-right to 5%, etc.), **author-level politics inheritance** (apolitical tweets by politics-tagged accounts still carry the lean), iconic floor halved for casual scrollers. Circle members exempt (hate-follows are real engagement). Verified: 0 leaks across seeds both directions.
- **Notifications target real posts better**: newest-first standalone tweets only (no @-fragments), ~70% of reactions pile onto the 2-3 most recent posts.
- **Bug fixes**: HTML entities decoded in tweet text (`&amp;`); multiple trailing t.co links stripped; timestamp hover tooltip (stretched-link stacking issue — timestamp is now its own positioned link); notifications drawer link carries the /u/ path handle.
- **Visual QA done via Chrome extension** (connected this session): feed, drawer, tabs, badges, media grids, quote boxes, notifications all eyeballed and screenshotted.

## v2 features shipped (this session)

- **X-style cards**: avatar / bold name / verified badge / @handle · time rows with hairline dividers, X-silhouette action icons (reply, repost, like, views, share) with counts; whole card deep-links to the real tweet. Our palette retained (charcoal/amber/teal).
- **Inline media**: photos render in X-style grids (1/2/3/4 layouts), videos play inline (poster + play button → mp4), GIFs autoplay looped. Backfilled via `scripts/backfill-media.mjs` → `data/harvest/media-map.json`; `validate-candidates.mjs` now captures media inline for all future tweets.
- **Date concealment**: cards show seeded relative timestamps ("3m", "7h") that increase down-feed; the real date hides in the `title` tooltip. Engine also weights recent tweets higher (×1.7 <45d).
- **Semi-real-time refresh**: `npm run refresh` (`scripts/refresh-corpus.mjs [maxAccounts]`) — discovers newest posts per indexed account via **nitter.net RSS** (needs browsery `accept` header or you get an empty 200!), validates via the cdn syndication endpoint, auto-tags by author's account tags, appends to corpus. ~1s pacing both layers. Designed for a daily cron.
- **Interaction circles**: `accounts.json` top-120 entries have `circle: [{handle, inPool, why}]` (curated by 12 agents). Feed engine does **stratified sampling**: ~50% of slots from in-network (circle) authors, rest interest-weighted discovery. `scripts/merge-circles.mjs` merges new `data/harvest/circles-*.json`.
- **SEO routes**: `/u/[handle]` is the canonical feed URL (`/feed?u=` 308-redirects there). Title/description target "<name> twitter feed", canonical URL, OG image, ProfilePage JSON-LD, `app/sitemap.ts` (466 URLs, follower-weighted priority), `app/robots.ts`. Set `NEXT_PUBLIC_SITE_URL` in prod (see `lib/site.ts`).
- **App chrome** (`components/feed-shell.tsx`): locked translucent header — owner avatar top-left w/ amber notification dot (opens slide-in drawer), For you/Following tabs, refresh button. Drawer: Notifications, the real @handle ↗, share (copy), refresh algorithm, start over. Touch **pull-to-refresh** reseeds the feed.
- **Avatars**: feed owner's avatar resolved from corpus, falling back to live `unavatar.io/twitter/<handle>`, then grey silhouette (`components/avatar.tsx`). Survey personas get the silhouette.
- **Notifications simulation** (`/notifications?u=X&s=Y`): deterministic generator (`lib/notifications.ts`) scaled by follower tier; politics accounts get ~40% hostility from the opposing side, celebrities get thirst/stans, finance gets crypto-spam. 186 hand-written templates + 120 fictional replier identities in `data/notification-templates.json`. Replies/quotes reference the person's REAL corpus tweets. Linked from the drawer.

## Pipeline reference (all idempotent)

| Script | What it does |
|---|---|
| `scripts/refresh-corpus.mjs [n]` | Daily refresh: nitter RSS discovery → cdn validation → auto-tag by author → append to corpus |
| `scripts/mine-wikipedia.mjs [maxPages]` | Tweet IDs from Wikipedia `{{cite tweet}}` templates |
| `scripts/validate-candidates.mjs` | Verifies `*-candidates.json` IDs against cdn syndication; captures media; incremental |
| `scripts/backfill-media.mjs` | Re-fetch media for already-validated tweets → `media-map.json` |
| `scripts/prepare-tagging.mjs [prefix]` | Batch untagged tweets for agent fleets |
| `scripts/build-final-corpus.mjs` | Verdicts + validated + media-map → `corpus.json` |
| `scripts/merge-accounts.mjs` / `merge-circles.mjs` | Curated account lists / interaction circles → `accounts.json` |

## Backlog / ideas

- **Visual QA still not done** — Chrome extension never connected this session either. Eyeball: dark X-look cards, media grids, drawer, pull-to-refresh (mobile), notifications page.
- Wire the daily refresh to an actual cron (launchd or GitHub Actions; local is fine — Vercel functions time out).
- Circles only cover top-120-by-followers; JohnCleese/dril etc. have none. Extend to all 466 (same workflow prompt, `data/harvest/circle-assignments.json` regenerate with next slice).
- Circle harvesting: refresh-corpus only keeps indexed authors; circle members outside the index (e.g. SonaMovsesian) get skipped — could auto-index them with inherited tags.
- "Following" tab is decorative. Could render a circle-only feed.
- politics-right still thinner than left (193 vs 325).
- `/api/persona` untested with live ANTHROPIC_API_KEY.
- `data/harvest/` ~12MB intermediates; deletable once stable (keep `checked-ids.json`, `refresh-seen-ids.json`, `media-map.json`).

## Product promises (unchanged)

Every post is real and links to the original on X. The feed is a deterministic simulation per URL (the share mechanic); no X API, no login, no tracking. Notifications are clearly labeled fictional.
