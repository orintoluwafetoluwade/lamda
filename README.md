# ForgePilot AI

Next.js, TypeScript, Google Gemini, and Supabase development-workspace MVP.

## Setup
```bash
npm install
cp .env.example .env.local
npm run dev
```
Set `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Apply the SQL migration at `supabase/migrations/20261019000000_create_forgepilot_projects_messages.sql` to create projects/messages and RLS policies. Set the Supabase Auth site URL and redirect allowlist to the deployed app URL and `/auth/callback`.

## Security
Normal project and message operations use the signed-in user's Supabase session and row-level security. Never expose the Supabase service-role secret in a `NEXT_PUBLIC_` variable. Gemini credentials must remain server-only.

## Current scope
Includes email/password signup and login, confirmation callback, session cookies, per-user projects and conversation storage, and Gemini API integration. A full Lovable-style source tree/live preview, GitHub branch/commit/PR operations, durable workers, and isolated code execution are not yet implemented. Never execute generated code in the main web process.
