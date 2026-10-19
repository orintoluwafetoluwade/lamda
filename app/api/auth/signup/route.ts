import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter your name, a valid email and a password of at least 8 characters." },
      { status: 400 },
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "To create accounts without confirmation emails, add SUPABASE_SERVICE_ROLE_KEY as a server-only Vercel environment variable, then redeploy." },
      { status: 503 },
    );
  }

  try {
    const admin = createSupabaseClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const email = parsed.data.email.trim().toLowerCase();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.name },
    });

    if (error || !data.user) {
      const alreadyExists = /already registered|already exists|user already registered/i.test(error?.message ?? "");
      return NextResponse.json(
        { error: alreadyExists ? "An account with this email already exists. Sign in instead." : "Could not create your account. Please try again." },
        { status: alreadyExists ? 409 : 400 },
      );
    }

    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: parsed.data.password,
    });
    if (signInError) {
      return NextResponse.json(
        { error: "Your account was created, but sign-in did not complete. Please sign in with your new credentials." },
        { status: 200 },
      );
    }

    return NextResponse.json({ ok: true, confirmationRequired: false });
  } catch {
    return NextResponse.json(
      { error: "Supabase is not configured correctly. Check the server environment variables." },
      { status: 503 },
    );
  }
}
