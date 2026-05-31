'use client'
import { useQuota } from '@/hooks/useQuota'
import { useUser } from '@/hooks/useUser'

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { quotaUsed, quotaLimit, percentage } = useQuota()
  const { profile } = useUser()

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-white/[0.06] bg-[#080c16]/80 backdrop-blur-xl flex items-center justify-between px-4 lg:px-6">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Title area */}
      <div className="hidden lg:flex items-center gap-2 text-sm text-gray-400">
        <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span>Powered by <span className="text-violet-400 font-medium">Gemini AI</span></span>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Quota indicator */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] text-gray-500 font-medium">Kuota</p>
            <p className="text-sm font-semibold text-white">{quotaUsed}<span className="text-gray-500">/{quotaLimit}</span></p>
          </div>
          <div className="w-24 h-2 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percentage >= 90 ? 'bg-red-500' :
                percentage >= 70 ? 'bg-amber-500' :
                'bg-gradient-to-r from-violet-500 to-indigo-500'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>

        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-xs">
          {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  )
}
