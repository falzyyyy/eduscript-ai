import fs from 'fs'
import path from 'path'
import { createClient } from '@/lib/supabase/server'
import { SYSTEM_PROMPTS, buildUserPrompt } from '@/lib/ai'

export const maxDuration = 60

export async function POST(req: Request) {
  // Load the absolute latest API key directly from disk to bypass all Next.js caching!
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
    return new Response(JSON.stringify({ error: 'Kunci API Groq (GEMINI_API_KEY) tidak ditemukan di .env.local' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Tidak terotorisasi' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Check quota
  const { data: profile } = await supabase
    .from('profiles')
    .select('quota_used, quota_limit')
    .eq('id', user.id)
    .single()

  if (profile && profile.quota_used >= profile.quota_limit) {
    return new Response(JSON.stringify({ error: 'Kuota habis. Hubungi admin untuk menambah kuota.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { type, topic, options } = await req.json()
  const userPrompt = buildUserPrompt(type, topic, options)
  const systemPrompt = SYSTEM_PROMPTS[type as keyof typeof SYSTEM_PROMPTS]

  if (!systemPrompt) {
    return new Response(JSON.stringify({ error: 'Tipe konten tidak valid' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
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
        temperature: 0.3,
        stream: true
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Groq API Error Status:', response.status, errText)
      throw new Error(`Groq API returned status ${response.status}`)
    }

    // Convert the Groq response stream to raw text stream
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const reader = response.body!.getReader()

    const readable = new ReadableStream({
      async start(controller) {
        let buffer = ''
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || '' // keep incomplete line in buffer

            for (const line of lines) {
              const cleanedLine = line.trim()
              if (!cleanedLine) continue
              if (cleanedLine === 'data: [DONE]') continue

              if (cleanedLine.startsWith('data: ')) {
                try {
                  const jsonStr = cleanedLine.slice(6)
                  const parsed = JSON.parse(jsonStr)
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    controller.enqueue(encoder.encode(content))
                  }
                } catch (e) {
                  // Ignore JSON parse errors for incomplete chunks
                }
              }
            }
          }
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      }
    })

    // Increment quota
    await supabase
      .from('profiles')
      .update({ quota_used: (profile?.quota_used ?? 0) + 1 })
      .eq('id', user.id)

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })

  } catch (err: any) {
    console.error('Groq Generation Error:', err)
    
    let friendlyMessage = 'Gagal membuat konten dengan AI Groq. Terjadi kesalahan pada server.'
    if (err?.message?.includes('status 401') || err?.message?.includes('status 403')) {
      friendlyMessage = 'Kunci API Groq Anda tidak valid! Silakan periksa kembali kunci API di file .env.local Anda.'
    } else if (err?.message) {
      friendlyMessage = `Kesalahan AI Groq: ${err.message}`
    }

    return new Response(JSON.stringify({ error: friendlyMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
