/**
 * Script to backup all avatars before compression
 * 
 * Usage:
 *   node scripts/backup-avatars.js
 *   
 * Creates a 'avatar-backups' folder with all avatars named by user
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const readline = require('readline')

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim().replace(/^["']|["']$/g, '')
        if (!process.env[key]) {
          process.env[key] = value
        }
      }
    })
  }
}

loadEnvFile()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

// Sanitize filename (remove invalid characters)
function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_')
}

async function main() {
  console.log('\n📦 Avatar Backup Script\n')

  if (!SUPABASE_URL) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL not found')
    process.exit(1)
  }

  console.log(`📍 Supabase URL: ${SUPABASE_URL}\n`)

  const serviceRoleKey = await prompt('Enter your Supabase SERVICE_ROLE key: ')
  
  if (!serviceRoleKey || serviceRoleKey.length < 100) {
    console.error('❌ Invalid service role key')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false }
  })

  // Create backup folder
  const backupDir = path.join(__dirname, '..', 'avatar-backups')
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }
  console.log(`\n📁 Backup folder: ${backupDir}\n`)

  // Get all profiles with avatars
  console.log('📋 Fetching profiles...\n')
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .not('avatar_url', 'is', null)

  if (profilesError) {
    console.error('❌ Error fetching profiles:', profilesError.message)
    process.exit(1)
  }

  if (!profiles || profiles.length === 0) {
    console.log('✅ No avatars found')
    process.exit(0)
  }

  console.log(`Found ${profiles.length} users with avatars\n`)

  let downloaded = 0
  let errors = 0
  let totalSize = 0

  for (const profile of profiles) {
    if (!profile.avatar_url) continue

    const userName = profile.full_name || profile.id
    const ext = path.extname(profile.avatar_url) || '.jpg'
    const safeFileName = sanitizeFilename(userName) + ext
    const filePath = path.join(backupDir, safeFileName)

    console.log(`📥 ${userName}...`)

    try {
      // Extract storage path from URL
      const urlMatch = profile.avatar_url.match(/\/avatars\/(.+)$/)
      if (!urlMatch) {
        console.log(`   ⚠️ Could not parse avatar URL, skipping`)
        errors++
        continue
      }

      const storagePath = urlMatch[1]

      // Download from storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .download(storagePath)

      if (error) {
        console.log(`   ❌ Download error: ${error.message}`)
        errors++
        continue
      }

      const buffer = Buffer.from(await data.arrayBuffer())
      totalSize += buffer.length

      // Save to disk
      fs.writeFileSync(filePath, buffer)
      console.log(`   ✅ Saved: ${safeFileName} (${(buffer.length / 1024).toFixed(1)}KB)`)
      downloaded++

    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`)
      errors++
    }
  }

  // Create a simple manifest
  const manifest = profiles.map(p => ({
    id: p.id,
    name: p.full_name,
    original_url: p.avatar_url,
    backup_file: sanitizeFilename(p.full_name || p.id) + (path.extname(p.avatar_url) || '.jpg')
  }))
  fs.writeFileSync(
    path.join(backupDir, '_manifest.json'),
    JSON.stringify(manifest, null, 2)
  )

  console.log('\n' + '='.repeat(50))
  console.log('📊 Summary:')
  console.log(`   Downloaded: ${downloaded} avatars`)
  console.log(`   Errors:     ${errors}`)
  console.log(`   Total size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`)
  console.log(`   Location:   ${backupDir}`)
  console.log('='.repeat(50))
  console.log('\n💡 To create a ZIP, run:')
  console.log(`   Compress-Archive -Path "${backupDir}\\*" -DestinationPath "${backupDir}.zip"\n`)
}

main().catch(console.error)
