'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface ExportButtonProps {
  content: string
  type: string
  topic: string
}

export function ExportButton({ content, type, topic }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      // Dynamic import jsPDF for client-side only
      const { default: jsPDF } = await import('jspdf')

      const doc = new jsPDF()
      const margin = 20
      const pageWidth = doc.internal.pageSize.getWidth() - margin * 2
      let y = margin

      // Title
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text(`EduScript AI — ${type === 'quiz' ? 'Kuis' : type === 'lesson_plan' ? 'RPP' : 'Ringkasan'}`, margin, y)
      y += 10

      doc.setFontSize(14)
      doc.text(topic, margin, y)
      y += 12

      // Content
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')

      let parsed: Record<string, unknown> | null = null
      try { parsed = JSON.parse(content) } catch { /* not JSON */ }

      if (parsed) {
        const lines = JSON.stringify(parsed, null, 2).split('\n')
        for (const line of lines) {
          if (y > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage()
            y = margin
          }
          const wrappedLines = doc.splitTextToSize(line, pageWidth)
          doc.text(wrappedLines, margin, y)
          y += wrappedLines.length * 5
        }
      } else {
        const lines = doc.splitTextToSize(content, pageWidth)
        for (const line of lines) {
          if (y > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage()
            y = margin
          }
          doc.text(line, margin, y)
          y += 5
        }
      }

      // Footer
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(
          `EduScript AI — Halaman ${i}/${pageCount}`,
          margin,
          doc.internal.pageSize.getHeight() - 10
        )
      }

      doc.save(`eduscript-${type}-${topic.replace(/\s+/g, '_')}.pdf`)
    } catch (err) {
      console.error('Export PDF error:', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {exporting ? 'Mengekspor...' : 'Export PDF'}
    </Button>
  )
}
