-- ═══════════════════════════════════════════════════════════════
-- TerminalNotes — Supabase SQL Setup
-- ═══════════════════════════════════════════════════════════════

-- 1. NOTEBOOKS TABLE
create table if not exists public.notebooks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  created_at  timestamptz default now()
);

-- 2. ENTRIES TABLE
create table if not exists public.entries (
  id          uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null check (type in ('command', 'note', 'idea')),
  title       text not null,
  content     jsonb default '{}'::jsonb,
  tags        text[] default '{}',
  created_at  timestamptz default now()
);

-- 3. INDEXES
create index if not exists notebooks_user_id_idx on public.notebooks(user_id);
create index if not exists entries_notebook_id_idx on public.entries(notebook_id);
create index if not exists entries_user_id_idx on public.entries(user_id);

-- 4. ROW LEVEL SECURITY — enable
alter table public.notebooks enable row level security;
alter table public.entries   enable row level security;

-- 5. RLS POLICIES — notebooks
create policy "Users can view own notebooks"
  on public.notebooks for select
  using (auth.uid() = user_id);

create policy "Users can insert own notebooks"
  on public.notebooks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own notebooks"
  on public.notebooks for update
  using (auth.uid() = user_id);

create policy "Users can delete own notebooks"
  on public.notebooks for delete
  using (auth.uid() = user_id);

-- 6. RLS POLICIES — entries
create policy "Users can view own entries"
  on public.entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own entries"
  on public.entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own entries"
  on public.entries for update
  using (auth.uid() = user_id);

create policy "Users can delete own entries"
  on public.entries for delete
  using (auth.uid() = user_id);
