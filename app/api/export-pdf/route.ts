import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { content, type, topic } = await req.json()

    // We use jsPDF on the client-side for better compatibility
    // This endpoint provides a fallback for server-side generation
    // For now, return the content as a downloadable text file
    const headers = new Headers()
    headers.set('Content-Type', 'application/pdf')
    headers.set('Content-Disposition', `attachment; filename="eduscript-${type}-${topic}.pdf"`)

    // Generate simple PDF using text encoding
    // The actual PDF generation happens client-side with jsPDF for richer formatting
    return NextResponse.json({
      message: 'Gunakan export client-side untuk PDF yang lebih baik',
      content,
      type,
      topic,
    })
  } catch {
    return NextResponse.json({ error: 'Gagal export PDF' }, { status: 500 })
  }
}
