import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const openai = Boolean(process.env.OPENAI_API_KEY);
  const resend = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
  const githubApp = Boolean(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY && process.env.GITHUB_WEBHOOK_SECRET);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const database = Boolean(supabaseUrl && supabaseKey);
  const sandbox = Boolean(process.env.SANDBOX_PROVIDER_URL && process.env.SANDBOX_PROVIDER_TOKEN);
  return NextResponse.json({
    openai: { configured: openai, model: process.env.OPENAI_MODEL || "gpt-4.1-mini" },
    github: { configured: githubApp, mode: githubApp ? "app_credentials_present" : "needs_setup" },
    resend: { configured: resend, mode: resend ? "email_credentials_present" : "needs_setup" },
    database: { configured: database, provider: "Supabase" },
    previewRuntime: { configured: sandbox, mode: sandbox ? "provider_credentials_present" : "needs_isolated_runtime" },
    deployment: { configured: Boolean(process.env.VERCEL), url: process.env.NEXT_PUBLIC_APP_URL || null }
  }, { headers: { "Cache-Control": "no-store" } });
}
