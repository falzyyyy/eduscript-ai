-- 1. Hapus kebijakan SELECT lama pada quiz_attempts
drop policy if exists "Siswa hanya bisa melihat riwayat kuis sendiri" on public.quiz_attempts;

-- 2. Buat kebijakan SELECT baru yang mengizinkan:
--    a. Siswa melihat riwayat kuisnya sendiri
--    b. Guru dan Admin melihat riwayat kuis seluruh siswa untuk evaluasi
create policy "Siswa melihat milik sendiri, Guru/Admin melihat semua"
  on public.quiz_attempts for select
  using (
    auth.uid() = user_id OR
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'guru')
    )
  );
