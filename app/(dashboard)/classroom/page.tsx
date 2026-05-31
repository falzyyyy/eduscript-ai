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
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [className, setClassName] = useState('')
  const [classSubject, setClassSubject] = useState('')
  const [joinCode, setJoinCode] = useState('')

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

    // 1. Fetch class students
    const { data: studentEnrolls } = await supabase
      .from('class_enrollments')
      .select('student_id, profiles:profiles(*)')
      .eq('class_id', cls.id)
    const students = studentEnrolls?.map((e: any) => e.profiles).filter(Boolean) || []
    setClassStudents(students)

    // 2. Fetch class documents (RPP, Ringkasan, Kuis)
    const { data: docs } = await supabase
      .from('documents')
      .select('*')
      .eq('class_id', cls.id)
      .order('created_at', { ascending: false })
    setClassDocuments(docs || [])

    // 3. Compile Leaderboard: Average quiz scores of students in this class
    if (students.length > 0) {
      const studentIds = students.map(s => s.id)
      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select('user_id, score, total_questions')
        .in('user_id', studentIds)

      // Calculate averages
      const scoresMap: Record<string, { total: number; count: number }> = {}
      studentIds.forEach(id => {
        scoresMap[id] = { total: 0, count: 0 }
      })

      attempts?.forEach(att => {
        if (scoresMap[att.user_id]) {
          // percentage score
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
        /* EXPANDED CLASS DETAIL VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ASSIGNMENTS / MATERIALS FEED (LEFT SIDE) */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-white">Materi & Tugas Pembelajaran</h2>
            {classDocuments.length === 0 ? (
              <div className="text-center py-16 bg-[#0d1224]/30 border border-white/[0.04] rounded-2xl text-gray-500 text-sm">
                Belum ada materi atau kuis yang ditugaskan ke kelas ini.
              </div>
            ) : (
              <div className="space-y-4">
                {classDocuments.map((doc) => {
                  const isQuiz = doc.type === 'quiz'
                  const isLesson = doc.type === 'lesson_plan'
                  return (
                    <div key={doc.id} className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
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

          {/* LEADERBOARD & STUDENTS (RIGHT SIDE) */}
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
    </div>
  )
}
