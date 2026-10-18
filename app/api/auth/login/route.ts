import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionClient } from "@/lib/appwrite/server";

const schema = z.object({ email: z.string().email().max(254), password: z.string().min(8).max(128) });

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and a password of at least 8 characters." }, { status: 400 });
  try {
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
    if (!endpoint || !projectId) return NextResponse.json({ error: "Appwrite is not configured. Check the endpoint and project ID environment variables." }, { status: 503 });
    const { account } = createSessionClient("");
    const session = await account.createEmailPasswordSession({ email: parsed.data.email, password: parsed.data.password });
    const response = NextResponse.json({ ok: true });
    response.cookies.set("forgepilot_session", session.secret, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 14 });
    return response;
  } catch (error) {
    const message = error instanceof Error && /user_invalid_credentials|password|email/i.test(error.message)
      ? "Email or password is incorrect."
      : "Could not sign in. Check your Appwrite configuration and try again.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
