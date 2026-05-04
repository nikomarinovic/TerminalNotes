-- ═══════════════════════════════════════════════════════════════
-- TerminalNotes — Complete Supabase SQL Schema
-- Run this in: Supabase → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1. PROFILES
-- ─────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique,
  full_name   text,
  avatar_url  text,
  bio         text,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 1b. USERS (social profile alias table)
-- ─────────────────────────────────────────────
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  avatar_url  text,
  bio         text,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 2. NOTEBOOKS
-- ─────────────────────────────────────────────
create table if not exists public.notebooks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  is_public   boolean default false,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 3. ENTRIES (inside notebooks)
-- ─────────────────────────────────────────────
create table if not exists public.entries (
  id          uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null check (type in ('note', 'command', 'definition', 'snippet', 'concept')),
  title       text not null,
  content     text,
  code        text,
  tags        text[] default '{}',
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 4. COMMANDS LIBRARY
-- ─────────────────────────────────────────────
create table if not exists public.commands (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  command     text not null,
  description text,
  tags        text[] default '{}',
  is_public   boolean default false,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 5. IDEAS
-- ─────────────────────────────────────────────
create table if not exists public.ideas (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  title                text not null,
  description          text not null,
  problem              text,
  status               text not null default 'exploring'
                         check (status in ('exploring','planning','building','done','parked')),
  is_public            boolean default false,
  converted_to_project boolean default false,
  created_at           timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 6. PROJECTS
-- ─────────────────────────────────────────────
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  idea_id     uuid references public.ideas(id) on delete set null,
  title       text not null,
  description text,
  status      text not null default 'planning'
                check (status in ('planning','in-progress','paused','done')),
  github_repo text,
  is_public   boolean default false,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 7. MILESTONES (for project timelines)
-- ─────────────────────────────────────────────
create table if not exists public.milestones (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  label       text not null,
  date        date not null,
  notes       text,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 8. STARS (like/bookmark public content)
-- ─────────────────────────────────────────────
create table if not exists public.stars (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  item_type  text not null check (item_type in ('notebook','command','idea','project','feed_event')),
  item_id    uuid not null,
  created_at timestamptz default now(),
  unique(user_id, item_type, item_id)
);

-- ─────────────────────────────────────────────
-- 9. FOLLOWS
-- ─────────────────────────────────────────────
create table if not exists public.follows (
  follower_id  uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz default now(),
  primary key (follower_id, following_id)
);

-- ─────────────────────────────────────────────
-- 10. FEED EVENTS (public activity stream)
-- ─────────────────────────────────────────────
create table if not exists public.feed_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null check (type in ('new_notebook','new_idea','new_project','new_command')),
  content    jsonb default '{}'::jsonb,
  is_public  boolean default false,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 10b. POSTS (social feed)
-- ─────────────────────────────────────────────
create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  content    text not null check (char_length(content) > 0 and char_length(content) <= 500),
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

-- ─────────────────────────────────────────────
-- 11. INDEXES
-- ─────────────────────────────────────────────
create index if not exists notebooks_user_id_idx   on public.notebooks(user_id);
create index if not exists notebooks_public_idx    on public.notebooks(is_public) where is_public = true;
create index if not exists entries_notebook_id_idx on public.entries(notebook_id);
create index if not exists entries_user_id_idx     on public.entries(user_id);
create index if not exists commands_user_id_idx    on public.commands(user_id);
create index if not exists commands_public_idx     on public.commands(is_public) where is_public = true;
create index if not exists ideas_user_id_idx       on public.ideas(user_id);
create index if not exists projects_user_id_idx    on public.projects(user_id);
create index if not exists milestones_project_idx  on public.milestones(project_id);
create index if not exists stars_user_id_idx       on public.stars(user_id);
create index if not exists follows_follower_idx    on public.follows(follower_id);
create index if not exists follows_following_idx   on public.follows(following_id);
create index if not exists feed_public_idx         on public.feed_events(is_public, created_at desc) where is_public = true;
create index if not exists posts_created_idx       on public.posts(created_at desc);
create index if not exists posts_user_idx          on public.posts(user_id, created_at desc);
create index if not exists post_likes_post_idx     on public.post_likes(post_id);
create index if not exists post_comments_post_idx  on public.post_comments(post_id, created_at asc);

-- ─────────────────────────────────────────────
-- 12. ROW LEVEL SECURITY — enable on all tables
-- ─────────────────────────────────────────────
alter table public.profiles    enable row level security;
alter table public.notebooks   enable row level security;
alter table public.entries     enable row level security;
alter table public.commands    enable row level security;
alter table public.ideas       enable row level security;
alter table public.projects    enable row level security;
alter table public.milestones  enable row level security;
alter table public.stars       enable row level security;
alter table public.follows     enable row level security;
alter table public.feed_events enable row level security;
alter table public.users       enable row level security;
alter table public.posts       enable row level security;
alter table public.post_likes  enable row level security;
alter table public.post_comments enable row level security;

-- ─────────────────────────────────────────────
-- Drop existing policies (safe re-run)
-- ─────────────────────────────────────────────
drop policy if exists "Profiles are publicly viewable" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

drop policy if exists "Users table is publicly viewable" on public.users;
drop policy if exists "Users can insert own users row" on public.users;
drop policy if exists "Users can update own users row" on public.users;

drop policy if exists "Users view own + public notebooks" on public.notebooks;
drop policy if exists "Users insert own notebooks" on public.notebooks;
drop policy if exists "Users update own notebooks" on public.notebooks;
drop policy if exists "Users delete own notebooks" on public.notebooks;

drop policy if exists "Users view own entries" on public.entries;
drop policy if exists "Users insert own entries" on public.entries;
drop policy if exists "Users update own entries" on public.entries;
drop policy if exists "Users delete own entries" on public.entries;

drop policy if exists "Users view own + public commands" on public.commands;
drop policy if exists "Users insert own commands" on public.commands;
drop policy if exists "Users update own commands" on public.commands;
drop policy if exists "Users delete own commands" on public.commands;

drop policy if exists "Users view own + public ideas" on public.ideas;
drop policy if exists "Users insert own ideas" on public.ideas;
drop policy if exists "Users update own ideas" on public.ideas;
drop policy if exists "Users delete own ideas" on public.ideas;

drop policy if exists "Users view own + public projects" on public.projects;
drop policy if exists "Users insert own projects" on public.projects;
drop policy if exists "Users update own projects" on public.projects;
drop policy if exists "Users delete own projects" on public.projects;

drop policy if exists "Milestone owners can view" on public.milestones;
drop policy if exists "Users insert own milestones" on public.milestones;
drop policy if exists "Users delete own milestones" on public.milestones;

drop policy if exists "Users manage own stars" on public.stars;

drop policy if exists "Users manage own follows" on public.follows;
drop policy if exists "Follows are publicly viewable" on public.follows;

drop policy if exists "Public feed is viewable by all" on public.feed_events;
drop policy if exists "Users insert own feed events" on public.feed_events;
drop policy if exists "Users delete own feed events" on public.feed_events;

drop policy if exists "Posts are publicly readable" on public.posts;
drop policy if exists "Users can create own posts" on public.posts;
drop policy if exists "Users can delete own posts" on public.posts;

drop policy if exists "Post likes are publicly readable" on public.post_likes;
drop policy if exists "Users manage own post likes" on public.post_likes;

drop policy if exists "Post comments are publicly readable" on public.post_comments;
drop policy if exists "Users create own post comments" on public.post_comments;
drop policy if exists "Users delete own post comments" on public.post_comments;

-- ─────────────────────────────────────────────
-- 13. RLS POLICIES — profiles
-- ─────────────────────────────────────────────
create policy "Profiles are publicly viewable"
  on public.profiles for select using (true);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users table is publicly viewable"
  on public.users for select using (true);

create policy "Users can insert own users row"
  on public.users for insert with check (auth.uid() = id);

create policy "Users can update own users row"
  on public.users for update using (auth.uid() = id);

-- ─────────────────────────────────────────────
-- 14. RLS POLICIES — notebooks
-- ─────────────────────────────────────────────
create policy "Users view own + public notebooks"
  on public.notebooks for select
  using (auth.uid() = user_id or is_public = true);

create policy "Users insert own notebooks"
  on public.notebooks for insert with check (auth.uid() = user_id);

create policy "Users update own notebooks"
  on public.notebooks for update using (auth.uid() = user_id);

create policy "Users delete own notebooks"
  on public.notebooks for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 15. RLS POLICIES — entries
-- ─────────────────────────────────────────────
create policy "Users view own entries"
  on public.entries for select using (auth.uid() = user_id);

create policy "Users insert own entries"
  on public.entries for insert with check (auth.uid() = user_id);

create policy "Users update own entries"
  on public.entries for update using (auth.uid() = user_id);

create policy "Users delete own entries"
  on public.entries for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 16. RLS POLICIES — commands
-- ─────────────────────────────────────────────
create policy "Users view own + public commands"
  on public.commands for select
  using (auth.uid() = user_id or is_public = true);

create policy "Users insert own commands"
  on public.commands for insert with check (auth.uid() = user_id);

create policy "Users update own commands"
  on public.commands for update using (auth.uid() = user_id);

create policy "Users delete own commands"
  on public.commands for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 17. RLS POLICIES — ideas
-- ─────────────────────────────────────────────
create policy "Users view own + public ideas"
  on public.ideas for select
  using (auth.uid() = user_id or is_public = true);

create policy "Users insert own ideas"
  on public.ideas for insert with check (auth.uid() = user_id);

create policy "Users update own ideas"
  on public.ideas for update using (auth.uid() = user_id);

create policy "Users delete own ideas"
  on public.ideas for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 18. RLS POLICIES — projects
-- ─────────────────────────────────────────────
create policy "Users view own + public projects"
  on public.projects for select
  using (auth.uid() = user_id or is_public = true);

create policy "Users insert own projects"
  on public.projects for insert with check (auth.uid() = user_id);

create policy "Users update own projects"
  on public.projects for update using (auth.uid() = user_id);

create policy "Users delete own projects"
  on public.projects for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 19. RLS POLICIES — milestones
-- ─────────────────────────────────────────────
create policy "Milestone owners can view"
  on public.milestones for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = milestones.project_id
        and (p.user_id = auth.uid() or p.is_public = true)
    )
  );

create policy "Users insert own milestones"
  on public.milestones for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = milestones.project_id and p.user_id = auth.uid()
    )
  );

create policy "Users delete own milestones"
  on public.milestones for delete
  using (
    exists (
      select 1 from public.projects p
      where p.id = milestones.project_id and p.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- 20. RLS POLICIES — stars
-- ─────────────────────────────────────────────
create policy "Users manage own stars"
  on public.stars for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 21. RLS POLICIES — follows
-- ─────────────────────────────────────────────
create policy "Users manage own follows"
  on public.follows for all using (auth.uid() = follower_id);

create policy "Follows are publicly viewable"
  on public.follows for select using (true);

-- ─────────────────────────────────────────────
-- 22. RLS POLICIES — feed_events
-- ─────────────────────────────────────────────
create policy "Public feed is viewable by all"
  on public.feed_events for select
  using (is_public = true or auth.uid() = user_id);

create policy "Users insert own feed events"
  on public.feed_events for insert with check (auth.uid() = user_id);

create policy "Users delete own feed events"
  on public.feed_events for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 24. RLS POLICIES — social posts
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- 23. AUTO-CREATE PROFILE ON SIGNUP (trigger)
-- ─────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'user_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;

  insert into public.users (id, username, avatar_url, bio)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'user_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    ''
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────
-- DONE ✓
-- Tables: profiles, notebooks, entries, commands,
--         ideas, projects, milestones, stars,
--         follows, feed_events
-- ─────────────────────────────────────────────
