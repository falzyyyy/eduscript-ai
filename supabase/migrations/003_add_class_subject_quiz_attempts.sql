-- 1. Tambah kolom Jurusan (class_group) dan Mapel (subject) ke tabel documents
alter table public.documents add column if not exists class_group text;
alter table public.documents add column if not exists subject text;

-- 2. Buat tabel quiz_attempts untuk menyimpan hasil pengerjaan kuis siswa
create table if not exists public.quiz_attempts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  score integer not null,
  total_questions integer not null,
  answers jsonb not null,
  created_at timestamptz default now()
);

-- 3. Aktifkan Row Level Security (RLS) pada tabel quiz_attempts
alter table public.quiz_attempts enable row level security;

-- 4. Buat Kebijakan Keamanan (RLS Policies) untuk quiz_attempts
create policy "Siswa hanya bisa melihat riwayat kuis sendiri"
  on public.quiz_attempts for select using (auth.uid() = user_id);

create policy "Siswa bisa menyimpan hasil kuis sendiri"
  on public.quiz_attempts for insert with check (auth.uid() = user_id);
