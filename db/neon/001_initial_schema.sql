-- Neon-compatible baseline schema for Recall Genius
-- Generated from Supabase migrations with Supabase-specific features removed.

create extension if not exists pgcrypto;

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.note_blocks (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  content text not null,
  block_order integer not null default 0,
  confidence_score integer not null default 0,
  next_review timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.recall_questions (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.note_blocks(id) on delete cascade,
  question text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  term text not null,
  definition text not null,
  source_block_id uuid references public.note_blocks(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.concepts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  block_id uuid references public.note_blocks(id) on delete set null,
  type text not null check (type in ('definition', 'importance', 'characteristic', 'example', 'formula')),
  term text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key,
  full_name text,
  avatar_url text,
  phone_number text,
  plan_type text not null default 'free' check (plan_type in ('free', 'premium')),
  created_at timestamptz not null default now()
);

create table if not exists public.notification_settings (
  user_id uuid primary key,
  email_enabled boolean not null default true,
  phone_enabled boolean not null default false,
  reminder_frequency text not null default 'daily' check (reminder_frequency in ('daily', 'weekly', 'none')),
  daily_reminder_count integer not null default 2 check (daily_reminder_count >= 1 and daily_reminder_count <= 6),
  last_reminder_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  message text not null,
  type text not null default 'reminder' check (type in ('reminder', 'system', 'premium')),
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  note_id uuid references public.notes(id) on delete cascade,
  block_id uuid references public.note_blocks(id) on delete set null,
  question text not null,
  answer text not null,
  confidence_score integer not null default 0,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notes_subject_id_idx on public.notes(subject_id);
create index if not exists note_blocks_note_id_idx on public.note_blocks(note_id);
create index if not exists recall_questions_block_id_idx on public.recall_questions(block_id);
create index if not exists definitions_user_id_idx on public.definitions(user_id);
create index if not exists concepts_user_id_idx on public.concepts(user_id);
create index if not exists notifications_user_id_read_idx on public.notifications(user_id, read, created_at desc);
create index if not exists flashcards_next_review_idx on public.flashcards(user_id, next_review_at);
