-- ============================================================
-- EduScript AI — Migration 008: Alter Documents Type Check
-- Run this in your Supabase SQL Editor to allow 'file_material'
-- ============================================================

-- 1. Drop existing type check constraint
alter table public.documents drop constraint if exists documents_type_check;

-- 2. Create updated check constraint supporting 'file_material'
alter table public.documents add constraint documents_type_check check (type in ('quiz', 'lesson_plan', 'summary', 'file_material'));
