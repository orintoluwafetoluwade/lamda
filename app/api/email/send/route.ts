import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 15;

const schema = z.object({
  to: z.string().email().max(320),
  subject: z.string().trim().min(1).max(180),
  text: z.string().trim().min(1).max(12000),
  idempotencyKey: z.string().trim().min(8).max(200)
});

export async function POST(request: Request) {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Email dispatch is disabled: configure INTERNAL_API_SECRET on the server." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== "Bearer " + secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return NextResponse.json({ error: "Configure RESEND_API_KEY and RESEND_FROM_EMAIL first." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email payload. Provide a valid recipient, subject, text and idempotencyKey." }, { status: 400 });
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.RESEND_API_KEY,
        "Content-Type": "application/json",
        "Idempotency-Key": parsed.data.idempotencyKey
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [parsed.data.to],
        subject: parsed.data.subject,
        text: parsed.data.text
      }),
      signal: AbortSignal.timeout(10000)
    });
    const data = await response.json().catch(() => ({})) as { id?: string; message?: string; name?: string };
    if (!response.ok) {
      return NextResponse.json({ error: data.message || "Email provider rejected the request.", providerError: data.name || null }, { status: response.status >= 500 ? 502 : response.status });
    }
    return NextResponse.json({ accepted: true, id: data.id || null, status: "accepted" }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Email provider could not be reached." }, { status: 502 });
  }
}
