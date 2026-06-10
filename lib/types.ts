export type Tag =
  | "tech"
  | "politics-left"
  | "politics-right"
  | "pop-culture"
  | "sports"
  | "finance"
  | "media"
  | "humor"
  | "iconic";

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
}

export interface Account {
  handle: string;
  name: string;
  followers: number;
  tags: Tag[];
}

export interface Profile {
  /** "@handle" lookup or survey archetype */
  source: "handle" | "survey";
  handle?: string;
  displayName: string;
  tagWeights: Partial<Record<Tag, number>>;
  /** one-line algorithmic "read" on this persona */
  summary: string;
}

export interface FeedItem {
  tweet: CorpusTweet;
  /** simulated algorithmic justification, e.g. "Popular in Tech" */
  reason: string;
}

export interface SurveyAnswers {
  lean: "left" | "right" | "none";
  interests: Tag[];
  vibe: "chaotic" | "wholesome" | "intense";
}
