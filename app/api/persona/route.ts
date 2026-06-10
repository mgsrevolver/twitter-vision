import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { findAccount } from "@/lib/accounts";

export const runtime = "nodejs";

// Persona blurbs are deterministic per handle — cache for the life of the process.
const cache = new Map<string, string>();

const SCHEMA = {
  type: "object" as const,
  properties: {
    summary: {
      type: "string" as const,
      description:
        "One or two sentences, written as 'The Algorithm's read' on this person's feed. Dry, observational, funny but warm — never mean. No hashtags, no emoji.",
    },
  },
  required: ["summary"],
  additionalProperties: false as const,
};

export async function POST(req: Request) {
  const { handle } = await req.json().catch(() => ({}));
  if (typeof handle !== "string" || !handle) {
    return NextResponse.json({ summary: null }, { status: 400 });
  }

  const account = findAccount(handle);
  if (!account || !process.env.ANTHROPIC_API_KEY) {
    // Client falls back to the heuristic summary.
    return NextResponse.json({ summary: null });
  }

  const cached = cache.get(account.handle);
  if (cached) return NextResponse.json({ summary: cached });

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 300,
      system:
        "You write the one-line 'algorithmic read' shown above a simulated X/Twitter timeline. " +
        "Given a public figure or account, describe what their For You feed probably runs on — " +
        "their interests, their guilty-pleasure corners of the site, the energy of their replies tab. " +
        "Dry wit, warm, specific. Never cruel, never about appearance or family. " +
        "Respond only with the final JSON — no reasoning or preamble.",
      messages: [
        {
          role: "user",
          content: `Account: @${account.handle} (${account.name}), ~${Math.round(
            account.followers / 1_000_000,
          )}M followers, broadly associated with: ${account.tags.join(", ")}.`,
        },
      ],
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const { summary } = JSON.parse(text) as { summary: string };
    cache.set(account.handle, summary);
    return NextResponse.json({ summary });
  } catch {
    return NextResponse.json({ summary: null });
  }
}
