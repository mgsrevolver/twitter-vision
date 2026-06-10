# their feed.

Walk a mile in someone else's timeline. Pick any popular X/Twitter account — or sketch a person with a three-question survey — and get a **simulated** "For You" feed built entirely from real, verified posts that deep-link back to the originals on X.

**This is a simulation, not surveillance.** No X API, no login, no cookies, no analytics. Feeds are generated deterministically from the URL alone, which is what makes them shareable.

## How it works

- **`data/corpus-sources.json`** — curated list of real tweet IDs + topic/vibe tags. The only hand-maintained file.
- **`npm run corpus`** — verifies every ID against X's public syndication endpoint (no API key), pulls exact text, author, date, and like counts, drops anything deleted or mismatched, and writes `data/corpus.json`. Run it whenever you add tweets or want fresh engagement numbers.
- **`data/accounts.json`** — seed index of ~150 popular accounts (handle, name, approximate followers, interest tags). Powers the instant typeahead, profile inference, and the "accounts that match this profile" links.
- **`lib/feed-engine.ts`** — builds a tag-weight profile from a handle or survey answers, then does seeded weighted sampling over the corpus. Same URL → same feed, "refresh the algorithm" → new seed. Everyone's profile gets a humor floor, because everyone's feed has shitposts.
- **`app/api/persona`** — optional Claude-written one-line "algorithmic read" on the persona (Opus 4.8, structured output). Falls back silently to a heuristic blurb when `ANTHROPIC_API_KEY` isn't set.
- **`app/api/og`** — share-card image per feed URL.

## Develop

```sh
npm install
npm run corpus   # rebuild/verify the tweet corpus
npm run dev
```

Optional: `export ANTHROPIC_API_KEY=...` for LLM persona blurbs.

## Expanding the corpus

Add `{ "id": "...", "handle": "...", "tags": [...] }` entries to `data/corpus-sources.json` and re-run `npm run corpus`. Good sources of verified tweet IDs: Wikipedia's most-liked/most-retweeted lists (cite-tweet templates carry bare IDs), embedded tweets in news articles, or any `x.com/<user>/status/<id>` URL. Tags in play: `tech`, `politics-left`, `politics-right`, `pop-culture`, `sports`, `finance`, `media`, `humor`, `iconic`.

Deploys as a standard Next.js app (built for Vercel).
