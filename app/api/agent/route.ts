import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  prompt: z.string().trim().min(1).max(12000),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(12000)
  })).max(20).optional()
});

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
  const configured = Boolean(process.env.GEMINI_API_KEY);
  return NextResponse.json({
    configured,
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    status: configured ? "ready" : "needs_api_key"
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "Gemini is not configured yet. Add GEMINI_API_KEY to the server environment." }, { status: 503 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to use the ForgePilot AI assistant." }, { status: 401 });
  if (rateLimited(request)) {
    return NextResponse.json({ error: "Rate limit reached. Wait a minute before trying again." }, { status: 429, headers: { "Retry-After": "60" } });
  }

  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Please provide a prompt between 1 and 12,000 characters." }, { status: 400 });

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  try {
    const contents = [
      ...(parsed.data.history || []).map(message => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }]
      })),
      { role: "user", parts: [{ text: parsed.data.prompt }] }
    ];
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(50_000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "You are ForgePilot, a careful senior full-stack engineer inside an AI app builder. Help users turn ideas into practical implementation plans. Be clear for non-technical founders while remaining technically accurate. When asked to build, return a concise plan, suggested stack, key files to create/change, and implementation code where useful. Treat each conversation as work on the currently selected project: follow-up requests such as “change the color”, “fix this”, or other short instructions modify the existing project and must preserve its current purpose, design, and prior decisions unless the user explicitly asks for a new project. Do not act as if a follow-up is a fresh project request. Short prompts are valid; infer the likely intended change from the conversation history and ask a concise clarification only when essential. Follow the user’s requested output format; when explicitly asked for a self-contained HTML website preview, return only a complete HTML document with inline CSS and any necessary JavaScript, without markdown fences or explanatory prose. Never claim you have changed files, run builds, deployed, connected GitHub, or sent email unless a real tool did that. Generated code is proposed output only and must not be executed by this API. Mention missing credentials/infrastructure honestly. Avoid leaking secrets." }] },
        contents,
        generationConfig: { temperature: 0.3, maxOutputTokens: 8192 }
      })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const status = response.status;
      const message =
        status === 401 || status === 403 ? "Gemini rejected the API key. Check that GEMINI_API_KEY is valid and enabled for the Gemini API." :
        status === 429 ? "Gemini rate limit or quota reached. Check the API quota and billing for the Google AI project." :
        status === 404 ? `Gemini model "${model}" was not found. Set GEMINI_MODEL to a model available to your API key.` :
        status === 400 ? "Gemini rejected the request. Check the configured model and request settings." :
        `Gemini request failed (${status}). Please retry.`;
      console.error("Gemini API returned an error", { status, model, providerMessage: payload?.error?.message || "No provider error message" });
      return NextResponse.json({ error: message }, { status: 502 });
    }
    const answer = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
    if (!answer) {
      console.error("Gemini returned no text candidate", { model, finishReason: payload?.candidates?.[0]?.finishReason || "unknown" });
      return NextResponse.json({ error: "Gemini returned an empty response. Please try again." }, { status: 502 });
    }
    const usage = payload?.usageMetadata;
    return NextResponse.json({
      answer,
      model,
      usage: usage ? { inputTokens: usage.promptTokenCount, outputTokens: usage.candidatesTokenCount } : undefined
    });
  } catch (error) {
    const isTimeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    console.error("Gemini API connection failed", {
      model,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : "Unknown error"
    });
    return NextResponse.json({
      error: isTimeout
        ? "Gemini took too long to respond. Please retry; if it keeps happening, check Google AI Studio quota and model availability."
        : "ForgePilot could not reach the Gemini API from its server. Check the deployment logs and Gemini API availability."
    }, { status: 502 });
  }
}
