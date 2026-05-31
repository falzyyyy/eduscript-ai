'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface Question {
  question: string
  options: string[]
  answer: string
  explanation?: string
}

interface QuizTakerProps {
  documentId: string
  title: string
  topic: string
  content: string
  onClose: () => void
}

export function QuizTaker({ documentId, title, topic, content, onClose }: QuizTakerProps) {
  let parsedQuestions: Question[] = []
  try {
    const parsedData = JSON.parse(content)
    parsedQuestions = parsedData.questions || []
  } catch (e) {
    console.error('Error parsing quiz questions:', e)
  }

  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const totalQuestions = parsedQuestions.length

  if (totalQuestions === 0) {
    return (
      <div className="p-6 text-center text-gray-400">
        Format kuis tidak valid atau tidak dapat dimuat.
        <Button onClick={onClose} className="mt-4 block mx-auto">Kembali</Button>
      </div>
    )
  }

  const currentQuestion = parsedQuestions[currentIdx]

  function handleSelectOption(optionLetter: string) {
    if (submitted) return
    setSelectedAnswers(prev => ({
      ...prev,
      [currentIdx]: optionLetter
    }))
  }

  async function handleSubmit() {
    // Verify all questions are answered
    if (Object.keys(selectedAnswers).length < totalQuestions) {
      setError('Harap jawab semua pertanyaan terlebih dahulu!')
      return
    }

    setError('')
    setLoading(true)

    // Calculate score
    let correctCount = 0
    parsedQuestions.forEach((q, idx) => {
      const selected = selectedAnswers[idx]
      // Compare only the first letter or exact match
      if (selected === q.answer) {
        correctCount++
      }
    })

    const finalScore = Math.round((correctCount / totalQuestions) * 100)
    setScore(finalScore)

    try {
      const res = await fetch('/api/quiz-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          score: finalScore,
          total_questions: totalQuestions,
          answers: selectedAnswers,
        }),
      })

      if (!res.ok) {
        throw new Error('Gagal menyimpan hasil kuis ke server')
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan hasil kuis.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
        <div>
          <span className="text-xs font-semibold bg-violet-500/15 text-violet-300 px-3 py-1 rounded-full border border-violet-500/20">Mode Ujian Kuis</span>
          <h2 className="text-xl font-bold text-white mt-2">{title}</h2>
          <p className="text-xs text-gray-400 mt-0.5">Topik: {topic}</p>
        </div>
        <Button onClick={onClose} variant="ghost" className="text-gray-400 hover:text-white">
          Tutup
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {!submitted ? (
        /* Quiz Active Session */
        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Soal {currentIdx + 1} dari {totalQuestions}</span>
            <span>{Math.round((Object.keys(selectedAnswers).length / totalQuestions) * 100)}% Terjawab</span>
          </div>
          <div className="w-full bg-white/[0.03] h-2 rounded-full overflow-hidden border border-white/[0.04]">
            <div 
              className="bg-gradient-to-r from-violet-600 to-indigo-600 h-full transition-all duration-300"
              style={{ width: `${((currentIdx + 1) / totalQuestions) * 100}%` }}
            />
          </div>

          {/* Question Box */}
          <div className="bg-[#0d1224]/80 border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-medium text-white leading-relaxed">
              <span className="text-violet-400 font-bold mr-2">{currentIdx + 1}.</span>
              {currentQuestion.question}
            </h3>

            {/* Options List */}
            <div className="grid grid-cols-1 gap-3 pt-2">
              {currentQuestion.options.map((opt, oIdx) => {
                // Determine option letter from first char (A, B, C, D)
                const letter = opt.trim().charAt(0).toUpperCase()
                const isSelected = selectedAnswers[currentIdx] === letter

                return (
                  <button
                    key={oIdx}
                    onClick={() => handleSelectOption(letter)}
                    className={`text-left p-4 rounded-xl border text-sm transition-all duration-200 flex items-start gap-3 ${
                      isSelected 
                        ? 'bg-violet-600/20 border-violet-500 text-white shadow-lg shadow-violet-500/10' 
                        : 'bg-white/[0.02] border-white/[0.06] text-gray-300 hover:bg-white/[0.04] hover:border-white/[0.1]'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold border shrink-0 ${
                      isSelected
                        ? 'bg-violet-500 text-white border-transparent'
                        : 'bg-white/[0.04] border-white/[0.1] text-gray-400'
                    }`}>
                      {letter}
                    </span>
                    <span className="pt-0.5">{opt}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4">
            <Button
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(prev => prev - 1)}
              className="bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] text-white"
            >
              Sebelumnya
            </Button>

            {currentIdx < totalQuestions - 1 ? (
              <Button
                onClick={() => setCurrentIdx(prev => prev + 1)}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
              >
                Selanjutnya
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25"
              >
                {loading ? 'Mengirim...' : 'Kirim Jawaban'}
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Quiz Submitted / Results Sheet */
        <div className="space-y-6">
          {/* Spectacular Score Card */}
          <div className="bg-gradient-to-br from-[#121833]/90 to-[#0b0f20]/90 border border-white/[0.06] rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl -z-10" />
            <span className="text-sm text-gray-400 font-medium">Hasil Nilai Ujian Kuis</span>
            <div className="my-4">
              <span className={`text-7xl font-extrabold tracking-tight ${score >= 70 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {score}
              </span>
              <span className="text-gray-500 text-2xl font-semibold">/100</span>
            </div>
            <p className="text-sm max-w-md mx-auto text-gray-300">
              {score >= 80 
                ? 'Luar biasa! Kamu memahami materi ini dengan sangat baik. Pertahankan!'
                : score >= 60
                  ? 'Bagus! Kamu sudah menguasai konsep dasar materi ini. Tingkatkan lagi!'
                  : 'Jangan menyerah! Pelajari kembali pembahasan di bawah ini untuk lebih memahaminya.'}
            </p>
            <Button onClick={onClose} className="mt-6 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white">
              Selesai & Kembali ke Materi
            </Button>
          </div>

          {/* Question Review Sheet */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white tracking-tight">Kunci Jawaban & Pembahasan</h3>
            {parsedQuestions.map((q, qIdx) => {
              const studentAns = selectedAnswers[qIdx]
              const correctAns = q.answer
              const isCorrect = studentAns === correctAns

              return (
                <div 
                  key={qIdx} 
                  className={`border rounded-2xl p-5 space-y-4 ${
                    isCorrect 
                      ? 'bg-emerald-500/[0.02] border-emerald-500/20' 
                      : 'bg-rose-500/[0.02] border-rose-500/20'
                  }`}
                >
                  {/* Question Title & Check/Cross */}
                  <div className="flex items-start gap-3 justify-between">
                    <h4 className="text-sm font-medium text-white leading-relaxed">
                      <span className="text-gray-400 font-bold mr-2">{qIdx + 1}.</span>
                      {q.question}
                    </h4>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${
                      isCorrect 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {isCorrect ? 'Benar' : 'Salah'}
                    </span>
                  </div>

                  {/* Review Options */}
                  <div className="grid grid-cols-1 gap-2 pl-4 border-l border-white/[0.04]">
                    {q.options.map((opt, oIdx) => {
                      const letter = opt.trim().charAt(0).toUpperCase()
                      const isStudentChoice = studentAns === letter
                      const isCorrectChoice = correctAns === letter

                      let optionStyle = 'text-gray-400 bg-transparent'
                      if (isCorrectChoice) {
                        optionStyle = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg'
                      } else if (isStudentChoice && !isCorrect) {
                        optionStyle = 'bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-lg'
                      }

                      return (
                        <div key={oIdx} className={`text-xs ${optionStyle} flex items-center gap-2`}>
                          <span className="font-semibold">{letter}.</span>
                          <span>{opt}</span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Pembahasan AI */}
                  {q.explanation && (
                    <div className="text-xs text-gray-400 bg-[#0d1224]/80 border border-white/[0.04] p-3 rounded-xl flex items-start gap-2.5">
                      <span className="text-violet-400 text-sm">💡</span>
                      <div>
                        <span className="font-semibold text-violet-300 block mb-0.5">Penjelasan AI:</span>
                        {q.explanation}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
