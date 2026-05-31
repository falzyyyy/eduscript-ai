-- ============================================================
-- EduScript AI - Update Default Role to 'siswa'
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Update the default value for the role column in the profiles table
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'siswa';

-- 2. Update the trigger function to insert 'siswa' as the default role for OAuth / Auth users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'email'
    ),
    'siswa' -- Changed from 'guru' to 'siswa'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
