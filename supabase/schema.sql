-- JAI V1 schema
-- Run this in the Supabase SQL editor for a fresh project.

-- 1. Profiles (extends auth.users; approved gates access to /app)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  email text not null,
  avatar_url text,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
-- New users start unapproved: an admin must flip `approved` to true
-- to satisfy the "only trusted/approved users can access JAI" requirement.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Chats
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chats_user_id_idx on public.chats (user_id, updated_at desc);

-- 3. Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  attachments jsonb,
  created_at timestamptz not null default now()
);

create index if not exists messages_chat_id_idx on public.messages (chat_id, created_at asc);

-- 4. Memories (only written when the user explicitly asks JAI to remember something)
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists memories_user_id_idx on public.memories (user_id, created_at desc);

-- 5. Response preferences (one row per user)
create table if not exists public.preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  personality text not null default 'friendly_direct'
    check (personality in ('friendly_direct', 'concise', 'detailed')),
  additional_instructions text
);

-- Row Level Security: every table is scoped to the owning user.
alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.memories enable row level security;
alter table public.preferences enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can manage their own chats"
  on public.chats for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage messages in their own chats"
  on public.messages for all
  using (exists (select 1 from public.chats where chats.id = messages.chat_id and chats.user_id = auth.uid()))
  with check (exists (select 1 from public.chats where chats.id = messages.chat_id and chats.user_id = auth.uid()));

create policy "Users can manage their own memories"
  on public.memories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage their own preferences"
  on public.preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
