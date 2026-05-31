'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, UserRole } from '@/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchCurrentUser()
    fetchUsers()
  }, [])

  async function fetchCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setCurrentUser(data)
    }
  }

  async function fetchUsers() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setUsers(data ?? [])
    setLoading(false)
  }

  async function updateRole(userId: string, role: UserRole) {
    // Restrict Guru from changing roles
    if (currentUser?.role === 'guru') {
      alert('Guru tidak memiliki izin untuk mengubah peran pengguna.')
      return
    }

    await supabase.from('profiles').update({ role }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
  }

  async function updateQuota(userId: string, quotaLimit: number) {
    // Restrict Guru from changing quota
    if (currentUser?.role === 'guru') {
      alert('Guru tidak memiliki izin untuk mengubah kuota pengguna.')
      return
    }

    await supabase.from('profiles').update({ quota_limit: quotaLimit }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, quota_limit: quotaLimit } : u))
  }

  async function handleDelete(userId: string) {
    const confirmDelete = confirm(
      'Apakah Anda yakin ingin menghapus akun ini secara permanen?\nSemua berkas pembelajaran dan riwayat kuis pengguna ini juga akan ikut dihapus secara bersih.'
    )
    if (!confirmDelete) return

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId))
        alert('Akun berhasil dihapus secara permanen.')
      } else {
        const errData = await res.json()
        alert(errData.error || 'Gagal menghapus akun.')
      }
    } catch {
      alert('Terjadi kesalahan koneksi server.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Kelola Pengguna</h1>
        <p className="text-gray-400 text-sm mt-1">
          {currentUser?.role === 'guru' 
            ? 'Lihat daftar pengguna platform dan kelola akun siswa Anda' 
            : 'Atur role, kuota, serta lakukan pengelolaan hapus akun pengguna platform'}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Memuat pengguna...</div>
      ) : (
        <div className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-5 py-3">Nama</th>
                  <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-5 py-3">Role</th>
                  <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-5 py-3">Kuota Terpakai</th>
                  <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-5 py-3">Batas Kuota</th>
                  <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-5 py-3">Bergabung</th>
                  <th className="text-center text-xs text-gray-500 font-medium uppercase tracking-wider px-5 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = user.id === currentUser?.id
                  const isGuru = currentUser?.role === 'guru'
                  const isAdmin = currentUser?.role === 'admin'
                  
                  // Security Gate:
                  // Guru can ONLY delete Students ('siswa').
                  // Admin can delete anyone except self.
                  const canDelete = 
                    (isGuru && user.role === 'siswa') || 
                    (isAdmin && !isSelf)

                  return (
                    <tr key={user.id} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-xs font-semibold">
                            {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <span className="text-white font-medium block">
                              {user.full_name ?? '—'}
                              {isSelf && <span className="text-[10px] text-violet-400 ml-1.5 font-bold">(Anda)</span>}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Select 
                          value={user.role} 
                          onValueChange={(v) => updateRole(user.id, v as UserRole)}
                          disabled={isGuru || isSelf} // Guru cannot change roles, users cannot change their own roles
                        >
                          <SelectTrigger className="w-32 h-8 text-xs bg-white/[0.03] border-white/[0.08]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">🛡️ Admin</SelectItem>
                            <SelectItem value="guru">👨‍🏫 Guru</SelectItem>
                            <SelectItem value="siswa">🎓 Siswa</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-5 py-3 text-gray-400">{user.quota_used}</td>
                      <td className="px-5 py-3">
                        <Select 
                          value={String(user.quota_limit)} 
                          onValueChange={(v) => v && updateQuota(user.id, parseInt(v))}
                          disabled={isGuru} // Guru cannot change quota limit
                        >
                          <SelectTrigger className="w-24 h-8 text-xs bg-white/[0.03] border-white/[0.08]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[10, 25, 50, 100, 200, 500].map(n => (
                              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {new Date(user.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {canDelete ? (
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/25 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow-sm"
                          >
                            🗑️ Hapus Akun
                          </button>
                        ) : (
                          <span className="text-xs text-gray-600">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
