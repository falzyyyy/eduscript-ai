import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('*, documents(title, topic), profiles(full_name)')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })
  }

  const body = await req.json()
  const { document_id, score, total_questions, answers } = body

  if (!document_id || score === undefined || !total_questions || !answers) {
    return NextResponse.json({ error: 'Data pengerjaan kuis tidak lengkap' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('quiz_attempts')
    .insert({
      user_id: user.id,
      document_id,
      score,
      total_questions,
      answers,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
