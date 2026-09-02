-- AI Life OS -- spike schema
-- Run this once against a *new, dedicated* Supabase project for the agent.
-- Do NOT run this against the existing PDC Studio Supabase project -- this is
-- an unrelated product with its own users and data.

create extension if not exists vector;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
create table if not exists agent_users (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text unique not null,
  display_name text,
  timezone text not null default 'Europe/Amsterdam',
  onboarding_state text not null default 'new', -- 'new' | 'in_progress' | 'done'
  personality_preset text not null default 'vriendelijk',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Conversations / messages (episodic log)
-- ---------------------------------------------------------------------------
create table if not exists agent_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references agent_users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  channel text not null default 'whatsapp',
  content text not null,
  tool_calls jsonb,
  created_at timestamptz not null default now()
);

create index if not exists agent_messages_user_created_idx
  on agent_messages (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Long-term memory
-- ---------------------------------------------------------------------------
create table if not exists agent_memory_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references agent_users(id) on delete cascade,
  type text not null check (type in ('preference', 'relationship', 'habit', 'fact', 'context')),
  content text not null,
  embedding vector(1536),
  confidence numeric not null default 0.8,
  source_message_id uuid references agent_messages(id) on delete set null,
  valid_until timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists agent_memory_facts_user_idx on agent_memory_facts (user_id);

-- HNSW index for semantic recall; created after some rows normally exist, but
-- safe to create up front for the spike.
create index if not exists agent_memory_facts_embedding_idx
  on agent_memory_facts using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------
create table if not exists agent_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references agent_users(id) on delete cascade,
  parent_task_id uuid references agent_tasks(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'snoozed', 'cancelled')),
  source text not null default 'inferred' check (source in ('explicit', 'inferred', 'dashboard')),
  source_message_id uuid references agent_messages(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists agent_tasks_user_status_idx on agent_tasks (user_id, status);

-- ---------------------------------------------------------------------------
-- Reminders (follow-up / accountability scheduling -- consumed by the
-- notification worker, which is out of scope for this spike but the table
-- exists so schedule_reminder has somewhere to write).
-- ---------------------------------------------------------------------------
create table if not exists agent_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references agent_users(id) on delete cascade,
  task_id uuid references agent_tasks(id) on delete cascade,
  fire_at timestamptz not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists agent_reminders_fire_at_idx on agent_reminders (fire_at) where status = 'pending';

-- ---------------------------------------------------------------------------
-- Row Level Security
-- The agent backend talks to Supabase with the service_role key (bypasses
-- RLS by design, per §11 of the design doc -- backend enforces user_id scoping
-- in application code). RLS below protects a *future* scenario where the
-- dashboard queries Postgres directly with a user's own JWT.
-- ---------------------------------------------------------------------------
alter table agent_users enable row level security;
alter table agent_messages enable row level security;
alter table agent_memory_facts enable row level security;
alter table agent_tasks enable row level security;
alter table agent_reminders enable row level security;

-- No policies defined yet for anon/authenticated roles: until the web
-- dashboard exists (Fase 1 follow-up), only the service role can read/write.
