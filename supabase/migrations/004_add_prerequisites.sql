-- 1. Tambah kolom prerequisite_id sebagai relasi ke dokumen itu sendiri (opsional)
alter table public.documents add column if not exists prerequisite_id uuid references public.documents(id) on delete set null;
