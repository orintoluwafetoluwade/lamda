import { NextResponse } from "next/server";
import { Account, Client, ID } from "node-appwrite";
import { z } from "zod";
import { createSessionClient } from "@/lib/appwrite/server";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().email().max(254),
  password: z.string().min(8).max(128)
});

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter your name, a valid email, and a password of at least 8 characters." }, { status: 400 });
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  if (!endpoint || !projectId) return NextResponse.json({ error: "Appwrite is not configured. Check the endpoint and project ID environment variables." }, { status: 503 });
  try {
    const client = new Client().setEndpoint(endpoint).setProject(projectId);
    const account = new Account(client);
    await account.create({ userId: ID.unique(), email: parsed.data.email, password: parsed.data.password, name: parsed.data.name });
    const { account: sessionAccount } = createSessionClient("");
    const session = await sessionAccount.createEmailPasswordSession({ email: parsed.data.email, password: parsed.data.password });
    const response = NextResponse.json({ ok: true });
    response.cookies.set("forgepilot_session", session.secret, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 14 });
    return response;
  } catch (error) {
    const message = error instanceof Error && /user_already_exists/i.test(error.message)
      ? "An account with this email already exists. Sign in instead."
      : "Could not create your account. Check the Appwrite Users and Auth settings.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
