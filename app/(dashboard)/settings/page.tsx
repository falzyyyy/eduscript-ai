'use client'
import { useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { useQuota } from '@/hooks/useQuota'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SettingsPage() {
  const { profile } = useUser()
  const { quotaUsed, quotaLimit, percentage } = useQuota()
  const [name, setName] = useState(profile?.full_name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    await supabase
      .from('profiles')
      .update({ full_name: name })
      .eq('id', profile.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Pengaturan</h1>
        <p className="text-gray-400 text-sm mt-1">Kelola profil dan informasi akun</p>
      </div>

      {/* Profile Card */}
      <div className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Profil</h2>
        <div>
          <Label className="text-gray-300 text-sm mb-1.5 block">Nama Lengkap</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 bg-white/[0.03] border-white/[0.08] text-white max-w-md"
          />
        </div>
        <div>
          <Label className="text-gray-300 text-sm mb-1.5 block">Role</Label>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${
              profile?.role === 'admin' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
              profile?.role === 'guru' ? 'bg-violet-500/15 text-violet-400 border border-violet-500/20' :
              'bg-blue-500/15 text-blue-400 border border-blue-500/20'
            }`}>
              {profile?.role === 'admin' ? '🛡️ Admin' : profile?.role === 'guru' ? '👨‍🏫 Guru' : '🎓 Siswa'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500"
          >
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
          {saved && <span className="text-sm text-emerald-400">✓ Tersimpan!</span>}
        </div>
      </div>

      {/* Quota Card */}
      <div className="bg-[#0d1224]/60 border border-white/[0.06] rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Kuota Generate</h2>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-bold text-white">{quotaUsed}</span>
          <span className="text-xl text-gray-500 mb-1">/ {quotaLimit}</span>
        </div>
        <div className="w-full h-3 bg-white/[0.04] rounded-full overflow-hidden max-w-md">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              percentage >= 90 ? 'bg-red-500' :
              percentage >= 70 ? 'bg-amber-500' :
              'bg-gradient-to-r from-violet-500 to-indigo-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <p className="text-sm text-gray-500">
          {quotaLimit - quotaUsed} generate tersisa. Hubungi admin untuk menambah kuota.
        </p>
      </div>
    </div>
  )
}
