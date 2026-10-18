import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;
const requestSchema = z.object({
  prompt: z.string().trim().min(3).max(12000),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(12000)
  })).max(20).optional()
});

// Best-effort per-instance protection. Use a shared durable limiter and
// authenticated users before opening this endpoint to significant traffic.
const requestBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 8;

function rateLimited(request: Request) {
  const now = Date.now();
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = forwarded || request.headers.get("x-real-ip") || "unknown";
  const current = requestBuckets.get(key);
  if (!current || current.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (current.count >= RATE_LIMIT) return true;
  current.count += 1;
  return false;
}

export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    status: process.env.OPENAI_API_KEY ? "ready" : "needs_api_key"
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI is not configured yet. Add OPENAI_API_KEY to your server environment." }, { status: 503 });
  }
  if (rateLimited(request)) {
    return NextResponse.json({ error: "Rate limit reached. Wait a minute before trying again." }, { status: 429, headers: { "Retry-After": "60" } });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please provide a prompt between 3 and 12,000 characters." }, { status: 400 });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 50_000, maxRetries: 1 });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: "You are ForgePilot, a careful senior full-stack engineer inside an AI app builder. Help users turn ideas into practical implementation plans. Be clear for non-technical founders while remaining technically accurate. When asked to build, return a concise plan, suggested stack, key files to create/change, and implementation code where useful. Never claim you have changed files, run builds, deployed, connected GitHub, or sent email unless a real tool did that. Generated code is proposed output only and must not be executed by this API. Mention missing credentials/infrastructure honestly. Avoid leaking secrets." },
        ...(parsed.data.history || []).map((message) => ({ role: message.role, content: message.content })),
        { role: "user", content: parsed.data.prompt }
      ]
    });
    const answer = completion.choices[0]?.message?.content?.trim();
    if (!answer) return NextResponse.json({ error: "The model returned an empty response. Please try again." }, { status: 502 });
    return NextResponse.json({
      answer,
      model: completion.model,
      usage: completion.usage ? { inputTokens: completion.usage.prompt_tokens, outputTokens: completion.usage.completion_tokens } : undefined
    });
  } catch (error) {
    const message = error instanceof OpenAI.APIError
      ? (error.status === 401 ? "OpenAI rejected the API key. Check OPENAI_API_KEY." : error.status === 429 ? "OpenAI rate limit or quota reached. Check your OpenAI billing and limits." : "OpenAI request failed (" + (error.status ?? "network") + "). Please retry.")
      : "Could not reach OpenAI. Check server logs and try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
