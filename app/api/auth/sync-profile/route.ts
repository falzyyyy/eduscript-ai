import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // 1. Get the Authorization header (the JWT token) from the request
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    // 2. Initialize a secure Supabase Admin Client using service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 3. Verify the user's token with Supabase Auth
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // 4. Check if the profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      return NextResponse.json({ message: 'Profile already exists', profile: existingProfile })
    }

    // 5. If it doesn't exist, create it securely as 'siswa'
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Siswa EduScript'
    
    const { data: newProfile, error: insertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: user.id,
        full_name: fullName,
        role: 'siswa',
        quota_limit: 50,
        quota_used: 0
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting profile:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Profile synchronized successfully', profile: newProfile })
  } catch (error: any) {
    console.error('Sync profile error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
