import { NextResponse } from "next/server";
import { appwriteConfigured } from "@/lib/appwrite/server";

export const runtime = "nodejs";

export async function GET() {
  const gemini = Boolean(process.env.GEMINI_API_KEY);
  const appwriteAuth = appwriteConfigured();
  const appwriteDatabase = Boolean(
    appwriteAuth &&
    process.env.APPWRITE_API_KEY &&
    process.env.APPWRITE_DATABASE_ID &&
    process.env.APPWRITE_PROJECTS_COLLECTION_ID &&
    process.env.APPWRITE_MESSAGES_COLLECTION_ID
  );
  const githubApp = Boolean(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY && process.env.GITHUB_WEBHOOK_SECRET);
  const sandbox = Boolean(process.env.SANDBOX_PROVIDER_URL && process.env.SANDBOX_PROVIDER_TOKEN);
  return NextResponse.json({
    gemini: { configured: gemini, model: process.env.GEMINI_MODEL || "gemini-2.5-flash" },
    github: { configured: githubApp, mode: githubApp ? "app_credentials_present" : "needs_setup" },
    appwrite: {
      authConfigured: appwriteAuth,
      databaseConfigured: appwriteDatabase,
      mode: appwriteDatabase ? "credentials_present" : "needs_setup"
    },
    previewRuntime: { configured: sandbox, mode: sandbox ? "provider_credentials_present" : "needs_isolated_runtime" },
    deployment: { configured: Boolean(process.env.VERCEL), url: process.env.NEXT_PUBLIC_APP_URL || null }
  }, { headers: { "Cache-Control": "no-store" } });
}
