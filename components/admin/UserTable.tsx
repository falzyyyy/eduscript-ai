'use client'
import type { Profile, UserRole } from '@/types'

interface UserTableProps {
  users: Profile[]
  onUpdateRole?: (userId: string, role: UserRole) => void
}

export function UserTable({ users, onUpdateRole }: UserTableProps) {
  return (
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
          {users.map((user) => (
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
              <td className="px-5 py-3 text-gray-500 text-xs">
                {new Date(user.created_at).toLocaleDateString('id-ID')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
