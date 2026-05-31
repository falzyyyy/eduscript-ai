-- ============================================================
-- EduScript AI — Initial Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text check (role in ('admin', 'guru', 'siswa')) default 'guru',
  quota_limit integer default 50,
  quota_used integer default 0,
  created_at timestamptz default now()
);

-- 2. Documents table
create table if not exists public.documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  type text check (type in ('quiz', 'lesson_plan', 'summary')),
  title text not null,
  topic text not null,
  content text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- 3. Enable RLS
alter table public.profiles enable row level security;
alter table public.documents enable row level security;

-- 4. RLS Policies — Profiles
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Admin can view all profiles"
  on profiles for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admin can update all profiles"
  on profiles for update using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- 5. RLS Policies — Documents
create policy "Users can manage own documents"
  on documents for all using (auth.uid() = user_id);

create policy "Admin can view all documents"
  on documents for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- 6. Auto-create profile on signup (works for both email and Google OAuth)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'email'
    ),
    'guru'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
