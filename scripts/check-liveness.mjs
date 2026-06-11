#!/usr/bin/env node
/**
 * Account liveness sweep — finds indexed accounts that have left X
 * (deactivated, suspended, or renamed), so the product never offers a feed
 * for someone who isn't there anymore.
 *
 * Oracle: nitter.net RSS per account, same as the refresh pipeline. A 404
 * means "user not found"; transient failures (429/5xx/network) leave the
 * account's status untouched. 404s are re-checked in a second pass before
 * we believe them — only a double 404 marks an account dead.
 *
 * Writes `dead: true` onto entries in data/accounts.json (and clears the
 * flag when a previously-dead account answers again).
 *
 * Usage: node scripts/check-liveness.mjs [maxAccounts]
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const GAP_MS = 1100;
const MAX = Number(process.argv[2]) || Infinity;

const file = path.join(ROOT, "data", "accounts.json");
const data = JSON.parse(await readFile(file, "utf8"));
const targets = data.accounts.slice(0, MAX);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** "alive" | "gone" | "unknown" */
async function check(handle, attempt = 0) {
  try {
    const res = await fetch(`https://nitter.net/${handle}/rss`, {
      headers: {
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
    });
    if (res.status === 404) return "gone";
    if (!res.ok) throw new Error(String(res.status));
    return "alive";
  } catch (e) {
    if (attempt < 2) {
      await sleep(3000 * (attempt + 1));
      return check(handle, attempt + 1);
    }
    console.error(`  unknown ${handle}: ${e.message}`);
    return "unknown";
  }
}

console.error(`checking ${targets.length} accounts…`);
const suspects = [];
let alive = 0,
  unknown = 0,
  revived = 0;
for (const [i, a] of targets.entries()) {
  const status = await check(a.handle);
  if (status === "gone") suspects.push(a);
  else if (status === "alive") {
    alive++;
    if (a.dead) {
      delete a.dead;
      revived++;
    }
  } else unknown++;
  if ((i + 1) % 50 === 0) process.stderr.write(`\r  ${i + 1}/${targets.length} (${suspects.length} suspects)`);
  await sleep(GAP_MS);
}

console.error(`\nre-checking ${suspects.length} suspects…`);
let dead = 0;
for (const a of suspects) {
  await sleep(GAP_MS);
  if ((await check(a.handle)) === "gone") {
    a.dead = true;
    dead++;
    console.error(`  DEAD: @${a.handle} (${a.followers} followers)`);
  }
}

await writeFile(file, JSON.stringify(data, null, 1));
console.error(`\nliveness: ${alive} alive, ${dead} dead, ${unknown} unknown, ${revived} revived → accounts.json updated`);
