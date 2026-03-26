import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role so this public route can read short_links without RLS issues
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(
  _request: NextRequest,
  { params }: { params: { code: string } },
) {
  const { code } = params

  if (!code) {
    return NextResponse.redirect('/')
  }

  const { data, error } = await supabase
    .from('short_links')
    .select('url')
    .eq('code', code)
    .maybeSingle()

  if (error || !data?.url) {
    // Code not found — send to homepage rather than a 404
    return NextResponse.redirect(
      new URL('/', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
    )
  }

  return NextResponse.redirect(data.url, { status: 301 })
}
