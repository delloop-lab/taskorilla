import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * Creates a Supabase client for use in API routes (NextRequest)
 * Reads auth from cookies (browser) or Authorization header (API clients)
 */
export function createServerSupabaseClient(request: NextRequest) {
  // Extract Authorization header for API clients
  const authHeader = request.headers.get('Authorization')
  
  // Create Supabase client that reads cookies from the request
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        // Parse cookies from the request
        const cookieHeader = request.headers.get('cookie') || ''
        const cookies: { name: string; value: string }[] = []
        
        if (cookieHeader) {
          cookieHeader.split(';').forEach(cookie => {
            const [name, ...rest] = cookie.trim().split('=')
            if (name) {
              cookies.push({ name, value: rest.join('=') })
            }
          })
        }
        
        return cookies
      },
      setAll() {
        // In API routes, we don't set cookies on responses
        // This is a read-only operation
      },
    },
    ...(authHeader && authHeader.startsWith('Bearer ') ? {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    } : {})
  })

  return supabase
}

