-- Speaking attempts: one row per assessed recording. Safe to re-run.

create table if not exists public.speaking_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mode text not null check (mode in ('read', 'topic')),
  prompt text not null,
  transcript text not null default '',
  overall_score numeric(5, 1) not null,
  pronunciation_score numeric(5, 1) not null,
  content_score numeric(5, 1),
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists speaking_attempts_user_created_idx
  on public.speaking_attempts (user_id, created_at desc);

alter table public.speaking_attempts enable row level security;

drop policy if exists "Users can view own speaking attempts" on public.speaking_attempts;
create policy "Users can view own speaking attempts" on public.speaking_attempts
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own speaking attempts" on public.speaking_attempts;
create policy "Users can insert own speaking attempts" on public.speaking_attempts
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- No update/delete: deleting rows would bypass the daily practice cap.
revoke all on public.speaking_attempts from anon, authenticated;
grant select, insert on public.speaking_attempts to authenticated;
