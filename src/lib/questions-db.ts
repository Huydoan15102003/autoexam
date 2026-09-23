import { unstable_rethrow } from 'next/navigation'
import type { QuestionKind, SavedQuestion } from '@/lib/questions'
import { createClient } from '@/lib/supabase/server'

// Current user's saved questions of the given kinds, newest first (RLS scopes the rows).
// [] if Supabase is unreachable or the table isn't migrated, so practice pages still render.
export async function listQuestions(kinds: QuestionKind[]): Promise<SavedQuestion[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('custom_questions')
      .select('id, kind, title, content, level, created_at')
      .in('kind', kinds)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as SavedQuestion[]
  } catch (e) {
    unstable_rethrow(e)
    return []
  }
}
