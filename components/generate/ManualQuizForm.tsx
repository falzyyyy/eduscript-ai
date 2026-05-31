'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'

interface QuestionInput {
  type: 'mcq' | 'essay'
  question: string
  options: string[] // Size 4 for MCQ, empty for essay
  answer: string    // Option letter (A/B/C/D) for MCQ, Kunci jawaban for Essay
  explanation: string
}

export function ManualQuizForm() {
  const [topik, setTopik] = useState('')
  const [mapel, setMapel] = useState('Biologi')
  const [jurusan, setJurusan] = useState('IPA')
  const [jenjang, setJenjang] = useState('SMA')
  const [classesList, setClassesList] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('tidak_ada')

  const [questions, setQuestions] = useState<QuestionInput[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  // Active question being composed
  const [qType, setQType] = useState<'mcq' | 'essay'>('mcq')
  const [qText, setQText] = useState('')
  const [optA, setOptA] = useState('')
  const [optB, setOptB] = useState('')
  const [optC, setOptC] = useState('')
  const [optD, setOptD] = useState('')
  const [qAnswerMCQ, setQAnswerMCQ] = useState('A')
  const [qAnswerEssay, setQAnswerEssay] = useState('')
  const [qExplanation, setQExplanation] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('classes')
          .select('*')
          .eq('teacher_id', user.id)
          .then(({ data: cls }) => {
            if (cls) setClassesList(cls)
          })
      }
    })
  }, [])

  function handleAddQuestion() {
    if (!qText.trim()) {
      setError('Teks pertanyaan wajib diisi!')
      return
    }

    if (qType === 'mcq') {
      if (!optA.trim() || !optB.trim() || !optC.trim() || !optD.trim()) {
        setError('Semua pilihan opsi A, B, C, dan D wajib diisi!')
        return
      }
    } else {
      if (!qAnswerEssay.trim()) {
        setError('Kunci jawaban acuan guru wajib diisi untuk jenis Essay!')
        return
      }
    }

    const newQuestion: QuestionInput = {
      type: qType,
      question: qText,
      options: qType === 'mcq' ? [
        `A. ${optA.trim()}`,
        `B. ${optB.trim()}`,
        `C. ${optC.trim()}`,
        `D. ${optD.trim()}`
      ] : [],
      answer: qType === 'mcq' ? qAnswerMCQ : qAnswerEssay.trim(),
      explanation: qExplanation.trim()
    }

    setQuestions(prev => [...prev, newQuestion])
    
    // Reset composer inputs
    setQText('')
    setOptA('')
    setOptB('')
    setOptC('')
    setOptD('')
    setQAnswerEssay('')
    setQExplanation('')
    setError('')
  }

  function handleRemoveQuestion(idx: number) {
    setQuestions(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSaveQuiz() {
    if (!topik.trim()) {
      setError('Judul / Topik kuis wajib diisi!')
      return
    }
    if (questions.length === 0) {
      setError('Kuis harus memiliki minimal 1 soal!')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const title = `Kuis Manual: ${topik} (${mapel} - ${jurusan})`
      const contentPayload = JSON.stringify({
        title,
        questions
      })

      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'quiz',
          title,
          topic: topik,
          content: contentPayload,
          class_group: jurusan,
          subject: mapel,
          prerequisite_id: null,
          class_id: selectedClass === 'tidak_ada' ? null : selectedClass,
        }),
      })

      if (!res.ok) {
        throw new Error('Gagal menyimpan kuis manual.')
      }

      setSuccess('Kuis manual berhasil disimpan dan diterbitkan ke ruang kelas!')
      setQuestions([])
      setTopik('')
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Quiz Header Settings */}
      <div className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">1. Pengaturan Kuis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-300 text-sm mb-1.5 block">Judul / Topik Kuis</Label>
            <Input
              placeholder="Contoh: Kuis Harian Sel Hewan dan Tumbuhan"
              value={topik}
              onChange={(e) => setTopik(e.target.value)}
              className="h-11 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-600"
            />
          </div>
          <div>
            <Label className="text-gray-300 text-sm mb-1.5 block">Mata Pelajaran</Label>
            <Select value={mapel} onValueChange={(v) => v && setMapel(v)}>
              <SelectTrigger className="h-11 bg-white/[0.03] border-white/[0.08] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['Matematika', 'Fisika', 'Kimia', 'Biologi', 'Ekonomi', 'Geografi', 'Sosiologi', 'Sejarah', 'Bahasa Indonesia', 'Bahasa Inggris'].map((subj) => (
                  <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label className="text-gray-300 text-sm mb-1.5 block">Jurusan</Label>
            <Select value={jurusan} onValueChange={(v) => v && setJurusan(v)}>
              <SelectTrigger className="h-11 bg-white/[0.03] border-white/[0.08] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua</SelectItem>
                <SelectItem value="IPA">IPA</SelectItem>
                <SelectItem value="IPS">IPS</SelectItem>
                <SelectItem value="Bahasa">Bahasa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-300 text-sm mb-1.5 block">Jenjang</Label>
            <Select value={jenjang} onValueChange={(v) => v && setJenjang(v)}>
              <SelectTrigger className="h-11 bg-white/[0.03] border-white/[0.08] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SD">SD</SelectItem>
                <SelectItem value="SMP">SMP</SelectItem>
                <SelectItem value="SMA">SMA</SelectItem>
                <SelectItem value="Universitas">Universitas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-300 text-sm mb-1.5 block">Hubungkan ke Kelas</Label>
            <Select value={selectedClass} onValueChange={(v) => v && setSelectedClass(v)}>
              <SelectTrigger className="h-11 bg-white/[0.03] border-white/[0.08] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tidak_ada">Tidak Ada</SelectItem>
                {classesList.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 2. Composer Section */}
      <div className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">2. Tambah Pertanyaan</h3>
        
        {/* Toggle Tipe Soal */}
        <div className="flex gap-2 p-1 bg-white/[0.02] border border-white/[0.06] rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setQType('mcq')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              qType === 'mcq' 
                ? 'bg-violet-600 text-white shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Pilihan Ganda
          </button>
          <button
            type="button"
            onClick={() => setQType('essay')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              qType === 'essay' 
                ? 'bg-violet-600 text-white shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Essay / Uraian
          </button>
        </div>

        {/* Soal Text */}
        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">Pertanyaan</Label>
          <textarea
            placeholder="Ketik soal atau pertanyaan di sini..."
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            className="w-full h-24 bg-white/[0.03] border border-white/[0.08] text-white rounded-xl p-3 placeholder:text-gray-600 focus:outline-none focus:border-violet-500 text-sm transition-colors"
          />
        </div>

        {/* Options list for MCQ */}
        {qType === 'mcq' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Pilihan A</Label>
              <Input
                placeholder="Isi opsi pilihan A..."
                value={optA}
                onChange={(e) => setOptA(e.target.value)}
                className="h-10 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-600 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Pilihan B</Label>
              <Input
                placeholder="Isi opsi pilihan B..."
                value={optB}
                onChange={(e) => setOptB(e.target.value)}
                className="h-10 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-600 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Pilihan C</Label>
              <Input
                placeholder="Isi opsi pilihan C..."
                value={optC}
                onChange={(e) => setOptC(e.target.value)}
                className="h-10 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-600 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Pilihan D</Label>
              <Input
                placeholder="Isi opsi pilihan D..."
                value={optD}
                onChange={(e) => setOptD(e.target.value)}
                className="h-10 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-600 text-sm"
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-gray-300 text-sm">Opsi Jawaban Benar</Label>
              <Select value={qAnswerMCQ} onValueChange={(v) => v && setQAnswerMCQ(v)}>
                <SelectTrigger className="h-10 bg-white/[0.03] border-white/[0.08] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['A', 'B', 'C', 'D'].map((letter) => (
                    <SelectItem key={letter} value={letter}>Pilihan {letter}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          /* Essay key answer */
          <div className="space-y-1.5">
            <Label className="text-gray-300 text-sm">Kunci Jawaban Acuan (Untuk Evaluasi AI)</Label>
            <textarea
              placeholder="Tulis poin acuan atau jawaban ideal sebagai kriteria grading AI..."
              value={qAnswerEssay}
              onChange={(e) => setQAnswerEssay(e.target.value)}
              className="w-full h-20 bg-white/[0.03] border border-white/[0.08] text-white rounded-xl p-3 placeholder:text-gray-600 focus:outline-none focus:border-violet-500 text-sm transition-colors"
            />
          </div>
        )}

        {/* Explanation */}
        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">Penjelasan / Pembahasan Soal (Opsional)</Label>
          <textarea
            placeholder="Pembahasan pengerjaan soal..."
            value={qExplanation}
            onChange={(e) => setQExplanation(e.target.value)}
            className="w-full h-16 bg-white/[0.03] border border-white/[0.08] text-white rounded-xl p-3 placeholder:text-gray-600 focus:outline-none focus:border-violet-500 text-sm transition-colors"
          />
        </div>

        <Button
          type="button"
          onClick={handleAddQuestion}
          className="w-full h-11 bg-white/[0.05] border border-white/[0.1] hover:bg-white/[0.08] text-white text-xs font-semibold shadow-sm"
        >
          ➕ Simpan Soal ke Daftar Kuis
        </Button>
      </div>

      {/* 3. Question List Preview & Save */}
      {questions.length > 0 && (
        <div className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">3. Tinjau Daftar Soal ({questions.length})</h3>
            <Button
              onClick={handleSaveQuiz}
              disabled={loading}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-lg"
            >
              {loading ? 'Menyimpan...' : '🚀 Terbitkan Kuis Sekarang'}
            </Button>
          </div>

          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div key={idx} className="bg-white/[0.01] border border-white/[0.04] p-4 rounded-xl space-y-3 relative group">
                <button
                  onClick={() => handleRemoveQuestion(idx)}
                  className="absolute top-4 right-4 text-xs text-rose-400 hover:text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Hapus
                </button>
                <div className="flex items-start gap-2.5">
                  <span className="text-xs font-semibold bg-white/[0.04] text-violet-300 px-2 py-0.5 rounded-full uppercase">
                    {q.type}
                  </span>
                  <p className="text-sm font-medium text-white pr-10">{idx + 1}. {q.question}</p>
                </div>

                {q.type === 'mcq' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                    {q.options.map((opt, oIdx) => (
                      <span key={oIdx} className="text-xs text-gray-400">
                        {opt}
                      </span>
                    ))}
                  </div>
                )}

                <div className="pl-6 text-xs flex gap-4 text-gray-500">
                  <span>Kunci Jawaban: <strong className="text-emerald-400">{q.answer}</strong></span>
                  {q.explanation && <span>Pembahasan: <strong className="text-violet-400">{q.explanation}</strong></span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          {success}
        </div>
      )}
    </div>
  )
}
