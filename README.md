# ForgePilot AI

An AI app-builder workspace powered by OpenAI, with a safe server-side agent API, project workspace UI, and integration setup for GitHub and Resend.

> Status: initial scaffold. Production use requires configuring secrets, database/auth, and an isolated preview runtime. Do not treat unconfigured integrations as live.

## Quick start

Requirements: Node.js 20+, npm, an OpenAI API key.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `OPENAI_API_KEY` in `.env.local` before using the AI endpoint. Never commit secrets.

## Environment

- `OPENAI_API_KEY` — server-only OpenAI key
- `OPENAI_MODEL` — optional model override (defaults to `gpt-4.1-mini`)
- `RESEND_API_KEY` — optional transactional email delivery
- `RESEND_FROM_EMAIL` — verified sender address for Resend
- `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET` — GitHub App integration configuration
- `NEXT_PUBLIC_APP_URL` — canonical app URL
- `DATABASE_URL` — reserved for persistent database integration

## Security and limitations

- API keys are read only on the server and must never use a `NEXT_PUBLIC_` prefix.
- The AI endpoint validates request size and uses a bounded structured response; it does not execute generated code.
- Generated code must run in a separate, isolated sandbox. This scaffold does not claim to provide a live sandbox or production deployment runtime.
- GitHub writes should use a GitHub App installation token with least-privilege permissions and should target feature branches / pull requests rather than `main`.
- Resend sends email; it is not a durable job queue. Production email and build jobs need a persistent queue, retries, and idempotency.
- Authentication, persistent project storage, and production sandbox execution must be configured before public production use.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```
