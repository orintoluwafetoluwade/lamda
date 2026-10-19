import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

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
      { error: "Enter a valid email address and password." },
      { status: 400 },
    );
  }

  const credentials = {
    email: parsed.data.email.trim().toLowerCase(),
    password: parsed.data.password,
  };

  try {
    const supabase = await createClient();
    let { error } = await supabase.auth.signInWithPassword(credentials);

    // For this deployment, email confirmation is intentionally non-blocking.
    // Only confirm an account after Supabase has verified the submitted password
    // far enough to return the explicit email_not_confirmed error.
    if (error?.code === "email_not_confirmed") {
      const admin = getAdminClient();
      if (!admin) {
        return NextResponse.json(
          { error: "Email confirmation is still enabled in Supabase. Add SUPABASE_SERVICE_ROLE_KEY to the server environment or disable Confirm email in Supabase Auth settings, then redeploy." },
          { status: 503 },
        );
      }

      const { data: users, error: listError } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (listError) {
        return NextResponse.json({ error: "Could not verify the account. Please try again." }, { status: 503 });
      }

      const user = users.users.find(
        (candidate) => candidate.email?.toLowerCase() === credentials.email,
      );
      if (!user) {
        return NextResponse.json({ error: "No account was found for this email. Create an account first." }, { status: 401 });
      }

      const { error: confirmError } = await admin.auth.admin.updateUserById(user.id, {
        email_confirm: true,
      });
      if (confirmError) {
        return NextResponse.json({ error: "Could not activate this account. Please try again." }, { status: 503 });
      }

      ({ error } = await supabase.auth.signInWithPassword(credentials));
    }

    if (error) {
      if (error.code === "invalid_credentials") {
        return NextResponse.json(
          { error: "Email or password is incorrect. If this account was created before the Appwrite-to-Supabase migration, create a new Supabase account or reset its password." },
          { status: 401 },
        );
      }
      return NextResponse.json({ error: "Sign-in failed. Please try again." }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Supabase is not configured correctly. Check the server environment variables." },
      { status: 503 },
    );
  }
}
