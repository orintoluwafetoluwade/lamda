-- ForgePilot AI initial schema. Apply with Supabase CLI or SQL editor.
create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  repository_full_name text,
  default_branch text not null default 'main',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_user_updated_idx on public.projects(user_id, updated_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null check (char_length(content) <= 50000),
  model text,
  created_at timestamptz not null default now()
);
create index if not exists messages_project_created_idx on public.messages(project_id, created_at);

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  path text not null check (char_length(path) between 1 and 500),
  content text not null default '',
  language text,
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  unique(project_id, path)
);

create table if not exists public.build_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('generate', 'build', 'preview', 'email', 'github_sync')),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  idempotency_key text,
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  error_message text,
  available_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, idempotency_key)
);
create index if not exists build_jobs_queue_idx on public.build_jobs(status, available_at) where status in ('queued', 'failed');

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  job_id uuid references public.build_jobs(id) on delete set null,
  provider_message_id text,
  idempotency_key text not null unique,
  recipient_hash text not null,
  status text not null default 'queued' check (status in ('queued', 'accepted', 'delivered', 'bounced', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.messages enable row level security;
alter table public.project_files enable row level security;
alter table public.build_jobs enable row level security;
alter table public.email_events enable row level security;

drop policy if exists "users manage their projects" on public.projects;
create policy "users manage their projects" on public.projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "users manage their messages" on public.messages;
create policy "users manage their messages" on public.messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "users manage their files" on public.project_files;
create policy "users manage their files" on public.project_files for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "users read their build jobs" on public.build_jobs;
create policy "users read their build jobs" on public.build_jobs for select using (auth.uid() = user_id);
drop policy if exists "users read their email events" on public.email_events;
create policy "users read their email events" on public.email_events for select using (auth.uid() = user_id);

-- Worker-managed jobs require a trusted server/worker credential; no anon insert policy is provided.
