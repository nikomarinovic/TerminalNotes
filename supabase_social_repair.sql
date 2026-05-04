-- TerminalNotes: Social feed repair-only migration
-- Safe to run multiple times.

-- 1) Core social tables
create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  content    text not null check (char_length(content) > 0 and char_length(content) <= 1000),
  image_url  text,
  created_at timestamptz default now()
);

create table if not exists public.post_likes (
  user_id    uuid not null references auth.users(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);

create table if not exists public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  content    text not null check (char_length(content) > 0 and char_length(content) <= 500),
  created_at timestamptz default now()
);

-- 2) Helpful indexes
create index if not exists posts_created_idx       on public.posts(created_at desc);
create index if not exists posts_user_idx          on public.posts(user_id, created_at desc);
create index if not exists post_likes_post_idx     on public.post_likes(post_id);
create index if not exists post_comments_post_idx  on public.post_comments(post_id, created_at asc);

-- 3) RLS on
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;

-- 4) Drop policies (safe re-run)
drop policy if exists "Posts are publicly readable" on public.posts;
drop policy if exists "Users can create own posts" on public.posts;
drop policy if exists "Users can delete own posts" on public.posts;

drop policy if exists "Post likes are publicly readable" on public.post_likes;
drop policy if exists "Users manage own post likes" on public.post_likes;

drop policy if exists "Post comments are publicly readable" on public.post_comments;
drop policy if exists "Users create own post comments" on public.post_comments;
drop policy if exists "Users delete own post comments" on public.post_comments;

-- 5) Recreate policies
create policy "Posts are publicly readable"
  on public.posts for select using (true);

create policy "Users can create own posts"
  on public.posts for insert with check (auth.uid() = user_id);

create policy "Users can delete own posts"
  on public.posts for delete using (auth.uid() = user_id);

create policy "Post likes are publicly readable"
  on public.post_likes for select using (true);

create policy "Users manage own post likes"
  on public.post_likes for all using (auth.uid() = user_id);

create policy "Post comments are publicly readable"
  on public.post_comments for select using (true);

create policy "Users create own post comments"
  on public.post_comments for insert with check (auth.uid() = user_id);

create policy "Users delete own post comments"
  on public.post_comments for delete using (auth.uid() = user_id);
