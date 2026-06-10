import accountsData from "@/data/accounts.json";
import type { Account } from "./types";

export const ACCOUNTS = accountsData.accounts as Account[];

export function findAccount(handle: string): Account | undefined {
  const h = handle.replace(/^@/, "").toLowerCase();
  return ACCOUNTS.find((a) => a.handle.toLowerCase() === h);
}

export function searchAccounts(query: string, limit = 8): Account[] {
  const q = query.replace(/^@/, "").toLowerCase();
  if (!q) return [];
  const scored = ACCOUNTS.flatMap((a) => {
    const handle = a.handle.toLowerCase();
    const name = a.name.toLowerCase();
    let score = -1;
    if (handle.startsWith(q)) score = 3;
    else if (name.startsWith(q)) score = 2;
    else if (handle.includes(q) || name.includes(q)) score = 1;
    return score < 0 ? [] : [{ a, score }];
  });
  return scored
    .sort((x, y) => y.score - x.score || y.a.followers - x.a.followers)
    .slice(0, limit)
    .map((s) => s.a);
}
