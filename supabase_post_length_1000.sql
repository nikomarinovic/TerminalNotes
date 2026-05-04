-- Increase social post content limit from 500 to 1000 chars
-- Run in Supabase SQL editor

alter table if exists public.posts
  drop constraint if exists posts_content_check;

alter table if exists public.posts
  add constraint posts_content_check
  check (char_length(content) > 0 and char_length(content) <= 1000);
