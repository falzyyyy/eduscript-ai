'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Profile } from '@/types'

export default function AdminQuotaPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [bulkQuota, setBulkQuota] = useState('50')
  const [updating, setUpdating] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('quota_used', { ascending: false })
    setUsers(data ?? [])
    setLoading(false)
  }

  async function handleBulkUpdate() {
    setUpdating(true)
    await supabase
      .from('profiles')
      .update({ quota_limit: parseInt(bulkQuota) })
      .neq('role', 'admin')
    await fetchUsers()
    setUpdating(false)
  }

  async function resetAllQuota() {
    setUpdating(true)
    await supabase
      .from('profiles')
      .update({ quota_used: 0 })
      .neq('role', 'admin')
    await fetchUsers()
    setUpdating(false)
  }

  const totalUsed = users.reduce((sum, u) => sum + u.quota_used, 0)
  const totalLimit = users.reduce((sum, u) => sum + u.quota_limit, 0)
  const usersAtLimit = users.filter(u => u.quota_used >= u.quota_limit).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Kelola Kuota</h1>
        <p className="text-gray-400 text-sm mt-1">Analisis dan kelola kuota generate pengguna</p>
      </div>

      {/* Overview Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Generate</p>
          <p className="text-3xl font-bold text-white mt-2">{totalUsed}</p>
          <p className="text-xs text-gray-500 mt-1">dari {totalLimit} total kuota</p>
        </div>
        <div className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">User Limit Habis</p>
          <p className={`text-3xl font-bold mt-2 ${usersAtLimit > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{usersAtLimit}</p>
          <p className="text-xs text-gray-500 mt-1">pengguna mencapai batas kuota</p>
        </div>
        <div className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Rata-rata Penggunaan</p>
          <p className="text-3xl font-bold text-white mt-2">
            {users.length > 0 ? Math.round(totalUsed / users.length) : 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">generate per pengguna</p>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Aksi Massal</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-end gap-3">
            <div>
              <Label className="text-gray-300 text-sm mb-1.5 block">Batas Kuota Baru</Label>
              <Input
                type="number"
                value={bulkQuota}
                onChange={(e) => setBulkQuota(e.target.value)}
                className="w-32 h-10 bg-white/[0.03] border-white/[0.08] text-white"
              />
            </div>
            <Button
              onClick={handleBulkUpdate}
              disabled={updating}
              className="h-10 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500"
            >
              {updating ? 'Memperbarui...' : 'Terapkan Semua'}
            </Button>
          </div>
          <div className="sm:ml-auto">
            <Button
              onClick={resetAllQuota}
              disabled={updating}
              variant="outline"
              className="h-10 border-amber-500/20 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
            >
              Reset Kuota Terpakai
            </Button>
          </div>
        </div>
      </div>

      {/* User Quota Table */}
      {!loading && (
        <div className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-5 py-3">Pengguna</th>
                <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-5 py-3">Role</th>
                <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-5 py-3">Penggunaan</th>
                <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-5 py-3">Progress</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const pct = user.quota_limit > 0 ? (user.quota_used / user.quota_limit) * 100 : 0
                return (
                  <tr key={user.id} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                    <td className="px-5 py-3 text-white font-medium">{user.full_name ?? '—'}</td>
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
                    <td className="px-5 py-3">
                      <div className="w-32 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-violet-500'
                          }`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
