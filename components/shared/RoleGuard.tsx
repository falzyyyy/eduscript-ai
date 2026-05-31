'use client'
import { useUser } from '@/hooks/useUser'
import type { UserRole } from '@/types'
import { ReactNode } from 'react'

interface RoleGuardProps {
  children: ReactNode
  allowedRoles: UserRole[]
  fallback?: ReactNode
}

export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  const { profile, loading } = useUser()

  if (loading) return null
  if (!profile) return null
  if (!allowedRoles.includes(profile.role)) return <>{fallback}</>

  return <>{children}</>
}
