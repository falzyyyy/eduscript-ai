'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

export function useUser() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function getProfile() {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError || !authData || !authData.user) {
          setProfile(null)
          setLoading(false)
          return
        }
        const user = authData.user

        let { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error || !data) {
          console.warn('Profile not found, attempting automatic server-side synchronization...')
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) {
            const syncRes = await fetch('/api/auth/sync-profile', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            })
            if (syncRes.ok) {
              const syncData = await syncRes.json()
              data = syncData.profile
              error = null
            }
          }
        }

        if (error || !data) {
          console.error('Error fetching or syncing profile:', error)
          setProfile(null)
        } else {
          setProfile(data)
        }
      } catch (err) {
        console.error('Unexpected error in getProfile:', err)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    getProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      getProfile()
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return { profile, loading, signOut }
}
