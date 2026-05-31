import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(req: Request) {
  // Load the absolute latest API key directly from disk
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
    console.error('Error reading .env.local in grade-essay route:', e)
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Kunci API Groq (GEMINI_API_KEY) tidak ditemukan di server.' },
      { status: 500 }
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })
  }

  try {
    const { question, studentAnswer, keyAnswer } = await req.json()

    if (!question || studentAnswer === undefined || !keyAnswer) {
      return NextResponse.json(
        { error: 'Parameter tidak lengkap (question, studentAnswer, keyAnswer diperlukan).' },
        { status: 400 }
      )
    }

    const systemPrompt = `Anda adalah Asisten Penilai AI profesional untuk platform EduScript AI.
Tugas Anda adalah menilai jawaban essay siswa berdasarkan Pertanyaan dan Kunci Jawaban / Kriteria Acuan yang diberikan oleh Guru secara adil, objektif, dan presisi.
Bandingkan kemiripan inti konten, keakuratan konsep, dan kelengkapan informasi. Berikan nilai rasional antara 0 sampai 100.

Anda HARUS mengembalikan respon dalam format JSON yang valid seperti di bawah ini tanpa teks pengantar, penutup, atau tanda markdown (seperti \`\`\`json) apa pun:
{
  "score": <angka antara 0 sampai 100>,
  "explanation": "<ulasan singkat 2-3 kalimat yang konstruktif dan sopan tentang jawaban siswa dalam Bahasa Indonesia>"
}`

    const userPrompt = `Pertanyaan: "${question}"\n\nKunci Jawaban Acuan Guru: "${keyAnswer}"\n\nJawaban Murid: "${studentAnswer}"`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Groq Essay Grading API Error:', errText)
      throw new Error(`Groq API returned status ${response.status}`)
    }

    const result = await response.json()
    const responseText = result.choices?.[0]?.message?.content?.trim() || '{}'
    
    // Parse the JSON response from Groq
    const parsedGrading = JSON.parse(responseText)

    return NextResponse.json({
      score: typeof parsedGrading.score === 'number' ? parsedGrading.score : 0,
      explanation: parsedGrading.explanation || 'Jawaban telah dinilai oleh AI.'
    })

  } catch (err: any) {
    console.error('Essay Grading Error:', err)
    return NextResponse.json(
      { error: `Gagal melakukan grading AI: ${err.message || 'Terjadi kesalahan internal.'}` },
      { status: 500 }
    )
  }
}
