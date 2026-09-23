-- Writing attempts: one row per graded VSTEP writing submission. Safe to re-run.

create table if not exists public.writing_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  task text not null check (task in ('task1', 'task2')),
  prompt text not null,
  essay text not null,
  word_count int not null,
  overall_score numeric(3, 1) not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists writing_attempts_user_created_idx
  on public.writing_attempts (user_id, created_at desc);

alter table public.writing_attempts enable row level security;

drop policy if exists "Users can view own writing attempts" on public.writing_attempts;
create policy "Users can view own writing attempts" on public.writing_attempts
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own writing attempts" on public.writing_attempts;
create policy "Users can insert own writing attempts" on public.writing_attempts
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- No update/delete: deleting rows would bypass the daily practice cap.
revoke all on public.writing_attempts from anon, authenticated;
grant select, insert on public.writing_attempts to authenticated;
