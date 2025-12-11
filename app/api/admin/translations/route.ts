import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return false

  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  
  if (!user) return false

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'superadmin'
}

// Flatten nested object to dot notation
function flattenObject(obj: any, prefix = ''): Record<string, string> {
  const flattened: Record<string, string> = {}
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(flattened, flattenObject(obj[key], newKey))
      } else {
        flattened[newKey] = obj[key]
      }
    }
  }
  
  return flattened
}

// Unflatten dot notation back to nested object
function unflattenObject(flat: Record<string, string>): any {
  const result: any = {}
  
  for (const key in flat) {
    const keys = key.split('.')
    let current = result
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {}
      }
      current = current[keys[i]]
    }
    
    current[keys[keys.length - 1]] = flat[key]
  }
  
  return result
}

export async function GET(request: NextRequest) {
  try {
    if (!(await checkAdmin(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const enPath = path.join(process.cwd(), 'locales', 'en.json')
    const ptPath = path.join(process.cwd(), 'locales', 'pt.json')

    const enContent = fs.readFileSync(enPath, 'utf-8')
    const ptContent = fs.readFileSync(ptPath, 'utf-8')

    const enJson = JSON.parse(enContent)
    const ptJson = JSON.parse(ptContent)

    // Flatten both objects for easier editing
    const enFlat = flattenObject(enJson)
    const ptFlat = flattenObject(ptJson)

    // Get all unique keys from both files
    const allKeys = new Set([...Object.keys(enFlat), ...Object.keys(ptFlat)])
    const keysArray = Array.from(allKeys).sort()

    // Build pairs
    const pairs = keysArray.map(key => ({
      key,
      en: enFlat[key] || '',
      pt: ptFlat[key] || ''
    }))

    return NextResponse.json({ pairs })
  } catch (error: any) {
    console.error('Error reading translations:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await checkAdmin(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { pairs } = body

    if (!pairs || !Array.isArray(pairs)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })
    }

    // Rebuild objects from pairs
    const enFlat: Record<string, string> = {}
    const ptFlat: Record<string, string> = {}

    pairs.forEach((pair: { key: string; en: string; pt: string }) => {
      if (pair.en) enFlat[pair.key] = pair.en
      if (pair.pt) ptFlat[pair.key] = pair.pt
    })

    // Unflatten back to nested structure
    const enJson = unflattenObject(enFlat)
    const ptJson = unflattenObject(ptFlat)

    // Write files
    const enPath = path.join(process.cwd(), 'locales', 'en.json')
    const ptPath = path.join(process.cwd(), 'locales', 'pt.json')

    try {
      fs.writeFileSync(enPath, JSON.stringify(enJson, null, 2), 'utf-8')
      fs.writeFileSync(ptPath, JSON.stringify(ptJson, null, 2), 'utf-8')
      
      return NextResponse.json({ success: true, message: 'Translations saved successfully' })
    } catch (writeError: any) {
      // In production (Vercel), filesystem is read-only
      // Return error with helpful message
      if (writeError.code === 'EROFS' || writeError.code === 'EACCES') {
        return NextResponse.json({ 
          error: 'Filesystem is read-only. In production, translations must be updated via git/deployment.',
          code: 'READ_ONLY_FS'
        }, { status: 500 })
      }
      throw writeError
    }
  } catch (error: any) {
    console.error('Error saving translations:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

