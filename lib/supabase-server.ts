import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * Creates a Supabase client for use in API routes (NextRequest)
 * Extracts the access token from the Authorization header
 */
export function createServerSupabaseClient(request: NextRequest) {
  // Extract Authorization header
  const authHeader = request.headers.get('Authorization')
  let accessToken: string | undefined

  if (authHeader && authHeader.startsWith('Bearer ')) {
    accessToken = authHeader.substring(7)
  }

  // Create Supabase client with the access token
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken ? {
        Authorization: `Bearer ${accessToken}`
      } : {}
    }
  })

  return supabase
}

