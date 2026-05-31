'use client'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import { useQuota } from '@/hooks/useQuota'
import { useDocuments } from '@/hooks/useDocuments'
import type { Profile } from '@/types'

// ==========================================
// CONSTANTS
// ==========================================
const quickActions = [
  {
    title: 'Generator Kuis',
    desc: 'Buat soal pilihan ganda otomatis',
    href: '/generate/quiz',
    icon: '❓',
    color: 'from-violet-500 to-purple-600',
    shadow: 'shadow-violet-500/20',
  },
  {
    title: 'Rencana Pembelajaran',
    desc: 'Susun RPP lengkap dalam detik',
    href: '/generate/lesson-plan',
    icon: '📋',
    color: 'from-blue-500 to-cyan-600',
    shadow: 'shadow-blue-500/20',
  },
  {
    title: 'Ringkasan Materi',
    desc: 'Ringkas materi secara terstruktur',
    href: '/generate/summary',
    icon: '📝',
    color: 'from-emerald-500 to-teal-600',
    shadow: 'shadow-emerald-500/20',
  },
]

const typeLabels: Record<string, string> = {
  quiz: 'Kuis',
  lesson_plan: 'RPP',
  summary: 'Ringkasan',
}

// ==========================================
// TEACHER DASHBOARD (GURU & ADMIN)
// ==========================================
function TeacherDashboard({ profile, documents, quotaUsed, quotaLimit, percentage, remaining }: any) {
  const recentDocs = documents.slice(0, 5)

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Selamat datang, {profile?.full_name || 'User'} 👋
        </h1>
        <p className="text-gray-400 text-sm mt-1">Apa yang ingin kamu buat hari ini?</p>
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group bg-[#0d1224]/60 border border-white/[0.04] rounded-2xl p-5 hover:border-white/[0.08] hover:bg-white/[0.02] transition-all duration-300 hover:-translate-y-1"
          >
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg ${action.shadow} mb-4 text-xl group-hover:scale-110 transition-transform`}>
              {action.icon}
            </div>
            <h3 className="font-semibold text-white mb-1">{action.title}</h3>
            <p className="text-sm text-gray-500">{action.desc}</p>
          </Link>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.1] transition-colors">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Dokumen</p>
          <p className="text-3xl font-bold text-white mt-2">{documents.length}</p>
        </div>
        <div className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.1] transition-colors">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Kuota Terpakai</p>
          <div className="mt-2">
            <p className="text-3xl font-bold text-white">{quotaUsed}<span className="text-base text-gray-500">/{quotaLimit}</span></p>
            <div className="w-full h-1.5 bg-white/[0.04] rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-amber-500' : 'bg-gradient-to-r from-violet-500 to-indigo-500'
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
        <div className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.1] transition-colors">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Sisa Generate</p>
          <p className={`text-3xl font-bold mt-2 ${remaining <= 5 ? 'text-red-400' : 'text-emerald-400'}`}>{remaining}</p>
        </div>
      </div>

      {/* Recent Documents */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Dokumen Terbaru</h2>
          {documents.length > 0 && (
            <Link href="/documents" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
              Lihat semua →
            </Link>
          )}
        </div>

        {recentDocs.length === 0 ? (
          <div className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-10 text-center border-dashed">
            <div className="w-16 h-16 rounded-full bg-white/[0.02] flex items-center justify-center mx-auto mb-4 text-2xl">
              📂
            </div>
            <p className="text-gray-400 font-medium mb-1">Belum ada dokumen</p>
            <p className="text-gray-500 text-sm">Mulai generate konten pertamamu menggunakan alat di atas!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentDocs.map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between bg-[#0d1224]/60 border border-white/[0.06] rounded-xl px-5 py-3 hover:bg-white/[0.03] transition-all cursor-pointer group">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                    doc.type === 'quiz' ? 'bg-violet-500/15 text-violet-400 border-violet-500/20' :
                    doc.type === 'lesson_plan' ? 'bg-blue-500/15 text-blue-400 border-blue-500/20' :
                    'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {typeLabels[doc.type]}
                  </span>
                  <span className="text-sm text-gray-200 group-hover:text-white transition-colors truncate">{doc.title}</span>
                </div>
                <span className="text-xs text-gray-500 shrink-0 ml-3">
                  {new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ==========================================
// STUDENT DASHBOARD (SISWA)
// ==========================================
function StudentDashboard({ profile, documents }: any) {
  const recentDocs = documents.slice(0, 5)

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/40 via-violet-900/20 to-[#0a0e1a] border border-violet-500/20 p-8 sm:p-10">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-violet-500/20 rounded-full blur-3xl mix-blend-screen pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl mix-blend-screen pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold uppercase tracking-wider mb-4">
            🎓 Ruang Belajar Siswa
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
            Halo, {profile?.full_name?.split(' ')[0] || 'Siswa'}!
          </h1>
          <p className="text-gray-400 text-base leading-relaxed">
            Selamat datang di EduScript AI. Platform ini dirancang khusus untuk mempermudah guru dalam menyusun materi ajar yang berkualitas. Sebagai siswa, kamu dapat mengakses materi dan dokumen yang telah dibagikan kepada kamu di sini.
          </p>
        </div>
      </div>

      {/* Student Action Cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/documents" className="group relative overflow-hidden bg-[#0d1224]/80 border border-white/[0.06] rounded-2xl p-6 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-6xl">📚</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-4 group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Materi & Dokumen</h3>
          <p className="text-sm text-gray-400">Akses ringkasan materi dan kuis yang telah disimpan dalam platform.</p>
        </Link>

        <Link href="/settings" className="group relative overflow-hidden bg-[#0d1224]/80 border border-white/[0.06] rounded-2xl p-6 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-6xl">⚙️</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Pengaturan Akun</h3>
          <p className="text-sm text-gray-400">Kelola informasi profil pribadi dan preferensi akun belajarmu.</p>
        </Link>
      </div>

      {/* Student Recent Documents (Optional view of platform docs) */}
      <div className="bg-[#0d1224]/40 border border-white/[0.04] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Dokumen Tersedia</h2>
            <p className="text-sm text-gray-500 mt-1">Materi yang mungkin bisa kamu pelajari</p>
          </div>
        </div>

        {recentDocs.length === 0 ? (
          <div className="py-8 text-center border border-white/[0.04] border-dashed rounded-xl bg-white/[0.01]">
            <span className="text-3xl mb-2 block">📭</span>
            <p className="text-gray-400 font-medium">Belum ada materi saat ini.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {recentDocs.map((doc: any) => (
              <div key={doc.id} className="flex items-center gap-4 bg-[#0d1224] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.12] transition-colors">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  doc.type === 'quiz' ? 'bg-violet-500/10 text-violet-400' :
                  doc.type === 'lesson_plan' ? 'bg-blue-500/10 text-blue-400' :
                  'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {doc.type === 'quiz' ? '❓' : doc.type === 'lesson_plan' ? '📋' : '📝'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{doc.title}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{typeLabels[doc.type]} • {new Date(doc.created_at).toLocaleDateString('id-ID')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ==========================================
// MAIN COMPONENT EXPORT
// ==========================================
export default function DashboardPage() {
  const { profile, loading } = useUser()
  const quota = useQuota()
  const { documents } = useDocuments()

  const signOut = async () => {
    const supabase = (await import('@/lib/supabase/client')).createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  // Show a simple loading state to prevent flash of wrong dashboard
  if (loading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        <p className="text-sm text-gray-500 animate-pulse">Memuat dashboard...</p>
      </div>
    )
  }

  // Handle case where profile row does not exist in the database
  if (!profile) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-3xl">
          ⚠️
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white tracking-tight">Data Profil Tidak Ditemukan</h2>
          <p className="text-gray-400 text-sm max-w-md leading-relaxed">
            Akun autentikasi Anda valid, tetapi data profil pengguna tidak ditemukan di database. Pastikan Anda telah menjalankan migrasi database Supabase Anda secara lengkap.
          </p>
        </div>
        <button
          onClick={signOut}
          className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-violet-500/25 transition-all"
        >
          Keluar & Buat Ulang Akun
        </button>
      </div>
    )
  }

  // Branch the UI based on role
  if (profile.role === 'siswa') {
    return <StudentDashboard profile={profile} documents={documents} />
  }

  return (
    <TeacherDashboard 
      profile={profile} 
      documents={documents} 
      {...quota} 
    />
  )
}
