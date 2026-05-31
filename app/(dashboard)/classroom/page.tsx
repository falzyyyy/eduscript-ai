'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QuizTaker } from '@/components/student/QuizTaker'
import { QuizReview } from '@/components/student/QuizReview'

interface ClassData {
  id: string
  name: string
  subject: string
  code: string
  teacher_id: string
  created_at: string
}

interface EnrollmentData {
  class_id: string
  classes: ClassData
}

export default function ClassroomPage() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [classes, setClasses] = useState<ClassData[]>([])
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([])
  const [activeClass, setActiveClass] = useState<ClassData | null>(null)
  const [classStudents, setClassStudents] = useState<Profile[]>([])
  const [classDocuments, setClassDocuments] = useState<any[]>([])
  const [classAttempts, setClassAttempts] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Tab state
  const [activeTab, setActiveTab] = useState<'materials' | 'analytics' | 'files'>('materials')

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [className, setClassName] = useState('')
  const [classSubject, setClassSubject] = useState('')
  const [joinCode, setJoinCode] = useState('')

  // File Upload State
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [uploadMethod, setUploadMethod] = useState<'upload' | 'link'>('upload')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [fileLoading, setFileLoading] = useState(false)

  // AI Advice State
  const [aiAdvice, setAiAdvice] = useState('')
  const [aiAdviceLoading, setAiAdviceLoading] = useState(false)

  // Local feedback inside modals
  const [modalError, setModalError] = useState('')
  const [modalSuccess, setModalSuccess] = useState('')

  // Active quiz state
  const [activeQuiz, setActiveQuiz] = useState<any | null>(null)
  const [reviewingAttempt, setReviewingAttempt] = useState<any | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchUserAndData()
  }, [])

  async function fetchUserAndData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setCurrentUser(profile)

      if (profile) {
        if (profile.role === 'siswa') {
          // Fetch student enrollments
          const { data: enrolls } = await supabase
            .from('class_enrollments')
            .select('class_id, classes:classes(*)')
            .eq('student_id', user.id)
          setEnrollments((enrolls as any) || [])
        } else {
          // Fetch teacher classes
          const { data: cls } = await supabase
            .from('classes')
            .select('*')
            .eq('teacher_id', user.id)
            .order('created_at', { ascending: false })
          setClasses(cls || [])
        }
      }
    }
    setLoading(false)
  }

  // Load details for the selected class
  async function selectClass(cls: ClassData) {
    setActiveClass(cls)
    setLoading(true)
    setActiveTab('materials')
    setAiAdvice('')
    setModalError('')
    setModalSuccess('')

    // 1. Fetch class students
    const { data: studentEnrolls } = await supabase
      .from('class_enrollments')
      .select('student_id, profiles:profiles(*)')
      .eq('class_id', cls.id)
    const students = studentEnrolls?.map((e: any) => e.profiles).filter(Boolean) || []
    setClassStudents(students)

    // 2. Fetch class documents (RPP, Ringkasan, Kuis, File Material)
    const { data: docs } = await supabase
      .from('documents')
      .select('*')
      .eq('class_id', cls.id)
      .order('created_at', { ascending: false })
    setClassDocuments(docs || [])

    // 3. Fetch all quiz attempts in this class
    const docIds = docs?.filter(d => d.type === 'quiz').map(d => d.id) || []
    let attempts: any[] = []
    if (docIds.length > 0) {
      const { data: atts } = await supabase
        .from('quiz_attempts')
        .select('*, profiles:profiles(*), documents:documents(title, topic, content)')
        .in('document_id', docIds)
        .order('created_at', { ascending: false })
      attempts = atts || []
    }
    setClassAttempts(attempts)

    // 4. Compile Leaderboard
    if (students.length > 0) {
      const studentIds = students.map(s => s.id)
      const attemptsForLeaderboard = attempts.filter(att => studentIds.includes(att.user_id))

      // Calculate averages
      const scoresMap: Record<string, { total: number; count: number }> = {}
      studentIds.forEach(id => {
        scoresMap[id] = { total: 0, count: 0 }
      })

      attemptsForLeaderboard?.forEach(att => {
        if (scoresMap[att.user_id]) {
          const percent = Math.round((att.score / att.total_questions) * 100)
          scoresMap[att.user_id].total += percent
          scoresMap[att.user_id].count += 1
        }
      })

      const leaderboardData = students.map(s => {
        const stats = scoresMap[s.id]
        const avg = stats.count > 0 ? Math.round(stats.total / stats.count) : 0
        return {
          id: s.id,
          name: s.full_name,
          average: avg,
          quizzesTaken: stats.count
        }
      }).sort((a, b) => b.average - a.average)

      setLeaderboard(leaderboardData)
    } else {
      setLeaderboard([])
    }

    setLoading(false)
  }

  // Handle uploading or link addition of classroom materials
  async function handleUploadMaterial(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUser || !activeClass) return
    setFileLoading(true)
    setModalError('')
    setModalSuccess('')

    let fileUrl = externalUrl

    try {
      if (uploadMethod === 'upload') {
        if (!uploadFile) {
          throw new Error('Pilih file yang ingin diunggah terlebih dahulu.')
        }

        // Generate unique path
        const fileExt = uploadFile.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
        const filePath = `${activeClass.id}/${fileName}`

        // Upload to bucket
        const { error: uploadErr } = await supabase.storage
          .from('classroom-materials')
          .upload(filePath, uploadFile)

        if (uploadErr) {
          throw new Error(uploadErr.message || 'Gagal mengunggah file ke Storage. Hubungi admin untuk memastikan bucket classroom-materials sudah di-create.')
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('classroom-materials')
          .getPublicUrl(filePath)

        fileUrl = publicUrlData.publicUrl
      }

      if (!fileUrl) {
        throw new Error('Tautan file atau URL eksternal wajib diisi.')
      }

      // Save document as file_material
      const payload = {
        title: uploadTitle,
        type: 'file_material',
        topic: 'Materi Berkas',
        class_id: activeClass.id,
        content: JSON.stringify({
          file_url: fileUrl,
          file_name: uploadMethod === 'upload' ? uploadFile?.name : uploadTitle,
          file_type: uploadMethod === 'upload' ? uploadFile?.name.split('.').pop()?.toUpperCase() : 'LINK',
          description: uploadDescription
        })
      }

      const { data, error } = await supabase
        .from('documents')
        .insert(payload)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      setClassDocuments(prev => [data, ...prev])
      setModalSuccess('Berkas belajar berhasil ditambahkan!')
      setUploadTitle('')
      setUploadDescription('')
      setExternalUrl('')
      setUploadFile(null)
      setShowUploadModal(false)
    } catch (err: any) {
      setModalError(err.message || 'Terjadi kesalahan.')
    } finally {
      setFileLoading(false)
    }
  }

  // Fetch Personalized AI Study Advice
  async function fetchStudyAdvice() {
    if (!currentUser || !activeClass) return
    setAiAdviceLoading(true)
    setAiAdvice('')

    try {
      const studentAttempts = classAttempts.filter(att => att.user_id === currentUser.id)
      const res = await fetch('/api/quiz/study-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: currentUser.full_name,
          subject: activeClass.subject,
          attempts: studentAttempts
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghasilkan saran belajar AI.')
      }

      setAiAdvice(data.advice)
    } catch (err: any) {
      setAiAdvice(`⚠️ Kesalahan: ${err.message}`)
    } finally {
      setAiAdviceLoading(false)
    }
  }


  // Create Class (Guru)
  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUser || !className || !classSubject) return

    // Generate random 6 character unique invite code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()

    const { data, error } = await supabase
      .from('classes')
      .insert({
        name: className,
        subject: classSubject,
        code,
        teacher_id: currentUser.id
      })
      .select()
      .single()

    if (!error && data) {
      setClasses(prev => [data, ...prev])
      setShowCreateModal(false)
      setClassName('')
      setClassSubject('')
      alert(`Kelas "${className}" berhasil dibuat!\nKode Kelas: ${code}`)
    } else {
      alert(error?.message || 'Gagal membuat kelas')
    }
  }

  // Join Class (Siswa)
  async function handleJoinClass(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUser || !joinCode) return

    // Find class with the invite code
    const { data: cls, error: clsError } = await supabase
      .from('classes')
      .select('*')
      .eq('code', joinCode.trim().toUpperCase())
      .single()

    if (clsError || !cls) {
      alert('Kode kelas tidak valid atau kelas tidak ditemukan.')
      return
    }

    // Enroll student
    const { error: enrollError } = await supabase
      .from('class_enrollments')
      .insert({
        student_id: currentUser.id,
        class_id: cls.id
      })

    if (!enrollError) {
      setEnrollments(prev => [...prev, { class_id: cls.id, classes: cls }])
      setShowJoinModal(false)
      setJoinCode('')
      alert(`Berhasil bergabung ke kelas "${cls.name}"!`)
    } else {
      if (enrollError.code === '23505') {
        alert('Anda sudah terdaftar di kelas ini.')
      } else {
        alert('Gagal bergabung ke kelas.')
      }
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    alert(`Kode kelas "${code}" telah disalin ke clipboard!`)
  }

  // Back to classes view
  function handleBack() {
    setActiveClass(null)
    setClassStudents([])
    setClassDocuments([])
    setLeaderboard([])
  }

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
            if (activeClass) selectClass(activeClass) // Refresh documents & leaderboard
          }}
        />
      </div>
    )
  }

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
      {/* HEADER SECTION */}
      {!activeClass ? (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Ruang Kelas LMS</h1>
            <p className="text-gray-400 text-sm mt-1">
              {currentUser?.role === 'siswa'
                ? 'Bergabunglah ke ruang belajar kelas dan kerjakan tugas pembelajaran Anda'
                : 'Buat kelas pembelajaran dan bagikan materi pembelajaran ke siswa Anda'}
            </p>
          </div>
          <div>
            {currentUser?.role === 'siswa' ? (
              <Button
                onClick={() => setShowJoinModal(true)}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-violet-500/25 transition-all"
              >
                🏫 Gabung Kelas Baru
              </Button>
            ) : (
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 transition-all"
              >
                ➕ Buat Kelas Baru
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] flex items-center justify-center text-white transition-all"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{activeClass.name}</h1>
            <p className="text-gray-400 text-xs mt-0.5">{activeClass.subject}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-500">Memuat data kelas...</div>
      ) : !activeClass ? (
        /* CLASSES GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentUser?.role === 'siswa' ? (
            enrollments.length === 0 ? (
              <div className="col-span-full text-center py-20 bg-[#0d1224]/30 border border-white/[0.04] rounded-2xl">
                <p className="text-gray-500">Anda belum bergabung ke kelas mana pun.</p>
                <Button
                  onClick={() => setShowJoinModal(true)}
                  variant="link"
                  className="text-violet-400 hover:text-violet-300 font-semibold mt-2"
                >
                  Gabung Kelas Sekarang →
                </Button>
              </div>
            ) : (
              enrollments.map((en) => (
                <div key={en.class_id} className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-5 hover:border-violet-500/30 transition-all group flex flex-col justify-between h-48">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">{en.classes.subject}</span>
                    <h3 className="text-lg font-bold text-white mt-2.5 group-hover:text-violet-400 transition-colors">{en.classes.name}</h3>
                  </div>
                  <Button
                    onClick={() => selectClass(en.classes)}
                    className="w-full h-10 mt-4 bg-white/[0.03] border border-white/[0.08] text-white hover:bg-violet-600 hover:text-white transition-all text-xs font-semibold rounded-xl"
                  >
                    Masuk Kelas
                  </Button>
                </div>
              ))
            )
          ) : (
            classes.length === 0 ? (
              <div className="col-span-full text-center py-20 bg-[#0d1224]/30 border border-white/[0.04] rounded-2xl">
                <p className="text-gray-500">Anda belum membuat kelas pembelajaran.</p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  variant="link"
                  className="text-blue-400 hover:text-blue-300 font-semibold mt-2"
                >
                  Buat Kelas Sekarang →
                </Button>
              </div>
            ) : (
              classes.map((cls) => (
                <div key={cls.id} className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-5 hover:border-blue-500/30 transition-all group flex flex-col justify-between h-52">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">{cls.subject}</span>
                    <h3 className="text-lg font-bold text-white mt-2.5 group-hover:text-blue-400 transition-colors">{cls.name}</h3>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      Kode Kelas: <span className="font-mono font-bold text-white bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">{cls.code}</span>
                    </div>
                    <button
                      onClick={() => copyCode(cls.code)}
                      className="text-xs text-blue-400 hover:underline"
                    >
                      Salin Kode
                    </button>
                  </div>
                  <Button
                    onClick={() => selectClass(cls)}
                    className="w-full h-10 mt-4 bg-white/[0.03] border border-white/[0.08] text-white hover:bg-blue-600 hover:text-white transition-all text-xs font-semibold rounded-xl"
                  >
                    Kelola Kelas
                  </Button>
                </div>
              ))
            )
          )}
        </div>
      ) : (
        /* EXPANDED CLASS DETAIL VIEW WITH PREMIUM TABS */
        <div className="space-y-6">
          {/* CLASS HEADER ACTIONS & TAB SELECTOR */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0d1224]/40 border border-white/[0.04] p-4 rounded-2xl">
            <div className="flex bg-white/[0.02] border border-white/[0.06] p-1 rounded-xl w-full md:w-auto">
              <button
                onClick={() => setActiveTab('materials')}
                className={`flex-1 md:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'materials'
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                📖 Materi & Tugas
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex-1 md:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'analytics'
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                📊 Analisis Ujian
              </button>
              <button
                onClick={() => setActiveTab('files')}
                className={`flex-1 md:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'files'
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                📁 Berkas Belajar
              </button>
            </div>

            {/* Teacher sharing action on files tab */}
            {activeTab === 'files' && currentUser?.role === 'guru' && (
              <Button
                onClick={() => {
                  setModalError('')
                  setModalSuccess('')
                  setShowUploadModal(true)
                }}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-all w-full md:w-auto"
              >
                📤 Bagikan Berkas Baru
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT COLUMN: ACTIVE CONTENT */}
            <div className="lg:col-span-2 space-y-4">
              
              {/* TAB 1: MATERIALS & QUIZZES */}
              {activeTab === 'materials' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-white tracking-tight">Materi & Tugas Pembelajaran</h2>
                  {classDocuments.filter(d => d.type !== 'file_material').length === 0 ? (
                    <div className="text-center py-16 bg-[#0d1224]/30 border border-white/[0.04] rounded-2xl text-gray-500 text-sm">
                      Belum ada kuis, RPP, atau ringkasan yang ditugaskan ke kelas ini.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {classDocuments
                        .filter(d => d.type !== 'file_material')
                        .map((doc) => {
                          const isQuiz = doc.type === 'quiz'
                          const isLesson = doc.type === 'lesson_plan'
                          return (
                            <div key={doc.id} className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-white/[0.1] transition-all">
                              <div>
                                <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full ${
                                  isQuiz ? 'bg-violet-500/10 text-violet-400' : isLesson ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
                                }`}>
                                  {doc.type === 'quiz' ? '📝 Kuis' : doc.type === 'lesson_plan' ? '📚 RPP' : '📖 Ringkasan'}
                                </span>
                                <h3 className="text-base font-bold text-white mt-2">{doc.title}</h3>
                                <p className="text-gray-400 text-xs mt-1">Topik: {doc.topic}</p>
                              </div>
                              <div className="flex gap-2">
                                {isQuiz && currentUser?.role === 'siswa' && (
                                  <Button
                                    onClick={() => setActiveQuiz(doc)}
                                    className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-4 py-2 rounded-xl"
                                  >
                                    Mulai Kuis
                                  </Button>
                                )}
                                {!isQuiz && (
                                  <span className="text-xs text-gray-500 bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 rounded-xl">
                                    Akses via Dokumen Saya
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ELEVATED E-LEARNING ANALYTICS */}
              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  {currentUser?.role === 'guru' ? (
                    // ==========================================
                    // TEACHER ANALYTICS DASHBOARD
                    // ==========================================
                    <div className="space-y-6">
                      <h2 className="text-lg font-bold text-white tracking-tight">Analisis Hasil Belajar Kelas</h2>
                      
                      {classAttempts.length === 0 ? (
                        <div className="text-center py-16 bg-[#0d1224]/30 border border-white/[0.04] rounded-2xl text-gray-500 text-sm">
                          Belum ada data pengerjaan kuis dari murid di kelas ini.
                        </div>
                      ) : (
                        (() => {
                          // Compute classwide stats
                          const totalAttempts = classAttempts.length
                          const quizScores = classAttempts.map(att => Math.round((att.score / att.total_questions) * 100))
                          const avgClassScore = Math.round(quizScores.reduce((a, b) => a + b, 0) / totalAttempts)
                          const maxClassScore = Math.max(...quizScores)
                          const minClassScore = Math.min(...quizScores)

                          // Score Distribution categories
                          const dist = { excellent: 0, good: 0, fair: 0, poor: 0 }
                          quizScores.forEach(score => {
                            if (score >= 80) dist.excellent++
                            else if (score >= 60) dist.good++
                            else if (score >= 40) dist.fair++
                            else dist.poor++
                          })

                          // Hardest Question detection
                          // Group attempts by quiz
                          const quizAttemptsMap: Record<string, { attempts: any[]; title: string; questions: any[] }> = {}
                          classDocuments.filter(d => d.type === 'quiz').forEach(d => {
                            try {
                              const qData = JSON.parse(d.content)
                              quizAttemptsMap[d.id] = {
                                title: d.title,
                                questions: qData.questions || [],
                                attempts: []
                              }
                            } catch (e) {}
                          })

                          classAttempts.forEach(att => {
                            if (quizAttemptsMap[att.document_id]) {
                              quizAttemptsMap[att.document_id].attempts.push(att)
                            }
                          })

                          // Calculate correctness score per question index
                          const hardestQuestionsList: { quizTitle: string; questionText: string; correctRate: number; isMcq: boolean; answer: string }[] = []

                          Object.entries(quizAttemptsMap).forEach(([qId, data]) => {
                            if (data.attempts.length === 0 || data.questions.length === 0) return

                            data.questions.forEach((q, qIdx) => {
                              let totalPoints = 0
                              let maxPoints = 0

                              data.attempts.forEach(att => {
                                const ans = att.answers[qIdx.toString()] || att.answers[qIdx]
                                if (q.type === 'essay') {
                                  totalPoints += (ans && typeof ans === 'object') ? (ans.score || 0) : 0
                                  maxPoints += 100
                                } else {
                                  const isCorrect = (typeof ans === 'string' && ans.trim().toUpperCase() === q.answer.trim().toUpperCase())
                                  totalPoints += isCorrect ? 100 : 0
                                  maxPoints += 100
                                }
                              })

                              const correctRate = Math.round((totalPoints / maxPoints) * 100)
                              hardestQuestionsList.push({
                                quizTitle: data.title,
                                questionText: q.question,
                                correctRate,
                                isMcq: q.type !== 'essay',
                                answer: q.answer
                              })
                            })
                          })

                          // Sort to get top 3 hardest questions (lowest correct rate)
                          const sortedHardest = hardestQuestionsList
                            .filter(q => q.correctRate < 80)
                            .sort((a, b) => a.correctRate - b.correctRate)
                            .slice(0, 3)

                          return (
                            <div className="space-y-6">
                              {/* Summary Score Grid */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-gradient-to-br from-violet-600/10 to-indigo-600/10 border border-violet-500/20 p-4 rounded-2xl text-center">
                                  <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider block">Total Percobaan</span>
                                  <span className="text-3xl font-extrabold text-white mt-1 block">{totalAttempts}</span>
                                </div>
                                <div className="bg-gradient-to-br from-blue-600/10 to-cyan-600/10 border border-blue-500/20 p-4 rounded-2xl text-center">
                                  <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">Rata-rata Kelas</span>
                                  <span className="text-3xl font-extrabold text-white mt-1 block">{avgClassScore}%</span>
                                </div>
                                <div className="bg-gradient-to-br from-emerald-600/10 to-teal-600/10 border border-emerald-500/20 p-4 rounded-2xl text-center">
                                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Nilai Tertinggi</span>
                                  <span className="text-3xl font-extrabold text-white mt-1 block">{maxClassScore}%</span>
                                </div>
                                <div className="bg-gradient-to-br from-rose-600/10 to-orange-600/10 border border-rose-500/20 p-4 rounded-2xl text-center">
                                  <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block">Nilai Terendah</span>
                                  <span className="text-3xl font-extrabold text-white mt-1 block">{minClassScore}%</span>
                                </div>
                              </div>

                              {/* Visual Score Distribution Chart */}
                              <div className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-5 space-y-4">
                                <h3 className="text-sm font-bold text-white">Sebaran Nilai Siswa</h3>
                                <div className="space-y-3.5">
                                  {[
                                    { label: 'Sangat Baik (80-100)', count: dist.excellent, color: 'bg-emerald-500' },
                                    { label: 'Baik (60-79)', count: dist.good, color: 'bg-blue-500' },
                                    { label: 'Cukup (40-59)', count: dist.fair, color: 'bg-amber-500' },
                                    { label: 'Perlu Bimbingan (0-39)', count: dist.poor, color: 'bg-rose-500' }
                                  ].map((bar, i) => {
                                    const percent = totalAttempts > 0 ? Math.round((bar.count / totalAttempts) * 100) : 0
                                    return (
                                      <div key={i} className="space-y-1">
                                        <div className="flex justify-between text-xs font-medium">
                                          <span className="text-gray-300">{bar.label}</span>
                                          <span className="text-gray-400">{bar.count} Murid ({percent}%)</span>
                                        </div>
                                        <div className="h-2.5 bg-white/[0.04] rounded-full overflow-hidden">
                                          <div className={`h-full ${bar.color} transition-all rounded-full`} style={{ width: `${percent}%` }} />
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>

                              {/* Hardest Questions Detector */}
                              <div className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-5 space-y-4">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                  🔥 Deteksi Soal Paling Sulit Kelas
                                </h3>
                                <p className="text-xs text-gray-500">Berikut adalah daftar butir soal ujian dengan tingkat keberhasilan penyelesaian paling rendah oleh siswa Anda.</p>
                                
                                {sortedHardest.length === 0 ? (
                                  <div className="p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.02] text-center text-xs text-emerald-400 font-medium">
                                    🎉 Kinerja kelas sangat luar biasa! Belum terdeteksi butir soal dengan tingkat kegagalan tinggi.
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {sortedHardest.map((q, idx) => (
                                      <div key={idx} className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.04] hover:bg-white/[0.02] transition-all space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] text-gray-500 font-bold uppercase">{q.quizTitle}</span>
                                          <span className="text-[10px] text-rose-400 font-bold px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                                            Rasio Kebenaran: {q.correctRate}%
                                          </span>
                                        </div>
                                        <p className="text-xs font-semibold text-white leading-relaxed">
                                          {q.questionText}
                                        </p>
                                        <div className="pl-3 border-l-2 border-emerald-500/30 text-[11px] text-emerald-400 leading-relaxed">
                                          <span className="text-gray-500 block mb-0.5">Kunci Jawaban Guru:</span>
                                          {q.answer}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })()
                      )}
                    </div>
                  ) : (
                    // ==========================================
                    // STUDENT PERSONAL ANALYTICS
                    // ==========================================
                    <div className="space-y-6">
                      <h2 className="text-lg font-bold text-white tracking-tight">Rapor Belajar Kuis Pribadi</h2>

                      {/* AI study advisor card */}
                      <div className="bg-gradient-to-r from-violet-600/10 via-indigo-600/10 to-blue-600/10 border border-violet-500/25 p-5 rounded-2xl relative overflow-hidden space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400 bg-violet-500/10 px-2.5 py-0.5 rounded-full">AI Study Assistant</span>
                            <h3 className="text-base font-bold text-white mt-2">Dapatkan Rekomendasi Belajar Pintar</h3>
                            <p className="text-xs text-gray-400 mt-1">Kami menganalisis riwayat nilai kuis Anda dan merumuskan saran belajar terarah.</p>
                          </div>
                          <span className="text-2xl">💡</span>
                        </div>

                        {aiAdvice ? (
                          <div className="bg-[#0b0f1f]/80 border border-white/[0.06] p-4 rounded-xl text-xs text-gray-300 leading-relaxed font-normal whitespace-pre-line prose prose-invert max-w-none">
                            {aiAdvice}
                          </div>
                        ) : null}

                        <Button
                          onClick={fetchStudyAdvice}
                          disabled={aiAdviceLoading}
                          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-violet-500/10"
                        >
                          {aiAdviceLoading ? '🤖 Sedang Menganalisis Performa...' : '🎯 Dapatkan Rekomendasi Belajar AI'}
                        </Button>
                      </div>

                      {/* Personal Quiz Attempts Table */}
                      <div className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-5 space-y-4">
                        <h3 className="text-sm font-bold text-white">Riwayat Evaluasi Kuis</h3>
                        {!currentUser || classAttempts.filter(att => att.user_id === currentUser.id).length === 0 ? (
                          <p className="text-xs text-gray-500 text-center py-6">Anda belum pernah mengambil kuis apa pun.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead>
                                <tr className="border-b border-white/[0.04]">
                                  <th className="text-gray-500 py-2.5">Kuis</th>
                                  <th className="text-gray-500 py-2.5 text-center">Skor</th>
                                  <th className="text-gray-500 py-2.5 text-center">Status</th>
                                  <th className="text-gray-500 py-2.5 text-center">Tanggal</th>
                                  <th className="text-gray-500 py-2.5 text-right">Tinjauan</th>
                                </tr>
                              </thead>
                              <tbody>
                                {classAttempts
                                  .filter(att => att.user_id === currentUser?.id)
                                  .map((att) => {
                                    const scorePercent = Math.round((att.score / att.total_questions) * 100)
                                    const isPassed = scorePercent >= 70
                                    return (
                                      <tr key={att.id} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                                        <td className="py-3 font-semibold text-white">{att.documents?.title || 'Kuis'}</td>
                                        <td className="py-3 text-center text-white font-mono font-bold">{scorePercent}%</td>
                                        <td className="py-3 text-center">
                                          <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                            isPassed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                          }`}>
                                            {isPassed ? 'LULUS' : 'REMEDIAL'}
                                          </span>
                                        </td>
                                        <td className="py-3 text-center text-gray-500">
                                          {new Date(att.created_at).toLocaleDateString('id-ID', {
                                            day: 'numeric', month: 'short'
                                          })}
                                        </td>
                                        <td className="py-3 text-right">
                                          <button
                                            onClick={() => setReviewingAttempt(att)}
                                            className="text-violet-400 hover:text-violet-300 font-semibold hover:underline"
                                          >
                                            Evaluasi →
                                          </button>
                                        </td>
                                      </tr>
                                    )
                                  })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: MODUL BELAJAR MANDIRI & FILE MATERIALS */}
              {activeTab === 'files' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-white tracking-tight">Modul Belajar Mandiri</h2>
                  
                  {classDocuments.filter(d => d.type === 'file_material').length === 0 ? (
                    <div className="text-center py-16 bg-[#0d1224]/30 border border-white/[0.04] rounded-2xl text-gray-500 text-sm">
                      Belum ada file materi pembelajaran yang dibagikan ke kelas ini.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {classDocuments
                        .filter(d => d.type === 'file_material')
                        .map((doc) => {
                          let fileData = { file_url: '', file_name: doc.title, file_type: 'LINK', description: '' }
                          try {
                            fileData = JSON.parse(doc.content)
                          } catch (e) {}

                          const isLink = fileData.file_type === 'LINK' || !fileData.file_type

                          return (
                            <div key={doc.id} className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-5 hover:border-emerald-500/20 transition-all flex flex-col justify-between space-y-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                    isLink ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'
                                  }`}>
                                    {isLink ? '🔗 Tautan' : `📄 ${fileData.file_type}`}
                                  </span>
                                </div>
                                <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">{doc.title}</h3>
                                {fileData.description && (
                                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-3 font-normal">{fileData.description}</p>
                                )}
                              </div>
                              <a
                                href={fileData.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full h-10 bg-white/[0.03] border border-white/[0.08] hover:bg-emerald-600 text-white transition-all text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
                              >
                                {isLink ? '🌐 Buka Tautan' : '📥 Unduh Materi'}
                              </a>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* RIGHT COLUMN: SIDEBAR */}
            <div className="space-y-6">
              {/* LEADERBOARD SECTION */}
              <div className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-5 space-y-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  🏆 Papan Peringkat Kelas
                </h2>
                {leaderboard.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-6">Belum ada aktivitas kuis terdaftar.</p>
                ) : (
                  <div className="space-y-2.5">
                    {leaderboard.map((item, idx) => (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.01] border border-white/[0.03]">
                        <div className="flex items-center gap-3">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                            idx === 0 ? 'bg-amber-500/20 text-amber-400' : idx === 1 ? 'bg-slate-400/20 text-slate-300' : idx === 2 ? 'bg-amber-700/20 text-amber-600' : 'text-gray-500'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="text-xs text-white font-medium">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-violet-400 block">{item.average}%</span>
                          <span className="text-[10px] text-gray-500 block">{item.quizzesTaken} Kuis</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* MEMBERS LIST */}
              <div className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-5 space-y-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  👥 Murid Terdaftar ({classStudents.length})
                </h2>
                {classStudents.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-6">Belum ada murid yang bergabung.</p>
                ) : (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto">
                    {classStudents.map((stud) => (
                      <div key={stud.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.01]">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-[10px] font-semibold">
                          {stud.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <span className="text-xs text-gray-300 font-medium block truncate">{stud.full_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CLASS MODAL (GURU) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1224] border border-white/[0.08] rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Buat Ruang Kelas Baru</h3>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <Label htmlFor="className" className="text-gray-300 text-xs mb-1.5 block">Nama Kelas</Label>
                <Input
                  id="className"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="Misal: Kelas XI - IPA 1"
                  required
                  className="bg-white/[0.03] border-white/[0.08] text-white"
                />
              </div>
              <div>
                <Label htmlFor="classSubject" className="text-gray-300 text-xs mb-1.5 block">Mata Pelajaran</Label>
                <Input
                  id="classSubject"
                  value={classSubject}
                  onChange={(e) => setClassSubject(e.target.value)}
                  placeholder="Misal: Biologi"
                  required
                  className="bg-white/[0.03] border-white/[0.08] text-white"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  variant="outline"
                  className="bg-transparent border-white/[0.08] text-gray-400 hover:bg-white/[0.03]"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl"
                >
                  Buat Kelas
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN CLASS MODAL (SISWA) */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1224] border border-white/[0.08] rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowJoinModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Gabung ke Ruang Kelas</h3>
            <form onSubmit={handleJoinClass} className="space-y-4">
              <div>
                <Label htmlFor="joinCode" className="text-gray-300 text-xs mb-1.5 block">Masukkan Kode Kelas</Label>
                <Input
                  id="joinCode"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Masukkan 6 digit kode kelas (e.g. BIO101)"
                  required
                  className="bg-white/[0.03] border-white/[0.08] text-white uppercase text-center font-mono font-bold tracking-widest text-lg"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  variant="outline"
                  className="bg-transparent border-white/[0.08] text-gray-400 hover:bg-white/[0.03]"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl"
                >
                  Gabung Kelas
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GURU MATERIAL SHARING / FILE UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1224] border border-white/[0.08] rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>
            
            <h3 className="text-lg font-bold text-white mb-4">📤 Bagikan Berkas & Tautan Belajar</h3>
            
            {/* Upload Method Switcher */}
            <div className="flex bg-white/[0.03] border border-white/[0.08] p-1 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => {
                  setUploadMethod('upload')
                  setModalError('')
                  setModalSuccess('')
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  uploadMethod === 'upload'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Unggah File
              </button>
              <button
                type="button"
                onClick={() => {
                  setUploadMethod('link')
                  setModalError('')
                  setModalSuccess('')
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  uploadMethod === 'link'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Tautan Eksternal
              </button>
            </div>

            <form onSubmit={handleUploadMaterial} className="space-y-4">
              <div>
                <Label htmlFor="uploadTitle" className="text-gray-300 text-xs mb-1.5 block">Judul Berkas / Materi</Label>
                <Input
                  id="uploadTitle"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Misal: Presentasi Anatomi Hewan RPP 4"
                  required
                  className="bg-white/[0.03] border-white/[0.08] text-white"
                />
              </div>

              <div>
                <Label htmlFor="uploadDescription" className="text-gray-300 text-xs mb-1.5 block">Deskripsi Pendek</Label>
                <textarea
                  id="uploadDescription"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Jelaskan isi materi ajar secara singkat..."
                  className="w-full bg-white/[0.03] border border-white/[0.08] text-white rounded-xl p-3 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  rows={3}
                />
              </div>

              {uploadMethod === 'upload' ? (
                <div>
                  <Label className="text-gray-300 text-xs mb-1.5 block">Pilih Berkas (PDF/PPT/Word/Gambar)</Label>
                  <input
                    type="file"
                    accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,image/*"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    required
                    className="w-full bg-white/[0.03] border border-white/[0.08] text-white rounded-xl p-2.5 text-xs focus:outline-none file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/20 file:text-emerald-400 hover:file:bg-emerald-500/30"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Ukuran maksimal file: 50MB</p>
                </div>
              ) : (
                <div>
                  <Label htmlFor="externalUrl" className="text-gray-300 text-xs mb-1.5 block">Alamat URL Tautan</Label>
                  <Input
                    id="externalUrl"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    required
                    className="bg-white/[0.03] border-white/[0.08] text-white font-mono text-xs"
                  />
                </div>
              )}

              {modalError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  ⚠️ {modalError}
                </div>
              )}

              {modalSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                  ✅ {modalSuccess}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <Button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  variant="outline"
                  className="bg-transparent border-white/[0.08] text-gray-400 hover:bg-white/[0.03]"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={fileLoading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl"
                >
                  {fileLoading ? 'Mengirim...' : 'Bagikan Berkas'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

