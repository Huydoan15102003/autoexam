-- User-created practice questions ("Câu hỏi của tôi"). Safe to re-run.

create table if not exists public.custom_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('read', 'topic', 'task1', 'task2')),
  title text not null check (char_length(title) between 1 and 120),
  content text not null check (char_length(content) between 1 and 1500),
  created_at timestamptz not null default now()
);

create index if not exists custom_questions_user_created_idx
  on public.custom_questions (user_id, created_at desc);

alter table public.custom_questions enable row level security;

drop policy if exists "Users can view own questions" on public.custom_questions;
create policy "Users can view own questions" on public.custom_questions
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own questions" on public.custom_questions;
create policy "Users can create own questions" on public.custom_questions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own questions" on public.custom_questions;
create policy "Users can delete own questions" on public.custom_questions
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.custom_questions from anon, authenticated;
grant select, insert, delete on public.custom_questions to authenticated;
