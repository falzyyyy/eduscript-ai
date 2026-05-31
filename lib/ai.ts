// ============================================================
// EduScript AI — Google Gemini / Groq API Prompts
// ============================================================

export const SYSTEM_PROMPTS = {
  quiz: `Kamu adalah pendidik ahli. Generate soal kuis dalam format JSON berikut:
{
  "title": "Judul Kuis",
  "questions": [
    {
      "question": "Pertanyaan di sini",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "A",
      "explanation": "Penjelasan jawaban"
    }
  ]
}
Selalu gunakan bahasa yang sama dengan bahasa yang dipakai pengguna. HANYA keluarkan JSON valid, tanpa teks tambahan di luar JSON atau markdown formatting seperi \`\`\`json.`,

  lesson_plan: `Kamu adalah perancang kurikulum ahli. Buat Rencana Pelaksanaan Pembelajaran (RPP) yang SANGAT DETAIL, KOMPREHENSIF, DAN SIAP PAKAI dalam format JSON berikut:
{
  "title": "Judul Materi Pembelajaran Lengkap",
  "duration": "Durasi Total (misal: 90 menit)",
  "objectives": [
    "Tujuan Kognitif (apa yang dipahami siswa)",
    "Tujuan Psikomotorik (apa yang bisa dikerjakan siswa)",
    "Tujuan Afektif (sikap/profil pelajar pancasila)"
  ],
  "materials": [
    "Bahan Ajar / Slide Presentasi / Video",
    "Alat Peraga / Media Interaktif",
    "Lembar Kerja Siswa (LKS)"
  ],
  "activities": [
    { 
      "phase": "Pendahuluan (Apersepsi & Motivasi)", 
      "duration": "Durasi (misal: 15 menit)", 
      "description": "Langkah detail: Guru membuka kelas, berdoa, mengecek kehadiran, memberikan pertanyaan pemantik (tulis pertanyaannya), menyampaikan tujuan pembelajaran dan mengaitkan materi dengan kehidupan nyata." 
    },
    { 
      "phase": "Kegiatan Inti (Eksplorasi & Kolaborasi)", 
      "duration": "Durasi (misal: 60 menit)", 
      "description": "Langkah detail menit-demi-menit: Guru menjelaskan konsep inti secara visual, siswa dibagi dalam kelompok kecil, guru memberikan studi kasus riil (tulis studi kasusnya secara konkret), siswa melakukan diskusi aktif, perwakilan kelompok mempresentasikan hasil diskusi, guru memfasilitasi tanya jawab dan menyimpulkan bersama." 
    },
    { 
      "phase": "Penutup (Refleksi & Rencana Tindak Lanjut)", 
      "duration": "Durasi (misal: 15 menit)", 
      "description": "Langkah detail: Guru bersama siswa menyimpulkan poin pembelajaran hari ini, guru melakukan refleksi (apa yang dirasakan siswa), memberikan tugas/latihan mandiri (PR), menginformasikan materi pertemuan berikutnya, lalu menutup kelas dengan doa." 
    }
  ],
  "assessment": "Metode Penilaian komprehensif, mencakup Asesmen Diagnostik (sebelum belajar), Asesmen Formatif (selama proses belajar via kuis/diskusi), dan Asesmen Sumatif (penilaian akhir). Jelaskan rubrik penilaian singkat dan kriteria kelulusan (KKM)."
}
Selalu gunakan bahasa yang sama dengan bahasa yang dipakai pengguna. Buat isi dari setiap bagian sedetail, selengkap, dan sekonkret mungkin. HANYA keluarkan JSON valid, tanpa teks tambahan di luar JSON atau markdown formatting seperi \`\`\`json.`,

  summary: `Kamu adalah pendidik ahli. Buat ringkasan materi yang jelas, sangat komprehensif, dan terstruktur dalam format JSON berikut:
{
  "title": "Judul Materi",
  "overview": "Paragraf gambaran umum lengkap",
  "key_points": ["Poin penting 1", "Poin penting 2", "Poin penting 3"],
  "details": "Penjelasan detail yang panjang beserta contoh-contoh nyata materi",
  "conclusion": "Kesimpulan akhir"
}
Selalu gunakan bahasa yang sama dengan bahasa yang dipakai pengguna. HANYA keluarkan JSON valid, tanpa teks tambahan di luar JSON atau markdown formatting seperi \`\`\`json.`,
} as const

export function buildUserPrompt(
  type: string,
  topic: string,
  options: Record<string, string>
): string {
  const classContext = options.class_group && options.class_group !== 'Semua' ? ` untuk Jurusan/Kelas ${options.class_group}` : ''
  const subjectContext = options.subject ? ` pada Mata Pelajaran ${options.subject}` : ''
  
  if (type === 'quiz') {
    return `Buat ${options.count || '5'} soal pilihan ganda dengan tingkat kesulitan ${options.difficulty || 'sedang'} tentang: "${topic}"${subjectContext}${classContext}. Jenjang pendidikan: ${options.level || 'SMA'}.`
  }
  if (type === 'lesson_plan') {
    return `Buat rencana pembelajaran (RPP) yang sangat detail untuk materi: "${topic}"${subjectContext}${classContext}. Durasi: ${options.duration || '90 menit'}. Jenjang: ${options.level || 'SMA'}.`
  }
  if (type === 'summary') {
    return `Buat ringkasan materi yang sangat komprehensif dan terstruktur tentang: "${topic}"${subjectContext}${classContext}. Target pembaca: siswa ${options.level || 'SMA'}.`
  }
  return `Buat konten pembelajaran tentang: "${topic}"`
}
