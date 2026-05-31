import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('documents')
    .select('*')
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
  const { type, title, topic, content, metadata, class_group, subject, prerequisite_id, class_id } = body

  const { data, error } = await supabase
    .from('documents')
    .insert({
      user_id: user.id,
      type,
      title,
      topic,
      content,
      metadata: metadata || {},
      class_group,
      subject,
      prerequisite_id: prerequisite_id || null,
      class_id: class_id || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID dokumen diperlukan' }, { status: 400 })
  }

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
