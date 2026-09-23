# AutoExam — AI English speaking & writing practice

AutoExam lets learners practise speaking and writing English in the browser. **Azure Speech** scores pronunciation: accuracy, fluency, completeness, prosody and per-word errors. **GPT-5 mini** scores the content of spoken answers and grades VSTEP Writing tasks (letter/email and essay) with inline error corrections. The UI is in Vietnamese.

Stack: Next.js 16 (App Router) · Supabase (Auth + Postgres, `@supabase/ssr` cookie sessions) · Tailwind CSS v4 · Vercel.

## Features

- Landing page `/` with sign-up / log-in CTAs; the header shows the signed-in email and a Dashboard button.
- Email + password auth (sign up with full name, log in, log out) via Server Actions, with friendly Vietnamese error messages (wrong password, email taken, weak password, invalid email, rate limit, unconfirmed email…).
- Optional email confirmation (`/auth/confirm` handles both `token_hash` and `code` links).
- Session persists across reloads and tabs (HTTP-only cookies, refreshed in `src/proxy.ts`).
- Protected `/dashboard`, `/practice` and `/writing`: logged-out visitors are redirected to `/login`.
- `profiles` table (full name) 1–1 with `auth.users`, created by a DB trigger, protected by RLS.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000
```

The app builds and the public pages render without any env vars; auth needs the Supabase ones.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (`sb_publishable_…`) |
| `NEXT_PUBLIC_SITE_URL` | Public URL, fallback for email confirmation links |
| `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | Azure Speech (pronunciation assessment) |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | OpenAI content scoring (default `gpt-5-mini`) |
| `SPEAKING_DAILY_LIMIT`, `WRITING_DAILY_LIMIT` | Max assessed recordings / essays per user per 24 h (default 30 each) |

## Setting up Supabase later

1. Create a project at [supabase.com](https://supabase.com/dashboard) (pick a region close to your users, e.g. Singapore).
2. Open **SQL Editor** and run every file in `supabase/migrations/` **in order** (`0001_profiles.sql`, `0002_speaking_attempts.sql`, `0003_writing_attempts.sql`). The scripts are safe to re-run.
3. Go to **Project Settings → API** (or **Connect**) and copy the **Project URL** and the **publishable key** into `.env.local` (and later into Vercel):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
4. **Authentication → URL Configuration**:
   - **Site URL** = your production URL, e.g. `https://autoexam.vercel.app`.
   - **Redirect URLs**: add `https://<prod-domain>/auth/confirm` and `http://localhost:3000/auth/confirm`.
5. **Authentication → Sign In / Providers → Email** — choose one:
   - **Simplest grading flow:** turn **Confirm email** off. Sign-up logs the user in immediately and lands on `/dashboard`.
   - **Keep confirmation on:** in **Authentication → Emails → Confirm signup**, change the link to
     ```
     {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
     ```
     so the link works even when opened in another browser/device. Note that Supabase's built-in email sender is heavily rate-limited and may only deliver to your team's addresses — configure custom SMTP (Resend, SendGrid…) under **Authentication → Emails → SMTP Settings** before graders sign up with personal emails.
6. Restart `npm run dev` after editing `.env.local`.

## Deploy to Vercel

1. Push the repository to GitHub (`.env.local` is git-ignored; `.env.example` is committed).
2. In Vercel, **Add New → Project**, import the GitHub repo (framework preset: Next.js, defaults are fine).
3. Under **Settings → Environment Variables** add: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` (the production URL), `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, `OPENAI_API_KEY`, `OPENAI_MODEL`, and optionally `SPEAKING_DAILY_LIMIT` / `WRITING_DAILY_LIMIT`.
4. Deploy. `NEXT_PUBLIC_*` values are inlined at build time, so **redeploy** after changing them.
5. Put the production URL into Supabase **Site URL** / **Redirect URLs** (step 4 above), then run the acceptance flow in an incognito window: sign up → (confirm email) → log in → dashboard shows email + full name → reload / new tab stays logged in → log out → `/dashboard` redirects to `/login`.

## Speaking assessment

Ported from the examdee-ai scoring worker (O_PA / OQ_PA), as a single Next.js route. There's no queue and no S3.

**Flow (`/practice`):** the browser records with `MediaRecorder` and converts to 16 kHz mono 16-bit WAV in `src/lib/speaking/wav.ts` (OfflineAudioContext, max 120 s ≈ 3.8 MB, under Vercel's 4.5 MB body limit). It then POSTs to `/api/speaking/assess`. The route:
1. Requires a Supabase session (401 otherwise) and validates mode, prompt and a strict WAV header.
2. Enforces a per-user daily cap (`SPEAKING_DAILY_LIMIT`, default 30).
3. Runs Azure pronunciation assessment (`src/lib/speaking/azure.ts`) via Speech SDK continuous recognition on a push stream: `en-US`, HundredMark, Phoneme granularity, IPA, prosody on.
4. Aggregates all segments (`src/lib/speaking/scoring.ts`, pure, unit-tested with `npm test`).
5. In topic mode, scores content with GPT-5 mini (`src/lib/speaking/content.ts`, Responses API + structured output).
6. Saves the attempt to `speaking_attempts` (RLS: users read and insert only their own rows) and returns the result.

| Mode | Azure | Content (GPT-5 mini) | Overall |
| --- | --- | --- | --- |
| **Đọc to** (read aloud, scripted) | reference text + miscue; words aligned against the reference (LCS) → Omission / Insertion / Mispronunciation (< 60) | none | = pronunciation |
| **Nói theo chủ đề** (topic, unscripted) | no reference text | vocabulary, topic relevance, grammar (0–100, calibrated with examdee's 3 few-shot samples); content = 0.3·V + 0.4·T + 0.3·G; Vietnamese feedback, corrections, improved answer | examdee dynamic weights: content ≤ 30 → 0.8c + 0.2p, ≤ 50 → 0.7c + 0.3p, ≤ 70 → 0.5c + 0.5p, else 0.3c + 0.7p |

**Pronunciation score** (examdee formula, not Azure's PronScore): sort the sub-scores ascending and weight the weakest most.
- Read aloud: [accuracy, prosody, completeness, fluency] · [0.45, 0.35, 0.15, 0.05].
- Topic: [accuracy, prosody, fluency] · [0.5, 0.3, 0.2].

Fluency is duration-weighted across segments. Accuracy averages the word scores, with omitted words counting as 0.

**Results UI:**
- Score rings.
- Each word coloured by error type, with break markers. Click a word to see its IPA phonemes scored individually and to hear it (browser TTS).
- Transcript, plus the content feedback in topic mode.
- History on `/practice`, `/practice/[id]` and the dashboard.

**Azure setup:** create a *Speech* resource in the Azure portal (the free F0 tier works). Set `AZURE_SPEECH_KEY` to its Key 1 and `AZURE_SPEECH_REGION` to its region (e.g. `southeastasia`). Prosody assessment is only available for `en-US`.

**Vercel:** the route sets `maxDuration = 300`, which is the Hobby limit with Fluid compute (on by default for new projects). Keep Fluid compute enabled. Recording needs HTTPS, which Vercel provides, or `localhost`.

## Writing assessment

This is a port of examdee-ai's `writing_vstep` grader (VSTEP Writing). One GPT-5 mini call grades each essay.

**Flow (`/writing`):**
1. Pick **Task 1** (letter/email, 120–150 words, about 20 min) or **Task 2** (essay, 250–300 words, about 40 min), then choose a prompt or write your own.
2. Write in the editor. It shows a live word count and saves a draft in localStorage.
3. Submitting sends a POST to `/api/writing/assess`. The route requires a session, validates the input, enforces `WRITING_DAILY_LIMIT`, grades the essay, saves it to `writing_attempts` (RLS, own rows only) and returns the result.

**Grading** (`src/lib/writing/grade.ts`; the pure logic is in `src/lib/writing/scoring.ts`, unit-tested with `npm test`):
- **Rubric:** examdee's Vietnamese VSTEP rubric. Four criteria are each scored 0–10: Task fulfilment, Organization, Vocabulary and Grammar, weighted 25% each. Task 1 is calibrated for B1 communicative language; Task 2 for B2+/C1 academic style.
- **Overall:** the mean of the four criteria, rounded to 0.5 the same way examdee does (Python half-even: 6.25 becomes 6.0, 6.75 becomes 7.0). It is then mapped to a level: ≥ 8.5 Bậc 5 (C1), ≥ 6 Bậc 4 (B2), ≥ 4 Bậc 3 (B1), otherwise Dưới Bậc 3.
- **Caps enforced in code** (examdee only asked the model for these):
  - Off-topic or memorized answer: task fulfilment ≤ 2, the other criteria ≤ 4, overall ≤ 3.
  - Task 1 with no salutation and no sign-off: organization ≤ 5.
  - Task 2 with no body paragraphs: task fulfilment and organization ≤ 2, vocabulary and grammar ≤ 4.
- **Feedback:** Vietnamese strengths, weaknesses and suggestions for each criterion, quoting the learner's own words.
- **Errors:** each has a category (grammar, vocabulary, spelling or punctuation), a suggestion and an explanation. It is placed in the essay by exact match within its sentence, so the UI can highlight it inline.

