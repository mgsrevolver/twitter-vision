import Anthropic from "@anthropic-ai/sdk";
import { ALL_TAGS, type Tag } from "./types";

/**
 * LLM-inferred account info for handles outside the curated index.
 * Server-only. Returns null when no API key is configured, the handle is
 * malformed, or the model isn't confident the account is real and notable —
 * callers fall back to the "we don't know that one" page.
 */
export interface InferredAccount {
  handle: string;
  name: string;
  followers: number;
  tags: Tag[];
}

const cache = new Map<string, InferredAccount | null>();

const SCHEMA = {
  type: "object" as const,
  properties: {
    isRealAndNotable: {
      type: "boolean" as const,
      description:
        "true ONLY if you are confident this exact handle is a real, public, at-least-niche-famous X/Twitter account you know things about. When in doubt, false.",
    },
    name: { type: "string" as const, description: "Their display name, e.g. 'John Cleese'." },
    followers: { type: "integer" as const, description: "Approximate follower count." },
    tags: {
      type: "array" as const,
      items: { type: "string" as const, enum: ALL_TAGS },
      minItems: 1,
      maxItems: 4,
      description: "What their feed runs on, from the fixed taxonomy.",
    },
  },
  required: ["isRealAndNotable", "name", "followers", "tags"],
  additionalProperties: false as const,
};

export async function inferAccount(rawHandle: string): Promise<InferredAccount | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const handle = rawHandle.replace(/^@/, "");
  if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) return null;
  const key = handle.toLowerCase();
  if (cache.has(key)) return cache.get(key) ?? null;

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 300,
      system:
        "You vet X/Twitter handles for a simulated-timeline app. Given a handle, decide whether it is a real, " +
        "public, at-least-niche-famous account you genuinely know (politicians, athletes, creators, journalists, " +
        "well-known posters). Accuracy beats coverage: if you are not sure the exact handle is real and belongs to " +
        "who you think, say isRealAndNotable=false. Respond only with the final JSON — no reasoning or preamble.",
      messages: [{ role: "user", content: `Handle: @${handle}` }],
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = JSON.parse(text) as {
      isRealAndNotable: boolean;
      name: string;
      followers: number;
      tags: Tag[];
    };
    const result: InferredAccount | null = parsed.isRealAndNotable
      ? {
          handle,
          name: parsed.name,
          followers: Math.max(1000, parsed.followers),
          tags: parsed.tags.filter((t) => ALL_TAGS.includes(t)).slice(0, 4),
        }
      : null;
    if (result && result.tags.length === 0) result.tags.push("pop-culture");
    cache.set(key, result);
    return result;
  } catch {
    return null; // transient API failure: don't cache, fall back gracefully
  }
}
