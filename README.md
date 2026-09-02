# JAI — V1 foundation

This is the V1 UI + backend foundation for JAI: landing page, auth (Supabase,
approval-gated), the main workspace (sidebar, chat, composer), and the full
profile surface (Edit profile / Memory / Settings / Security / Response
preferences). The AI + clarification pipeline is intentionally **not**
connected yet — sending a message stores it and creates a chat, but there's
no assistant reply until that's wired up next.

## 1. Install

```bash
npm install
```

## 2. Set up Supabase

1. Create a free project at supabase.com.
2. In the SQL editor, run `supabase/schema.sql` — it creates `profiles`,
   `chats`, `messages`, `memories`, `preferences`, a trigger that creates a
   profile row on sign-up, and row-level security policies so every table is
   scoped to its owner.
3. Copy `.env.example` to `.env.local` and fill in your project URL and anon
   key (Project Settings → API).

## 3. Approve your own account

New accounts are created with `approved = false` (the "only trusted/approved
users can access JAI" requirement). After you sign up once, approve yourself
in the Supabase table editor:

```sql
update public.profiles set approved = true where email = 'you@example.com';
```

There's no admin UI for this in V1 — it's a manual flip in Supabase until you
decide how you want to manage approvals.

## 4. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`.

## What's implemented

- **Landing** (`/`) — name, one-line pitch, Start for Free. Nothing else.
- **Auth** (`/signup`, `/login`) — Supabase email/password, gated by
  `profiles.approved`.
- **Workspace** (`/app`) — collapsible sidebar (rail-only or expanded), new
  chat, title-only search, chat history with long-press/right-click delete,
  the centered "What's on your mind?" composer with attach + voice + send.
- **Profile** — avatar/name/email, Edit profile (photo + name, email
  locked), Memory (list + per-item delete + clear all — populated only by
  what a future pipeline explicitly writes here), Settings (Email, Security,
  Delete all chats, Response preferences, Sign out).
- Chat titles are generated locally from the first message — no extra AI
  call.

## Fonts

The type stack uses the OS system font (San Francisco / Segoe UI / Roboto)
so the build has no dependency on fetching fonts at build time. If you want
Inter specifically, add it back with `next/font/google` in
`src/app/layout.tsx` once you have network access in your build environment,
or self-host the font files.

## What's deliberately not here yet

No AI provider calls, no clarification-question flow, no web search, no
context-injection logic. Those all hang off the same `handleSend` function in
`src/components/Workspace.tsx` — that's the integration point for the next
pass.
