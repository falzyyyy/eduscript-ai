import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  // 1. Authenticate caller and verify Admin role
  const supabase = await createClient()
  const { data: { user: caller } } = await supabase.auth.getUser()

  if (!caller) {
    return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })
  }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single()

  if (!callerProfile || callerProfile.role !== 'admin') {
    return NextResponse.json({ error: 'Akses ditolak. Hanya Admin yang memiliki wewenang ini.' }, { status: 403 })
  }

  // 2. Load service role client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return NextResponse.json({ 
      error: 'SUPABASE_SERVICE_ROLE_KEY belum terpasang atau kosong di server. Silakan konfigurasi file .env.local atau Vercel.' 
    }, { status: 500 })
  }

  const supabaseAdmin = createAdminClient(url, serviceKey)

  try {
    const body = await req.json()
    const { mode, userPayload, bulkPayload } = body // mode: 'single' | 'bulk'

    if (mode === 'single') {
      const { fullName, email, password, role, quotaLimit } = userPayload

      if (!fullName || !email || !password || !role) {
        return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 })
      }

      // Create auth user
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      })

      if (authError || !authUser.user) {
        return NextResponse.json({ error: authError?.message || 'Gagal mendaftarkan akun auth.' }, { status: 500 })
      }

      // Upsert profile record
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: authUser.user.id,
          full_name: fullName,
          role,
          quota_limit: quotaLimit || 50,
          quota_used: 0
        })

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: `Akun ${email} berhasil didaftarkan!` })

    } else if (mode === 'bulk') {
      const { csvText } = bulkPayload

      if (!csvText?.trim()) {
        return NextResponse.json({ error: 'Data CSV kosong' }, { status: 400 })
      }

      // Simple CSV Parser
      const lines = csvText.split('\n').map((l: string) => l.trim()).filter(Boolean)
      const results: { email: string; status: string; error?: string }[] = []

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        
        // Skip header line if present
        if (i === 0 && (line.toLowerCase().includes('email') || line.toLowerCase().includes('nama'))) {
          continue
        }

        const parts = line.split(',').map((p: string) => p.trim())
        if (parts.length < 4) {
          results.push({ email: parts[1] || `Baris ${i + 1}`, status: 'gagal', error: 'Format kolom tidak lengkap (harus: nama,email,password,role)' })
          continue
        }

        const [fullName, email, password, role] = parts
        const roleClean = role.toLowerCase() as 'siswa' | 'guru' | 'admin'

        if (!['siswa', 'guru', 'admin'].includes(roleClean)) {
          results.push({ email, status: 'gagal', error: `Role '${role}' tidak valid (harus: siswa/guru/admin)` })
          continue
        }

        // Create auth user
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName }
        })

        if (authError || !authUser.user) {
          results.push({ email, status: 'gagal', error: authError?.message || 'Gagal mendaftarkan auth' })
          continue
        }

        // Upsert profile
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: authUser.user.id,
            full_name: fullName,
            role: roleClean,
            quota_limit: 50,
            quota_used: 0
          })

        if (profileError) {
          results.push({ email, status: 'gagal', error: profileError.message })
        } else {
          results.push({ email, status: 'sukses' })
        }
      }

      const totalSuccess = results.filter(r => r.status === 'sukses').length
      return NextResponse.json({
        success: true,
        message: `Impor selesai! Berhasil mendaftarkan ${totalSuccess} dari ${results.length} akun.`,
        details: results
      })

    } else {
      return NextResponse.json({ error: 'Mode tidak valid' }, { status: 400 })
    }

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal server' }, { status: 500 })
  }
}
