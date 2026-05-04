-- TerminalNotes: fix private account + avatar uploads
-- Run this in Supabase SQL editor.

-- 1) Profiles: add privacy flag
alter table if exists public.profiles
  add column if not exists is_private boolean not null default false;

-- 2) Social tables needed by private-account flow
create table if not exists public.follow_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz default now()
);

create unique index if not exists follow_requests_unique_open_idx
  on public.follow_requests (requester_id, target_id, status);

alter table public.follow_requests enable row level security;

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

-- 3) Avatar storage bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 4) Storage policies for avatar upload/read/manage
drop policy if exists "Avatar images are public" on storage.objects;
create policy "Avatar images are public"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "Users upload own avatar" on storage.objects;
create policy "Users upload own avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "Users update own avatar" on storage.objects;
create policy "Users update own avatar"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "Users delete own avatar" on storage.objects;
create policy "Users delete own avatar"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  and auth.uid()::text = split_part(name, '/', 1)
);
