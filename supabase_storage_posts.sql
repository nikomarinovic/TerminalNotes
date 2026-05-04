-- Supabase Storage setup for post images
-- Run in Supabase SQL editor.

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public can read post images" on storage.objects;
drop policy if exists "Users can upload own post images" on storage.objects;
drop policy if exists "Users can update own post images" on storage.objects;
drop policy if exists "Users can delete own post images" on storage.objects;

create policy "Public can read post images"
on storage.objects for select
using (bucket_id = 'post-images');

create policy "Users can upload own post images"
on storage.objects for insert
with check (
  bucket_id = 'post-images'
  and auth.uid() is not null
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "Users can update own post images"
on storage.objects for update
using (
  bucket_id = 'post-images'
  and auth.uid() is not null
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "Users can delete own post images"
on storage.objects for delete
using (
  bucket_id = 'post-images'
  and auth.uid() is not null
  and split_part(name, '/', 1) = auth.uid()::text
);
