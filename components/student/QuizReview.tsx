'use client'
import { Button } from '@/components/ui/button'

interface QuizQuestion {
  question: string
  options: string[]
  answer: string
  explanation?: string
}

interface QuizAttempt {
  id: string
  document_id: string
  score: number
  total_questions: number
  created_at: string
  answers: Record<string, string>
  documents?: {
    title: string
    topic: string
    content: string
  }
}

interface QuizReviewProps {
  attempt: QuizAttempt
  onClose: () => void
}

export function QuizReview({ attempt, onClose }: QuizReviewProps) {
  const doc = attempt.documents
  let parsedQuestions: QuizQuestion[] = []

  if (doc?.content) {
    try {
      const parsedData = JSON.parse(doc.content)
      parsedQuestions = parsedData.questions || []
    } catch (e) {
      console.error('Error parsing quiz questions:', e)
    }
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="space-y-6 print-container">
      {/* Dynamic CSS to handle print mode seamlessly */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide everything except the print-container */
          body * {
            visibility: hidden;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-badge-correct {
            background-color: #d1fae5 !important;
            color: #065f46 !important;
            border: 1px solid #10b981 !important;
          }
          .print-badge-wrong {
            background-color: #fee2e2 !important;
            color: #991b1b !important;
            border: 1px solid #ef4444 !important;
          }
          .print-box-correct {
            border: 2px solid #10b981 !important;
            background-color: #f0fdf4 !important;
          }
          .print-box-wrong {
            border: 2px solid #ef4444 !important;
            background-color: #fef2f2 !important;
          }
          .print-explanation {
            border-left: 4px solid #8b5cf6 !important;
            background-color: #f5f3ff !important;
            color: #3730a3 !important;
          }
        }
      `}} />

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] no-print">
        <div>
          <span className="text-xs font-semibold bg-violet-500/15 text-violet-300 px-3 py-1 rounded-full border border-violet-500/20">Evaluasi Hasil Ujian</span>
          <h2 className="text-xl font-bold text-white mt-2">{doc?.title || 'Kuis Terhapus'}</h2>
          <p className="text-xs text-gray-400 mt-0.5">Topik: {doc?.topic || 'N/A'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handlePrint} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium">
            🖨️ Cetak / Simpan PDF
          </Button>
          <Button onClick={onClose} variant="ghost" className="text-gray-400 hover:text-white">
            Kembali
          </Button>
        </div>
      </div>

      {/* Printable Only Header */}
      <div className="hidden print:block border-b-2 border-gray-300 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-black">EduScript Student Portal — Lembar Evaluasi Kuis</h1>
        <p className="text-sm text-gray-600 mt-1">Kuis: {doc?.title}</p>
        <p className="text-sm text-gray-600">Topik: {doc?.topic}</p>
        <p className="text-sm text-gray-600">Tanggal Ujian: {new Date(attempt.created_at).toLocaleString('id-ID', {
          day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
        })}</p>
      </div>

      {/* Spectacular Score Card */}
      <div className="bg-gradient-to-br from-[#121833]/90 to-[#0b0f20]/90 border border-white/[0.06] rounded-2xl p-6 text-center shadow-lg relative overflow-hidden print:bg-white print:border-gray-200 print:text-black">
        <span className="text-sm text-gray-400 print:text-gray-600 font-medium">Nilai Akhir Evaluasi</span>
        <div className="my-3">
          <span className={`text-6xl font-extrabold tracking-tight ${attempt.score >= 70 ? 'text-emerald-400 print:text-emerald-600' : 'text-rose-400 print:text-rose-600'}`}>
            {attempt.score}
          </span>
          <span className="text-gray-500 print:text-gray-400 text-xl font-semibold">/100</span>
        </div>
        <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border ${
          attempt.score >= 70
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 print:bg-emerald-500/10 print:text-emerald-600'
            : 'bg-rose-500/10 text-rose-400 border-rose-500/20 print:bg-rose-500/10 print:text-rose-600'
        }`}>
          {attempt.score >= 70 ? '✓ LULUS PRASYARAT' : '✗ BELUM LULUS'}
        </span>
      </div>

      {/* Questions Review */}
      <div className="space-y-5">
        <h3 className="text-lg font-bold text-white print:text-black tracking-tight border-b border-white/[0.04] pb-2">Detail Soal & Jawaban</h3>
        
        {parsedQuestions.map((q, qIdx) => {
          const studentAns = attempt.answers[qIdx.toString()] || attempt.answers[qIdx]
          const correctAns = q.answer
          const isCorrect = studentAns === correctAns

          return (
            <div 
              key={qIdx} 
              className={`border rounded-2xl p-5 space-y-4 print:border-gray-300 print:break-inside-avoid ${
                isCorrect 
                  ? 'bg-emerald-500/[0.02] border-emerald-500/20 print:bg-green-50 print:border-green-300' 
                  : 'bg-rose-500/[0.02] border-rose-500/20 print:bg-red-50 print:border-red-300'
              }`}
            >
              {/* Question Text */}
              <div className="flex items-start gap-3 justify-between">
                <h4 className="text-sm font-medium text-white print:text-black leading-relaxed">
                  <span className="text-gray-400 print:text-gray-600 font-bold mr-2">{qIdx + 1}.</span>
                  {q.question}
                </h4>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                  isCorrect 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 print:bg-green-100 print:text-green-800' 
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 print:bg-red-100 print:text-red-800'
                }`}>
                  {isCorrect ? 'BENAR' : 'SALAH'}
                </span>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 gap-2 pl-4 border-l border-white/[0.04] print:border-gray-200">
                {q.options.map((opt, oIdx) => {
                  const letter = opt.trim().charAt(0).toUpperCase()
                  const isStudentChoice = studentAns === letter
                  const isCorrectChoice = correctAns === letter

                  let optionStyle = 'text-gray-400 print:text-gray-600 bg-transparent'
                  if (isCorrectChoice) {
                    optionStyle = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg print:bg-green-100 print:text-green-800 print:border-green-300'
                  } else if (isStudentChoice && !isCorrect) {
                    optionStyle = 'bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-lg print:bg-red-100 print:text-red-800 print:border-red-300'
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
                <div className="text-xs text-gray-400 print:text-gray-700 bg-[#0d1224]/80 border border-white/[0.04] p-3 rounded-xl flex items-start gap-2.5 print:bg-purple-50 print:border-purple-300 print:text-purple-900">
                  <span className="text-violet-400 text-sm">💡</span>
                  <div>
                    <span className="font-semibold text-violet-300 print:text-purple-800 block mb-0.5">Pembahasan AI:</span>
                    {q.explanation}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="text-center pt-4 no-print">
        <Button onClick={onClose} className="bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white">
          Tutup Evaluasi
        </Button>
      </div>
    </div>
  )
}
