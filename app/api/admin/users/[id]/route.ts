import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const targetId = params.id
  
  // 1. Authenticate the caller
  const supabase = await createClient()
  const { data: { user: callerUser } } = await supabase.auth.getUser()

  if (!callerUser) {
    return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })
  }

  // 2. Fetch the caller's profile role
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', callerUser.id)
    .single()

  if (!callerProfile || (callerProfile.role !== 'admin' && callerProfile.role !== 'guru')) {
    return NextResponse.json({ error: 'Hak akses ditolak' }, { status: 403 })
  }

  // 3. Fetch the target user's profile to verify role constraints
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', targetId)
    .single()

  if (!targetProfile) {
    return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 444 })
  }

  // Security Gate: Guru is ONLY allowed to delete students ('siswa')
  if (callerProfile.role === 'guru' && targetProfile.role !== 'siswa') {
    return NextResponse.json({ error: 'Guru hanya dapat menghapus akun siswa' }, { status: 403 })
  }

  // Security Gate: Cannot delete self
  if (callerUser.id === targetId) {
    return NextResponse.json({ error: 'Anda tidak dapat menghapus akun Anda sendiri' }, { status: 400 })
  }

  // 4. Delete user using Supabase service role admin client
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(targetId)

  if (deleteAuthError) {
    return NextResponse.json({ error: deleteAuthError.message }, { status: 500 })
  }

  // 5. Also delete from profiles directly to clear records (just to be safe)
  await supabaseAdmin.from('profiles').delete().eq('id', targetId)

  return NextResponse.json({ success: true, message: 'Akun berhasil dihapus secara permanen' })
}
