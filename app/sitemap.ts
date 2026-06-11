import type { MetadataRoute } from "next";
import { ACCOUNTS } from "@/lib/accounts";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...ACCOUNTS.filter((a) => !a.dead).map((a) => ({
      url: `${SITE_URL}/u/${a.handle}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: Math.min(0.9, 0.4 + Math.log10(Math.max(a.followers, 1000)) / 10),
    })),
  ];
}
