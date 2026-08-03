# README-AUTH.md — optional accounts + sync (Supabase)

Anonymous play is the default forever. Sign-in exists ONLY to save/sync a
binder across browsers. With the env vars absent the auth layer does not
render and the app behaves exactly as before — that is the current state
until you complete the steps below.

## 1. Create the Supabase project (~5 min, free tier)

1. https://supabase.com → New project (any name, e.g. `aiticker`). Pick a
   region near your users; set any strong DB password (you won't need it
   day-to-day).
2. Wait for provisioning, then open **SQL Editor** and run:

```sql
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "own row read"  on public.profiles for select using (auth.uid() = user_id);
create policy "own row write" on public.profiles for insert with check (auth.uid() = user_id);
create policy "own row update" on public.profiles for update using (auth.uid() = user_id);
```

That single table is the entire backend. `state` holds the collector's
binder/XP/achievements/arena record — the collection and nothing else.

## 2. Enable the two sign-in methods (no passwords)

- **Auth → Sign In / Up → Email**: leave enabled; turn OFF "Confirm
  password" flows — we only use magic links (OTP), which work out of the
  box.
- **Auth → Sign In / Up → Google**: toggle on. You need a Google OAuth
  client (Google Cloud Console → Credentials → OAuth client ID → Web):
  - Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
  - Paste the client ID + secret into the Supabase Google provider form.
- **Auth → URL Configuration**: set Site URL to `https://aiticker.xyz`
  and add `https://aiticker.vercel.app` + `http://localhost:3000` to
  Additional Redirect URLs.

## 3. Wire the keys into Vercel

Project → Settings (**API** page in Supabase) → copy:

- `Project URL` → env var `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → env var `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Add both in Vercel (Project → Settings → Environment Variables, all
environments), and to `.env.local` for dev. Redeploy. The SAVE PROGRESS
entry, sign-in sheet, and binder nudge appear automatically; RLS means
the anon key is safe to ship in the client.

## How the sync behaves (implementation: lib/sync.ts, components/AuthMenu.tsx)

- localStorage stays the source of truth. On sign-in the local and cloud
  states MERGE (union of owned cards with max copies, earliest first-pull
  kept, max XP/streaks/counters, union of achievements) and both sides are
  written.
- After that, changes push cloud-ward on a 2s debounce with a tiny ✓ tick
  near the avatar; loads pull + merge with the same rules. Failures are
  silent, retried on the next change, and never block play or touch local
  state. Sign-out keeps local state.
- Unit tests for the merge: `pnpm test:unit`.
