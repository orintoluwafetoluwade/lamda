# ForgePilot AI

ForgePilot AI is an original AI development-workspace MVP built with Next.js, TypeScript, Google Gemini, and Appwrite.

## Quick start

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `GEMINI_API_KEY` to enable the coding assistant. Configure Appwrite Auth with email/password enabled, then set `NEXT_PUBLIC_APPWRITE_ENDPOINT` and `NEXT_PUBLIC_APPWRITE_PROJECT_ID`. Create a database and two collections, then set the database and collection IDs plus a server-only `APPWRITE_API_KEY`.

## Environment variables

- `GEMINI_API_KEY` — server-only Google Gemini API key.
- `GEMINI_MODEL` — optional Gemini model override; defaults to `gemini-2.5-flash`.
- `NEXT_PUBLIC_APPWRITE_ENDPOINT`, `NEXT_PUBLIC_APPWRITE_PROJECT_ID` — Appwrite endpoint and project ID.
- `APPWRITE_API_KEY` — server-only Appwrite API key with the minimum required database permissions. Never expose it in a `NEXT_PUBLIC_` variable.
- `APPWRITE_DATABASE_ID` — Appwrite database ID.
- `APPWRITE_PROJECTS_COLLECTION_ID` — projects collection ID. Required string attributes: `userId`, `name`, `description`, `repositoryFullName`, `defaultBranch`.
- `APPWRITE_MESSAGES_COLLECTION_ID` — messages collection ID. Required string attributes: `projectId`, `userId`, `role`, `content`, `model`. Add indexes for `projectId` and `userId` if needed for query performance.
- `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET` — future GitHub App integration.
- `SANDBOX_PROVIDER_URL`, `SANDBOX_PROVIDER_TOKEN` — reserved for isolated code execution.
- `NEXT_PUBLIC_APP_URL` — canonical app URL.

## Implemented

- Responsive dark workspace UI with prompt composer and starter prompts.
- Gemini generateContent endpoint with input validation, timeout handling, and best-effort per-instance IP rate limiting.
- Appwrite email/password signup and sign-in using an HttpOnly server session cookie.
- User-scoped project and conversation persistence in Appwrite, with ownership checks on server routes.
- Integration-readiness endpoint that does not reveal secret values.

## Known limitations

This is not yet a full Lovable replacement. It does not yet generate a persistent source-file tree or provide a live code preview. GitHub repository import/branch/commit/PR tools, signed webhooks, durable background workers, isolated preview execution, browser tests, and deployment orchestration still need implementation. A credential indicator is not proof an integration has been end-to-end tested.

Generated code is never executed on the main application server. Before public production use, verify Appwrite collection attributes and permissions, configure secrets, add shared durable rate limiting and queue processing, isolated per-project sandbox execution with egress/resource limits, security tests, monitoring, and end-to-end tests.

## Checks

```bash
npm run typecheck
npm run build
npm run lint
```
