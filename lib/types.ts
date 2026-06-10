export type Tag =
  | "tech"
  | "ai"
  | "science"
  | "sports"
  | "music"
  | "film-tv"
  | "gaming"
  | "finance"
  | "crypto"
  | "food"
  | "books"
  | "fitness"
  | "animals"
  | "media"
  | "humor"
  | "pop-culture"
  | "wholesome"
  | "politics-left"
  | "politics-right"
  | "iconic";

export const ALL_TAGS: Tag[] = [
  "tech", "ai", "science", "sports", "music", "film-tv", "gaming",
  "finance", "crypto", "food", "books", "fitness", "animals", "media",
  "humor", "pop-culture", "wholesome", "politics-left", "politics-right", "iconic",
];

export type MediaItem =
  | { type: "photo"; url: string; w: number | null; h: number | null }
  | { type: "video" | "gif"; poster: string; mp4: string | null; w: number | null; h: number | null };

/** A tweet embedded inside another via quote — rendered as the inner box. */
export interface QuotedTweet {
  id: string;
  handle: string;
  name: string;
  avatar: string | null;
  verifiedAuthor: boolean;
  text: string;
  url: string;
  media?: MediaItem[];
}

export interface CorpusTweet {
  id: string;
  handle: string;
  name: string;
  avatar: string | null;
  verifiedAuthor: boolean;
  text: string;
  createdAt: string;
  likes: number;
  replies: number;
  url: string;
  tags: Tag[];
  hasMedia: boolean;
  media?: MediaItem[];
  quoted?: QuotedTweet;
}

/** A real interaction partner — who this account actually replies to / collabs with. */
export interface CircleEntry {
  handle: string;
  inPool: boolean;
  why: string;
}

export interface Account {
  handle: string;
  name: string;
  followers: number;
  tags: Tag[];
  circle?: CircleEntry[];
}

export type Lean =
  | "progressive"
  | "liberal"
  | "centrist"
  | "libertarian"
  | "maga"
  | "conservative"
  | "none";

export type OnlineLevel = "normal" | "toomuch" | "terminal";

export interface Profile {
  /** "@handle" lookup or survey archetype */
  source: "handle" | "survey";
  handle?: string;
  displayName: string;
  tagWeights: Partial<Record<Tag, number>>;
  /** how online this person is — shapes banger-vs-deep-cut sampling */
  online: OnlineLevel;
  /** one-line algorithmic "read" on this persona */
  summary: string;
  /** lowercase handle → why they interact, from curated real interaction graphs */
  circle?: Record<string, string>;
  /** score multipliers for tags this person would scroll past (e.g. opposing politics) */
  avoid?: Partial<Record<Tag, number>>;
}

export interface FeedItem {
  tweet: CorpusTweet;
  /** simulated algorithmic justification, e.g. "Popular in Tech" */
  reason: string;
  /** simulated relative age, e.g. "3m", "7h" — feeds always look fresh */
  ago: string;
  /** simulated engagement the corpus doesn't carry (views, reposts) */
  stats: { reposts: number; views: number };
}

export interface SurveyAnswers {
  lean: Lean;
  interests: Tag[];
  online: OnlineLevel;
}
