-- TerminalNotes social extensions
-- Run in Supabase SQL editor

create table if not exists public.notebook_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  notebook_id uuid not null references public.notebooks(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, notebook_id)
);

create table if not exists public.follow_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz default now(),
  unique (requester_id, target_id, status)
);

create index if not exists notebook_saves_user_idx on public.notebook_saves(user_id);
create index if not exists follow_requests_target_idx on public.follow_requests(target_id, status);

alter table public.notebook_saves enable row level security;
alter table public.follow_requests enable row level security;

drop policy if exists "Users manage own notebook saves" on public.notebook_saves;
create policy "Users manage own notebook saves"
  on public.notebook_saves
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can see own follow requests" on public.follow_requests;
create policy "Users can see own follow requests"
  on public.follow_requests
  for select
  using (auth.uid() = requester_id or auth.uid() = target_id);

drop policy if exists "Users can create follow requests" on public.follow_requests;
create policy "Users can create follow requests"
  on public.follow_requests
  for insert
  with check (auth.uid() = requester_id);

drop policy if exists "Targets can update follow requests" on public.follow_requests;
create policy "Targets can update follow requests"
  on public.follow_requests
  for update
  using (auth.uid() = target_id);

drop policy if exists "Users view entries for own/public notebooks" on public.entries;
create policy "Users view entries for own/public notebooks"
  on public.entries
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.notebooks n
      where n.id = entries.notebook_id
        and n.is_public = true
    )
  );

drop policy if exists "Users can update own posts" on public.posts;
create policy "Users can update own posts"
  on public.posts
  for update
  using (auth.uid() = user_id);
