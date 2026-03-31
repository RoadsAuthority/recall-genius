create extension if not exists vector;

create table if not exists public.rag_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  block_id uuid references public.note_blocks(id) on delete set null,
  content text not null,
  embedding vector(768) not null,
  created_at timestamptz not null default now()
);

create index if not exists rag_chunks_user_id_idx on public.rag_chunks(user_id);
create index if not exists rag_chunks_subject_id_idx on public.rag_chunks(subject_id);
create index if not exists rag_chunks_note_id_idx on public.rag_chunks(note_id);
