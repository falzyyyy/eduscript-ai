'use client'
import { useState, useEffect } from 'react'
import { useDocuments } from '@/hooks/useDocuments'
import { useUser } from '@/hooks/useUser'
import { ExportButton } from '@/components/shared/ExportButton'
import { QuizTaker } from '@/components/student/QuizTaker'
import { QuizReview } from '@/components/student/QuizReview'
import { Button } from '@/components/ui/button'
import type { DocumentType, QuizOutput, LessonPlanOutput, SummaryOutput } from '@/types'

const typeLabels: Record<string, string> = {
  quiz: 'Kuis',
  lesson_plan: 'RPP',
  summary: 'Ringkasan',
}

const typeColors: Record<string, string> = {
  quiz: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  lesson_plan: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  summary: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
}

interface QuizAttempt {
  id: string
  document_id: string
  score: number
  total_questions: number
  created_at: string
  answers: Record<string, string>
  profiles?: {
    full_name: string | null
  }
  documents?: {
    title: string
    topic: string
    content: string
  }
}

export default function DocumentsPage() {
  const { profile } = useUser()
  const [filter, setFilter] = useState<DocumentType | undefined>(undefined)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  // Class & Subject filters
  const [classFilter, setClassFilter] = useState<string>('Semua')
  const [subjectFilter, setSubjectFilter] = useState<string>('Semua')
  
  // Tab toggle (materials list or attempts history)
  const [activeTab, setActiveTab] = useState<'materials' | 'history'>('materials')
  
  // Student active quiz session
  const [activeQuiz, setActiveQuiz] = useState<{ id: string; title: string; topic: string; content: string } | null>(null)

  // Student/Teacher active review session
  const [reviewingAttempt, setReviewingAttempt] = useState<QuizAttempt | null>(null)
  
  // Quiz attempts history (contains name profiles for Gurus, and personal records for Students)
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [attemptsLoading, setAttemptsLoading] = useState(false)

  const { documents, loading: docsLoading, deleteDocument } = useDocuments(filter)
  const isSiswa = profile?.role === 'siswa'

  // Fetch quiz attempts history on load
  useEffect(() => {
    if (profile) {
      fetchAttempts()
    }
  }, [profile, activeTab])

  async function fetchAttempts() {
    setAttemptsLoading(true)
    try {
      const res = await fetch('/api/quiz-attempts')
      if (res.ok) {
        const data = await res.json()
        setAttempts(data)
      }
    } catch (e) {
      console.error('Failed to fetch quiz attempts:', e)
    } finally {
      setAttemptsLoading(false)
    }
  }

  // Determine if a document is unlocked
  function isDocUnlocked(doc: any) {
    if (!isSiswa) return true
    if (!doc.prerequisite_id) return true
    
    // Unlocked if there is a completed attempt for the prerequisite document with score >= 70
    return attempts.some(
      (att) => att.document_id === doc.prerequisite_id && att.score >= 70
    )
  }

  // Filter documents based on class and subject tags
  const filteredDocs = documents.filter((doc) => {
    const docClass = doc.class_group || 'Semua'
    const docSubject = doc.subject || 'Semua'

    const matchClass = classFilter === 'Semua' || docClass === 'Semua' || docClass === classFilter
    const matchSubject = subjectFilter === 'Semua' || docSubject === 'Semua' || docSubject === subjectFilter

    return matchClass && matchSubject
  })

  // Render a student-friendly parsed document content instead of raw JSON <pre>
  function renderDocumentPreview(doc: any) {
    let parsed: any = null
    try {
      parsed = JSON.parse(doc.content)
    } catch {
      // Stream is raw string or partial JSON
    }

    if (!parsed) {
      return (
        <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono bg-white/[0.01] rounded-lg p-4 max-h-96 overflow-y-auto">
          {doc.content}
        </pre>
      )
    }

    if (doc.type === 'summary') {
      const summary = parsed as SummaryOutput
      return (
        <div className="space-y-4 pt-2 text-sm text-gray-300">
          <div className="border-b border-white/[0.04] pb-3">
            <h3 className="font-semibold text-white text-base">{summary.title}</h3>
            <p className="mt-1 text-gray-400 leading-relaxed">{summary.overview}</p>
          </div>
          {summary.key_points && summary.key_points.length > 0 && (
            <div>
              <h4 className="font-semibold text-violet-400 mb-1.5">Poin Penting:</h4>
              <ul className="list-decimal list-inside space-y-1 text-gray-300 pl-1">
                {summary.key_points.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h4 className="font-semibold text-violet-400 mb-1">Penjelasan Detail:</h4>
            <p className="whitespace-pre-wrap leading-relaxed">{summary.details}</p>
          </div>
          {summary.conclusion && (
            <div className="bg-violet-500/5 border border-violet-500/10 rounded-xl p-3.5 mt-2">
              <h4 className="font-semibold text-violet-400 mb-0.5">Kesimpulan:</h4>
              <p className="text-gray-300 italic">{summary.conclusion}</p>
            </div>
          )}
        </div>
      )
    }

    if (doc.type === 'lesson_plan') {
      const rpp = parsed as LessonPlanOutput
      return (
        <div className="space-y-4 pt-2 text-sm text-gray-300">
          <div className="border-b border-white/[0.04] pb-3 flex justify-between items-start gap-4">
            <div>
              <h3 className="font-semibold text-white text-base">{rpp.title}</h3>
              <p className="text-xs text-gray-400 mt-1">Durasi: {rpp.duration}</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs px-2.5 py-1 rounded-lg">
              {rpp.assessment ? 'Asesmen Aktif' : 'RPP Standar'}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-blue-400 mb-1.5">Tujuan Pembelajaran:</h4>
            <ul className="list-disc list-inside space-y-1 pl-1">
              {rpp.objectives?.map((obj, i) => (
                <li key={i}>{obj}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-blue-400 mb-1">Media & Bahan Ajar:</h4>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {rpp.materials?.map((mat, i) => (
                <span key={i} className="text-xs bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded-full text-gray-400">
                  {mat}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-blue-400">Rencana Kegiatan Pembelajaran:</h4>
            {rpp.activities?.map((act, i) => (
              <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full">{act.phase}</span>
                  <span className="text-xs text-gray-500">{act.duration}</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed pt-1">{act.description}</p>
              </div>
            ))}
          </div>
          {rpp.assessment && (
            <div className="bg-[#0d1224]/80 border border-white/[0.04] rounded-xl p-3.5 mt-2 space-y-1">
              <h4 className="font-semibold text-blue-400 text-xs">Metode Penilaian & Rubrik Lengkap:</h4>
              <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">{rpp.assessment}</p>
            </div>
          )}
        </div>
      )
    }

    if (doc.type === 'quiz') {
      const quiz = parsed as QuizOutput
      return (
        <div className="space-y-6 pt-2 text-sm text-gray-300">
          <div className="border-b border-white/[0.04] pb-3">
            <h3 className="font-semibold text-white text-base">{quiz.title}</h3>
            <p className="text-xs text-gray-400 mt-1">Jumlah Soal: {quiz.questions?.length || 0} Butir</p>
          </div>
          <div className="space-y-4">
            {quiz.questions?.map((q, idx) => (
              <div key={idx} className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <span className="text-xs font-bold bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-lg shrink-0 mt-0.5">
                    Soal {idx + 1}
                  </span>
                  <p className="text-white font-medium leading-relaxed">{q.question}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-2">
                  {q.options?.map((opt, i) => {
                    const optLetter = opt.charAt(0).toUpperCase()
                    const isCorrect = optLetter === q.answer.toUpperCase() || opt.toLowerCase().startsWith(q.answer.toLowerCase())
                    return (
                      <div 
                        key={i} 
                        className={`text-xs p-2.5 rounded-lg border transition-all ${
                          isCorrect 
                            ? 'bg-green-500/10 border-green-500/30 text-green-400 font-medium' 
                            : 'bg-white/[0.01] border-white/[0.04] text-gray-400'
                        }`}
                      >
                        <span className="mr-1">{isCorrect ? '✓' : '•'}</span> {opt}
                      </div>
                    )
                  })}
                </div>
                {q.explanation && (
                  <div className="bg-white/[0.03] border-l-2 border-violet-500 rounded-r-xl p-3 text-xs text-gray-400 leading-relaxed pl-3.5">
                    <span className="font-semibold text-violet-400 block mb-0.5">Penjelasan Kunci Jawaban:</span>
                    {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )
    }

    // Default raw fallback
    return (
      <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono bg-white/[0.01] rounded-lg p-4 max-h-96 overflow-y-auto">
        {doc.content}
      </pre>
    )
  }

  // Active quiz pengerjaan view
  if (activeQuiz) {
    return (
      <div className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-6">
        <QuizTaker
          documentId={activeQuiz.id}
          title={activeQuiz.title}
          topic={activeQuiz.topic}
          content={activeQuiz.content}
          onClose={() => {
            setActiveQuiz(null)
            fetchAttempts() // Reload attempts list
            setActiveTab('history') // Direct student to history to see their new score
          }}
        />
      </div>
    )
  }

  // Active review evaluation view
  if (reviewingAttempt) {
    return (
      <div className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-6">
        <QuizReview
          attempt={reviewingAttempt}
          onClose={() => setReviewingAttempt(null)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Title & Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {isSiswa ? 'Ruang Belajar Siswa' : 'Dokumen Saya'}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {isSiswa 
              ? 'Kerjakan kuis, akses rencana pembelajaran (RPP), dan baca ringkasan materi untuk mempermudah belajarmu' 
              : 'Kelola dokumen pembelajaran RPP, Ringkasan, dan evaluasi riwayat nilai pengerjaan kuis siswa'}
          </p>
        </div>

        {/* Symmetrical Tab Toggle for Siswa and Guru/Admin */}
        <div className="flex bg-white/[0.02] border border-white/[0.06] rounded-xl p-1 shrink-0 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('materials')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'materials' 
                ? 'bg-violet-600 text-white shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {isSiswa ? 'Materi Belajar' : 'Dokumen Saya'}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'history' 
                ? 'bg-violet-600 text-white shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {isSiswa ? 'Riwayat Kuis Anda' : 'Riwayat Nilai Siswa'}
          </button>
        </div>
      </div>

      {activeTab === 'materials' ? (
        <>
          {/* Filters Dashboard */}
          <div className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Type Category Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: undefined, label: 'Semua Tipe' },
                  { value: 'quiz' as DocumentType, label: 'Kuis' },
                  { value: 'lesson_plan' as DocumentType, label: 'RPP' },
                  { value: 'summary' as DocumentType, label: 'Ringkasan' },
                ].map((f) => (
                  <button
                    key={f.label}
                    onClick={() => setFilter(f.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all ${
                      filter === f.value
                        ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20'
                        : 'text-gray-400 hover:text-white bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Advanced Class & Subject Filters */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Jurusan:</span>
                  <select 
                    value={classFilter} 
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="text-xs bg-white/[0.02] border border-white/[0.06] rounded-xl px-2.5 py-1.5 text-gray-300 focus:outline-none focus:border-violet-500"
                  >
                    <option value="Semua" className="bg-[#0d1224]">Semua Jurusan</option>
                    <option value="IPA" className="bg-[#0d1224]">IPA</option>
                    <option value="IPS" className="bg-[#0d1224]">IPS</option>
                    <option value="Bahasa" className="bg-[#0d1224]">Bahasa</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Mata Pelajaran:</span>
                  <select 
                    value={subjectFilter} 
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    className="text-xs bg-white/[0.02] border border-white/[0.06] rounded-xl px-2.5 py-1.5 text-gray-300 focus:outline-none focus:border-violet-500"
                  >
                    <option value="Semua" className="bg-[#0d1224]">Semua Mapel</option>
                    {['Matematika', 'Fisika', 'Kimia', 'Biologi', 'Ekonomi', 'Geografi', 'Sosiologi', 'Sejarah', 'Bahasa Indonesia', 'Bahasa Inggris'].map((subj) => (
                      <option key={subj} value={subj} className="bg-[#0d1224]">{subj}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Documents Grid / List */}
          {docsLoading ? (
            <div className="text-center py-16 text-gray-500">Memuat materi belajar...</div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-16 bg-[#0d1224]/40 border border-white/[0.04] rounded-2xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.02] flex items-center justify-center border border-white/[0.04]">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm font-medium">Materi tidak ditemukan</p>
              <p className="text-gray-600 text-xs mt-1">Coba sesuaikan filter Jurusan, Mapel, atau Kategori Anda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocs.map((doc) => {
                const unlocked = isDocUnlocked(doc)
                return (
                  <div key={doc.id} className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl overflow-hidden shadow-md">
                    <div
                      className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/[0.01] transition-colors"
                      onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${typeColors[doc.type]}`}>
                          {typeLabels[doc.type]}
                        </span>
                        <span className="text-sm font-medium text-white truncate flex items-center gap-2">
                          {!unlocked && <span className="text-xs">🔒</span>}
                          {doc.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {(doc.subject || doc.class_group) && (
                          <div className="hidden sm:flex items-center gap-1.5">
                            {doc.subject && (
                              <span className="text-[10px] bg-white/[0.03] text-gray-400 border border-white/[0.05] px-2 py-0.5 rounded-lg">{doc.subject}</span>
                            )}
                            {doc.class_group && (
                              <span className="text-[10px] bg-white/[0.03] text-gray-400 border border-white/[0.05] px-2 py-0.5 rounded-lg">{doc.class_group}</span>
                            )}
                          </div>
                        )}
                        {doc.prerequisite_id && isSiswa && (
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border ${
                            unlocked 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {unlocked ? 'TERBUKA' : 'TERKUNCI'}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(doc.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'short'
                          })}
                        </span>
                        <svg
                          className={`w-4 h-4 text-gray-500 transition-transform ${expandedId === doc.id ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {expandedId === doc.id && (
                      <div className="border-t border-white/[0.04] px-5 py-5 bg-[#080d1a]/50">
                        {!unlocked ? (
                          /* Locked Warning Screen */
                          <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-6 text-center space-y-3">
                            <span className="text-3xl">🔒</span>
                            <h4 className="text-sm font-bold text-amber-400">Materi Terkunci Prasyarat</h4>
                            <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                              Kamu harus menyelesaikan kuis prasyarat terlebih dahulu dengan nilai kelulusan minimal 70 untuk dapat membuka materi ini.
                            </p>
                            {(() => {
                              const prereqDoc = documents.find(d => d.id === doc.prerequisite_id)
                              return prereqDoc ? (
                                <div className="text-xs text-gray-300 bg-white/[0.02] border border-white/[0.06] p-3 rounded-xl inline-block max-w-sm">
                                  <span className="font-semibold text-white block mb-0.5">Kuis Prasyarat:</span>
                                  {prereqDoc.title}
                                </div>
                              ) : null
                            })()}
                          </div>
                        ) : (
                          /* Standard unlocked view */
                          <>
                            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap border-b border-white/[0.03] pb-3">
                              <div className="flex items-center gap-2">
                                <ExportButton content={doc.content} type={doc.type} topic={doc.topic} />
                                {!isSiswa && (
                                  <button
                                    onClick={() => {
                                      if (confirm('Apakah Anda yakin ingin menghapus materi ini secara permanen?')) {
                                        deleteDocument(doc.id)
                                        setExpandedId(null)
                                      }
                                    }}
                                    className="px-3 py-1.5 text-xs text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition-colors"
                                  >
                                    Hapus
                                  </button>
                                )}
                              </div>

                              {/* Interactive Quiz Play Trigger for Students */}
                              {isSiswa && doc.type === 'quiz' && (
                                <Button
                                  onClick={() => setActiveQuiz({ id: doc.id, title: doc.title, topic: doc.topic, content: doc.content })}
                                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-1.5 rounded-xl shadow-lg shadow-violet-500/20"
                                >
                                  📝 Mulai Kerjakan Kuis Sekarang
                                </Button>
                              )}
                            </div>

                            {/* Display content nicely based on role and type */}
                            {isSiswa ? (
                              doc.type === 'quiz' ? (
                                <div className="text-center py-8">
                                  <p className="text-sm text-gray-400">Pembahasan kuis dikunci sebelum Anda selesai mengerjakan kuis.</p>
                                  <Button
                                    onClick={() => setActiveQuiz({ id: doc.id, title: doc.title, topic: doc.topic, content: doc.content })}
                                    className="mt-3.5 bg-violet-500/10 border border-violet-500/20 text-violet-300 hover:bg-violet-500/20 text-xs px-4 py-2 rounded-xl"
                                  >
                                    Buka Ujian Kuis Interaktif
                                  </Button>
                                </div>
                              ) : (
                                renderDocumentPreview(doc)
                              )
                            ) : (
                              renderDocumentPreview(doc)
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      ) : (
        /* Quiz Attempts History Tab (Siswa or Guru/Admin Monitoring) */
        <div className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            {isSiswa ? 'Riwayat Kuis Anda' : 'Riwayat Nilai Kuis Siswa'}
          </h2>

          {attemptsLoading ? (
            <div className="text-center py-12 text-gray-500">Memuat riwayat pengerjaan...</div>
          ) : attempts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white/[0.01] border border-white/[0.04] rounded-xl">
              {isSiswa 
                ? 'Anda belum pernah mengerjakan kuis apa pun. Mulai kerjakan kuis pertama Anda sekarang!' 
                : 'Belum ada data pengerjaan kuis dari siswa.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead>
                  <tr className="border-b border-white/[0.06] text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {!isSiswa && <th className="pb-3 pt-1">Nama Siswa</th>}
                    <th className="pb-3 pt-1">Nama Kuis / Topik</th>
                    <th className="pb-3 pt-1">Jumlah Soal</th>
                    <th className="pb-3 pt-1 text-center">Skor / Nilai</th>
                    <th className="pb-3 pt-1 text-center">Evaluasi</th>
                    <th className="pb-3 pt-1 text-right">Tanggal Pengerjaan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {attempts.map((attempt) => (
                    <tr key={attempt.id} className="hover:bg-white/[0.01] transition-colors">
                      {!isSiswa && (
                        <td className="py-3.5 pr-3 font-semibold text-white">
                          {attempt.profiles?.full_name || 'Siswa Tanpa Nama'}
                        </td>
                      )}
                      <td className="py-3.5 pr-3">
                        <span className="font-semibold text-white block">
                          {attempt.documents?.title || 'Kuis Terhapus'}
                        </span>
                        <span className="text-xs text-gray-500">Topik: {attempt.documents?.topic || 'N/A'}</span>
                      </td>
                      <td className="py-3.5 text-gray-400">{attempt.total_questions} Soal</td>
                      <td className="py-3.5 text-center">
                        <span className={`text-sm font-bold px-3 py-1 rounded-full border ${
                          attempt.score >= 70 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {attempt.score}
                        </span>
                      </td>
                      <td className="py-3.5 text-center">
                        <Button 
                          onClick={() => setReviewingAttempt(attempt)}
                          className="bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 text-xs px-3 py-1.5 rounded-xl border border-violet-500/20"
                        >
                          🔎 Review AI
                        </Button>
                      </td>
                      <td className="py-3.5 text-right text-xs text-gray-500">
                        {new Date(attempt.created_at).toLocaleString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
