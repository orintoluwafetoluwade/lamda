# ForgePilot AI

ForgePilot AI is an original AI development-workspace MVP built with Next.js, TypeScript, and the OpenAI API.

## Quick start

Requirements: Node.js 20+ and npm.

\`\`\`bash
npm install
cp .env.example .env.local
npm run dev
\`\`\`

Set \`OPENAI_API_KEY\` in \`.env.local\` to enable the coding assistant. Never commit \`.env.local\` or secrets.

## Environment variables

- \`OPENAI_API_KEY\` — server-only OpenAI key.
- \`OPENAI_MODEL\` — optional model override; defaults to \`gpt-4.1-mini\`.
- \`RESEND_API_KEY\` and \`RESEND_FROM_EMAIL\` — optional transactional email delivery; sender must be verified.
- \`INTERNAL_API_SECRET\` — protects the server-to-server email dispatch endpoint.
- \`GITHUB_APP_ID\`, \`GITHUB_APP_PRIVATE_KEY\`, \`GITHUB_WEBHOOK_SECRET\` — GitHub App configuration (connection workflow still needs to be completed).
- \`SUPABASE_URL\`, \`SUPABASE_ANON_KEY\`, \`SUPABASE_SERVICE_ROLE_KEY\` — intended database/auth provider configuration. Never expose the service role key to clients.
- \`SANDBOX_PROVIDER_URL\`, \`SANDBOX_PROVIDER_TOKEN\` — reserved for a separate isolated code-execution runtime.
- \`NEXT_PUBLIC_APP_URL\` — canonical app URL.

## What currently works

- Responsive ForgePilot workspace UI with a prompt composer and starter prompts.
- Server-side OpenAI chat-completions route with schema validation, bounded history, request timeout and readable error responses.
- Server-side integration-readiness endpoint that reports configuration presence without returning secret values.
- Server-to-server Resend dispatch endpoint protected by \`INTERNAL_API_SECRET\`, validated payloads and a provider idempotency key.
- Initial Supabase SQL schema with per-user row-level security policies for projects, messages, files, build jobs and email events.

## Important limitations

This is an MVP scaffold, not yet a full Lovable-equivalent platform. The workspace conversation currently lives in client memory; Supabase persistence and authentication are not wired into the UI. GitHub OAuth/App installation, repository import, branch/commit/PR tools, signed webhooks, durable queue workers, real isolated preview execution, browser testing, and one-click project deployment still need implementation. Integration indicators must not be interpreted as proof that a provider has been end-to-end tested.

Generated code is never executed by the main application server. Before public production use, add authentication and authorization, durable rate limiting and job processing, isolated per-project sandbox execution with egress/resource limits, request auditing, security tests, and monitoring.

## Supabase schema

Apply \`supabase/migrations/001_initial_schema.sql\` to a Supabase project. The SQL defines tables and RLS policies, but the current UI/API does not yet use the schema.

## Checks

\`\`\`bash
npm run typecheck
npm run build
npm run lint
\`\`\`
