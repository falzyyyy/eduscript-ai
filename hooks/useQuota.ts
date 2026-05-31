'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useQuota() {
  const [quotaUsed, setQuotaUsed] = useState(0)
  const [quotaLimit, setQuotaLimit] = useState(50)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function fetchQuota() {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData || !authData.user) return
      const user = authData.user

      const { data } = await supabase
        .from('profiles')
        .select('quota_used, quota_limit')
        .eq('id', user.id)
        .single()

      if (data) {
        setQuotaUsed(data.quota_used)
        setQuotaLimit(data.quota_limit)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuota()
  }, [])

  const remaining = quotaLimit - quotaUsed
  const percentage = quotaLimit > 0 ? (quotaUsed / quotaLimit) * 100 : 0

  return { quotaUsed, quotaLimit, remaining, percentage, loading, refetch: fetchQuota }
}
