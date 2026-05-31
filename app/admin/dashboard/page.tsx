import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: documents } = await supabase
    .from('documents')
    .select('type, created_at')

  const stats = {
    totalUsers: users?.length ?? 0,
    totalDocs: documents?.length ?? 0,
    quizCount: documents?.filter(d => d.type === 'quiz').length ?? 0,
    rppCount: documents?.filter(d => d.type === 'lesson_plan').length ?? 0,
    summaryCount: documents?.filter(d => d.type === 'summary').length ?? 0,
    guruCount: users?.filter(u => u.role === 'guru').length ?? 0,
    siswaCount: users?.filter(u => u.role === 'siswa').length ?? 0,
  }

  const recentUsers = users?.slice(0, 10) ?? []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard Admin</h1>
        <p className="text-gray-400 text-sm mt-1">Ringkasan statistik platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Pengguna', value: stats.totalUsers, icon: '👥', color: 'from-violet-500 to-purple-600' },
          { label: 'Total Dokumen', value: stats.totalDocs, icon: '📄', color: 'from-blue-500 to-cyan-600' },
          { label: 'Kuis Dibuat', value: stats.quizCount, icon: '❓', color: 'from-amber-500 to-orange-600' },
          { label: 'RPP Dibuat', value: stats.rppCount, icon: '📋', color: 'from-emerald-500 to-teal-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{stat.label}</span>
              <span className="text-xl">{stat.icon}</span>
            </div>
            <p className="text-3xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Role Distribution */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-5">
          <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Admin</p>
          <p className="text-2xl font-bold text-white mt-2">{users?.filter(u => u.role === 'admin').length ?? 0}</p>
        </div>
        <div className="bg-violet-500/5 border border-violet-500/10 rounded-2xl p-5">
          <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider">Guru</p>
          <p className="text-2xl font-bold text-white mt-2">{stats.guruCount}</p>
        </div>
        <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-5">
          <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Siswa</p>
          <p className="text-2xl font-bold text-white mt-2">{stats.siswaCount}</p>
        </div>
      </div>

      {/* Recent Users Table */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Pengguna Terbaru</h2>
        <div className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-5 py-3">Nama</th>
                <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-5 py-3">Role</th>
                <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-5 py-3">Kuota</th>
                <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-5 py-3">Bergabung</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((user) => (
                <tr key={user.id} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                  <td className="px-5 py-3 text-white">{user.full_name ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                      user.role === 'admin' ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' :
                      user.role === 'guru' ? 'bg-violet-500/15 text-violet-400 border-violet-500/20' :
                      'bg-blue-500/15 text-blue-400 border-blue-500/20'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400">{user.quota_used}/{user.quota_limit}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
