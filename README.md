# ForgePilot AI

ForgePilot AI is an original AI development-workspace MVP built with Next.js, TypeScript, OpenAI, and optional Supabase Auth/database and Resend integrations.

## Quick start

Requirements: Node.js 20+ and npm.

\`\`\`bash
npm install
cp .env.example .env.local
npm run dev
\`\`\`

Set \`OPENAI_API_KEY\` to enable the coding assistant. To enable authentication and persistent projects, create a Supabase project, apply \`supabase/migrations/001_initial_schema.sql\`, and set \`NEXT_PUBLIC_SUPABASE_URL\` plus \`NEXT_PUBLIC_SUPABASE_ANON_KEY\`. Configure Supabase Auth email confirmation URLs to include \`/auth/callback\`.

## Environment variables

- \`OPENAI_API_KEY\` — server-only OpenAI key.
- \`OPENAI_MODEL\` — optional model override; defaults to \`gpt-4.1-mini\`.
- \`NEXT_PUBLIC_SUPABASE_URL\`, \`NEXT_PUBLIC_SUPABASE_ANON_KEY\` — Supabase browser auth config (anon key is intended for public use with RLS).
- \`SUPABASE_URL\`, \`SUPABASE_ANON_KEY\`, \`SUPABASE_SERVICE_ROLE_KEY\` — optional server-side status/administration configuration. Never expose the service role key to clients.
- \`RESEND_API_KEY\`, \`RESEND_FROM_EMAIL\`, \`INTERNAL_API_SECRET\` — protected server-to-server transactional email dispatch.
- \`GITHUB_APP_ID\`, \`GITHUB_APP_PRIVATE_KEY\`, \`GITHUB_WEBHOOK_SECRET\` — GitHub App config; repository import/branch/PR flow is not yet implemented.
- \`SANDBOX_PROVIDER_URL\`, \`SANDBOX_PROVIDER_TOKEN\` — reserved for isolated code execution.
- \`NEXT_PUBLIC_APP_URL\` — canonical app URL.

## Implemented

- Responsive dark workspace UI with prompt composer and starter prompts.
- Server-side OpenAI chat-completions endpoint with input validation, timeout handling, and a best-effort per-instance IP rate limit.
- Supabase email/password signup/sign-in flow and middleware-protected workspace when Supabase public environment variables are configured.
- Authenticated, user-scoped project list/create API using Supabase RLS.
- Server-side integration-readiness endpoint that does not reveal secret values.
- Protected Resend send endpoint with server secret, input validation and provider idempotency key.
- Initial Supabase schema with RLS for projects, messages, generated files, build jobs and email events.

## Known limitations — not a full Lovable replacement yet

The chat currently returns engineering guidance and proposed code; it does not yet generate a structured project file tree or provide a live code preview. The projects API exists, but the current UI does not yet persist chat history or project files. GitHub OAuth/App installation, repository import, branch/commit/PR tools, signed webhooks, durable background workers, real isolated preview execution, browser tests, and project deployment orchestration still need implementation. A schema or credential indicator is not proof an integration has been end-to-end tested.

Generated code is never executed on the main application server. Before public production use, configure secrets and Supabase, verify authentication/RLS, add shared durable rate limiting and queue processing, isolated per-project sandbox execution with egress/resource limits, security tests, monitoring, and end-to-end tests.

## Checks

\`\`\`bash
npm run typecheck
npm run build
npm run lint
\`\`\`
