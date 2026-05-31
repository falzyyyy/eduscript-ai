'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, UserRole } from '@/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/Toast'

export default function AdminUsersPage() {
  const { toasts, addToast, ToastComponent } = useToast()
  const [users, setUsers] = useState<Profile[]>([])
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Modal & Form State
  const [showImportModal, setShowImportModal] = useState(false)
  const [importMode, setImportMode] = useState<'single' | 'bulk'>('single')
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState('')
  const [modalSuccess, setModalSuccess] = useState('')

  // Single User Form
  const [newFullName, setNewFullName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'siswa' | 'guru' | 'admin'>('siswa')
  const [newQuota, setNewQuota] = useState(50)

  // Bulk CSV Form
  const [bulkCsvText, setBulkCsvText] = useState('')

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
      addToast('Akses Ditolak', 'Guru tidak memiliki izin untuk mengubah peran pengguna.', 'error')
      return
    }

    await supabase.from('profiles').update({ role }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
    addToast('Peran Diperbarui', 'Berhasil memperbarui peran pengguna.', 'success')
  }

  async function updateQuota(userId: string, quotaLimit: number) {
    // Restrict Guru from changing quota
    if (currentUser?.role === 'guru') {
      addToast('Akses Ditolak', 'Guru tidak memiliki izin untuk mengubah kuota pengguna.', 'error')
      return
    }

    await supabase.from('profiles').update({ quota_limit: quotaLimit }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, quota_limit: quotaLimit } : u))
    addToast('Kuota Diperbarui', `Berhasil memperbarui kuota menjadi ${quotaLimit}.`, 'success')
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
        addToast('Akun Dihapus', 'Akun berhasil dihapus secara permanen.', 'success')
      } else {
        const errData = await res.json()
        addToast('Hapus Gagal', errData.error || 'Gagal menghapus akun.', 'error')
      }
    } catch {
      addToast('Kesalahan Koneksi', 'Terjadi kesalahan koneksi server.', 'error')
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    setModalLoading(true)
    setModalError('')
    setModalSuccess('')

    try {
      const payload = importMode === 'single' 
        ? {
            mode: 'single',
            userPayload: {
              fullName: newFullName,
              email: newEmail,
              password: newPassword,
              role: newRole,
              quotaLimit: newQuota
            }
          }
        : {
            mode: 'bulk',
            bulkPayload: {
              csvText: bulkCsvText
            }
          }

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan data pengguna.')
      }

      setModalSuccess(data.message)
      
      // Reset forms
      if (importMode === 'single') {
        setNewFullName('')
        setNewEmail('')
        setNewPassword('')
        setNewRole('siswa')
        setNewQuota(50)
      } else {
        setBulkCsvText('')
      }

      // Refresh list
      fetchUsers()
    } catch (err: any) {
      setModalError(err.message || 'Terjadi kesalahan.')
    } finally {
      setModalLoading(false)
    }
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Kelola Pengguna</h1>
          <p className="text-gray-400 text-sm mt-1">
            {currentUser?.role === 'guru' 
              ? 'Lihat daftar pengguna platform dan kelola akun siswa Anda' 
              : 'Atur role, kuota, serta lakukan pengelolaan hapus akun pengguna platform'}
          </p>
        </div>
        {currentUser?.role === 'admin' && (
          <Button
            onClick={() => {
              setModalError('')
              setModalSuccess('')
              setShowImportModal(true)
            }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 transition-all text-xs"
          >
            ➕ Tambah / Impor Pengguna
          </Button>
        )}
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

      {/* SINGLE & BULK IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1224] border border-white/[0.08] rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
            <button
              onClick={() => setShowImportModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>
            
            <h3 className="text-lg font-bold text-white mb-4">➕ Tambah & Impor Pengguna</h3>
            
            {/* Tab Selector */}
            <div className="flex bg-white/[0.03] border border-white/[0.08] p-1 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setImportMode('single')
                  setModalError('')
                  setModalSuccess('')
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  importMode === 'single'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Pendaftaran Manual
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportMode('bulk')
                  setModalError('')
                  setModalSuccess('')
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  importMode === 'bulk'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Impor Massal (CSV)
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              {importMode === 'single' ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="newFullName" className="text-gray-300 text-xs">Nama Lengkap</Label>
                    <Input
                      id="newFullName"
                      placeholder="Masukkan nama lengkap..."
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      required
                      className="bg-white/[0.03] border-white/[0.08] text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="newEmail" className="text-gray-300 text-xs">Alamat Email</Label>
                    <Input
                      id="newEmail"
                      type="email"
                      placeholder="nama@domain.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                      className="bg-white/[0.03] border-white/[0.08] text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword" className="text-gray-300 text-xs">Kata Sandi Awal</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Minimal 6 karakter..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="bg-white/[0.03] border-white/[0.08] text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-gray-300 text-xs">Peran (Role)</Label>
                      <Select value={newRole} onValueChange={(v) => setNewRole(v as any)}>
                        <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="siswa">🎓 Siswa</SelectItem>
                          <SelectItem value="guru">👨‍🏫 Guru</SelectItem>
                          <SelectItem value="admin">🛡️ Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-300 text-xs">Batas Kuota Awal</Label>
                      <Select value={String(newQuota)} onValueChange={(v) => v && setNewQuota(parseInt(v))}>
                        <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[10, 25, 50, 100, 200, 500].map(n => (
                            <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label className="text-gray-300 text-xs">Data CSV Akun</Label>
                  <p className="text-[10px] text-gray-500">
                    Format baris: <code className="text-blue-400">nama,email,password,role</code> (tanpa spasi setelah koma). <br />
                    Pilihan role: <code className="text-blue-400">siswa</code>, <code className="text-blue-400">guru</code>, atau <code className="text-blue-400">admin</code>.
                  </p>
                  <textarea
                    placeholder="Budi Utomo,budi@email.com,budi1234,siswa&#10;Ani Lestari,ani@email.com,ani5678,guru"
                    value={bulkCsvText}
                    onChange={(e) => setBulkCsvText(e.target.value)}
                    required
                    rows={6}
                    className="w-full bg-white/[0.03] border border-white/[0.08] text-white rounded-xl p-3 placeholder:text-gray-600 focus:outline-none focus:border-blue-500 text-xs transition-colors font-mono"
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

              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 h-11 bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] text-white text-xs font-semibold rounded-xl"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg"
                >
                  {modalLoading ? 'Memproses...' : 'Simpan & Daftarkan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ToastComponent />
    </div>
  )
}

