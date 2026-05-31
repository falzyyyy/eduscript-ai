'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Document, DocumentType } from '@/types'

export function useDocuments(filterType?: DocumentType) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })

      if (filterType) {
        query = query.eq('type', filterType)
      }

      const { data } = await query
      setDocuments(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [filterType])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const deleteDocument = async (id: string) => {
    await supabase.from('documents').delete().eq('id', id)
    setDocuments(prev => prev.filter(d => d.id !== id))
  }

  return { documents, loading, refetch: fetchDocuments, deleteDocument }
}
