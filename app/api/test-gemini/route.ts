import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
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
    return NextResponse.json({ error: 'No Groq API Key found in .env.local' })
  }

  const modelsToTest = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant'
  ]

  const results: Record<string, any> = {}

  for (const modelName of modelsToTest) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'user', content: 'Say "Groq is active!"' }
          ],
          max_tokens: 20
        })
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Status ${res.status}: ${text}`)
      }

      const json = await res.json()
      const responseText = json.choices?.[0]?.message?.content?.trim()
      results[modelName] = { status: 'success', response: responseText }
    } catch (err: any) {
      results[modelName] = { status: 'failed', error: err?.message || String(err) }
    }
  }

  return NextResponse.json({
    provider: 'Groq Cloud',
    apiKeyUsed: apiKey.substring(0, 10) + '...',
    results
  })
}
