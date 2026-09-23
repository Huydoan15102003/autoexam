-- Question bank: optional CEFR level on user questions, and let owners edit them. Safe to re-run.

alter table public.custom_questions
  add column if not exists level text check (level in ('A2', 'B1', 'B2', 'C1'));

drop policy if exists "Users can update own questions" on public.custom_questions;
create policy "Users can update own questions" on public.custom_questions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant update (kind, title, content, level) on public.custom_questions to authenticated;
