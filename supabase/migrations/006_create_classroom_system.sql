-- ============================================================
-- EduScript AI — Migration 006: Create Classroom System
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Create classes table
create table if not exists public.classes (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  subject text not null,
  code text not null unique,
  teacher_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- 2. Create class_enrollments junction table
create table if not exists public.class_enrollments (
  student_id uuid references public.profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (student_id, class_id)
);

-- 3. Add class_id link column to documents table
alter table public.documents add column if not exists class_id uuid references public.classes(id) on delete set null;

-- 4. Enable Row Level Security (RLS)
alter table public.classes enable row level security;
alter table public.class_enrollments enable row level security;

-- 5. RLS Policies — Classes
create policy "Users can view authorized classes"
  on public.classes for select using (
    auth.uid() = teacher_id or 
    exists (select 1 from public.class_enrollments where student_id = auth.uid() and class_id = classes.id) or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Teachers can create classes"
  on public.classes for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('guru', 'admin'))
  );

create policy "Teachers can update own classes"
  on public.classes for update using (auth.uid() = teacher_id);

create policy "Teachers can delete own classes"
  on public.classes for delete using (auth.uid() = teacher_id);

-- 6. RLS Policies — Class Enrollments
create policy "Students can view own enrollment"
  on public.class_enrollments for select using (auth.uid() = student_id);

create policy "Teachers can view enrollments in their classes"
  on public.class_enrollments for select using (
    exists (select 1 from public.classes where id = class_id and teacher_id = auth.uid())
  );

create policy "Admin can view all enrollments"
  on public.class_enrollments for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Students can join classes"
  on public.class_enrollments for insert with check (auth.uid() = student_id);

-- 7. Additional RLS Policy — Enrolled students can read documents assigned to their class
create policy "Enrolled students can view class documents"
  on public.documents for select using (
    exists (
      select 1 from public.class_enrollments 
      where student_id = auth.uid() and class_id = documents.class_id
    )
  );
