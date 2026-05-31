-- ============================================================
-- EduScript AI — Migration 007: Create Classroom Storage Bucket
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Insert bucket into storage.buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'classroom-materials',
  'classroom-materials',
  true,
  52428800, -- 50 MB limit
  '{"application/pdf", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/*", "text/plain"}'
)
on conflict (id) do nothing;

-- 2. Enable objects security policies (if not already handled globally by Supabase)
-- Drop existing policies if any to prevent duplicate errors
drop policy if exists "Allow public read access to materials" on storage.objects;
drop policy if exists "Allow teachers and admins to upload materials" on storage.objects;
drop policy if exists "Allow teachers and admins to update own materials" on storage.objects;
drop policy if exists "Allow teachers and admins to delete own materials" on storage.objects;

-- 3. Create policies for public read access
create policy "Allow public read access to materials"
on storage.objects for select
using (bucket_id = 'classroom-materials');

-- 4. Create policies for uploading
create policy "Allow teachers and admins to upload materials"
on storage.objects for insert
with check (
  bucket_id = 'classroom-materials'
  and auth.role() = 'authenticated'
  and exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('guru', 'admin')
  )
);

-- 5. Create policies for updating
create policy "Allow teachers and admins to update own materials"
on storage.objects for update
using (
  bucket_id = 'classroom-materials'
  and auth.role() = 'authenticated'
  and exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('guru', 'admin')
  )
);

-- 6. Create policies for deleting
create policy "Allow teachers and admins to delete own materials"
on storage.objects for delete
using (
  bucket_id = 'classroom-materials'
  and auth.role() = 'authenticated'
  and exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('guru', 'admin')
  )
);
