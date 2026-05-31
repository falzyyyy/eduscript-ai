import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(req: Request) {
  // Load API Key directly from disk
  let apiKey = process.env.GEMINI_API_KEY
  try {
    const envPath = path.join(process.cwd(), '.env.local')
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8')
      const match = envContent.match(/GEMINI_API_KEY\s*=\s*([^\r\n]+)/)
      if (match && match[1]) {
        apiKey = match[1].trim()
      }
    }
  } catch (e) {
    console.error('Error reading .env.local directly:', e)
  }

  if (!apiKey) {
    return NextResponse.json({ error: 'Kunci API Groq (GEMINI_API_KEY) tidak ditemukan' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })
  }

  try {
    const { studentName, subject, attempts } = await req.json()

    if (!attempts || attempts.length === 0) {
      return NextResponse.json({ advice: 'Anda belum mengambil kuis di kelas ini. Kerjakan kuis pertama Anda untuk mendapatkan saran belajar dari AI!' })
    }

    const attemptsSummary = attempts
      .map((att: any, idx: number) => {
        const title = att.documents?.title || 'Kuis ' + (idx + 1)
        const percent = Math.round((att.score / att.total_questions) * 100)
        return `- ${title} (Topik: ${att.documents?.topic || 'N/A'}): Skor ${percent}%`
      })
      .join('\n')

    const prompt = `Anda adalah Mentor Belajar AI di platform EduScript.
Berikut adalah data performa siswa pada mata pelajaran ${subject}:
Nama Siswa: ${studentName}

Riwayat Nilai Kuis:
${attemptsSummary}

Tugas Anda:
1. Berikan analisis performa belajar siswa ini secara ramah, memotivasi, dan objektif dalam Bahasa Indonesia.
2. Identifikasi topik yang sudah sangat mereka kuasai (skor >= 70%) dan topik yang membutuhkan perhatian lebih (skor < 70%).
3. Berikan 3 tips belajar spesifik yang aplikatif agar mereka dapat meningkatkan pemahaman konsep mereka.

Buat respons Anda sangat rapi menggunakan Markdown. Gunakan emoji agar menarik dibaca siswa.`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Anda adalah asisten pendidikan pintar yang memberikan saran belajar akademis kepada siswa.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 1000
      })
    })

    if (!response.ok) {
      throw new Error(`Groq API returned status ${response.status}`)
    }

    const data = await response.json()
    const advice = data.choices?.[0]?.message?.content || 'Gagal menghasilkan rekomendasi belajar AI.'

    return NextResponse.json({ advice })

  } catch (err: any) {
    console.error('Study Advice Generation Error:', err)
    return NextResponse.json({ error: 'Gagal menghubungi AI: ' + err.message }, { status: 500 })
  }
}
