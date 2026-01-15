/**
 * Script to compress all existing avatars in Supabase storage
 * 
 * Usage:
 *   1. Get your Supabase service role key from: Supabase Dashboard > Settings > API > service_role key
 *   2. Run: node scripts/compress-avatars.js [--dry-run]
 *   
 * Options:
 *   --dry-run          Show what would be compressed without making changes
 *   --delete-originals Delete original files after compression (default: keep them)
 *   
 * The script will:
 *   - List all avatars in the storage bucket
 *   - Download each one
 *   - Compress to 256x256 JPEG
 *   - Upload the compressed version (replacing original)
 *   - Update the profile URL if filename changed
 */

const { createClient } = require('@supabase/supabase-js')
const sharp = require('sharp')
const readline = require('readline')
const fs = require('fs')
const path = require('path')

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

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const MAX_SIZE = 256
const QUALITY = 85
const DRY_RUN = process.argv.includes('--dry-run')
const DELETE_ORIGINALS = process.argv.includes('--delete-originals')

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

async function compressImage(buffer) {
  return sharp(buffer)
    .resize(MAX_SIZE, MAX_SIZE, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: QUALITY })
    .toBuffer()
}

async function main() {
  console.log('\n🖼️  Avatar Compression Script\n')
  
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n')
  } else {
    console.log('This will compress all existing avatars to 256x256 JPEG (~20-50KB each)')
    if (DELETE_ORIGINALS) {
      console.log('⚠️  Original files will be DELETED after compression\n')
    } else {
      console.log('📦 Original files will be KEPT as backups (use --delete-originals to remove them)\n')
    }
  }

  if (!SUPABASE_URL) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL not found in environment')
    console.log('   Make sure you have a .env.local file with your Supabase URL')
    process.exit(1)
  }

  console.log(`📍 Supabase URL: ${SUPABASE_URL}\n`)

  // Get service role key (don't store in env for security)
  const serviceRoleKey = await prompt('Enter your Supabase SERVICE_ROLE key (from Dashboard > Settings > API): ')
  
  if (!serviceRoleKey || serviceRoleKey.length < 100) {
    console.error('❌ Invalid service role key')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false }
  })

  console.log('\n📂 Listing avatars bucket...\n')

  // List all folders (user IDs) in avatars bucket
  const { data: folders, error: foldersError } = await supabase.storage
    .from('avatars')
    .list('', { limit: 1000 })

  if (foldersError) {
    console.error('❌ Error listing avatars:', foldersError.message)
    process.exit(1)
  }

  if (!folders || folders.length === 0) {
    console.log('✅ No avatars found in bucket')
    process.exit(0)
  }

  let totalOriginalSize = 0
  let totalCompressedSize = 0
  let processed = 0
  let skipped = 0
  let errors = 0

  // Process each user folder
  for (const folder of folders) {
    if (!folder.name || folder.name.startsWith('.')) continue

    // List files in user's folder
    const { data: files, error: filesError } = await supabase.storage
      .from('avatars')
      .list(folder.name, { limit: 100 })

    if (filesError) {
      console.error(`  ❌ Error listing ${folder.name}:`, filesError.message)
      errors++
      continue
    }

    for (const file of files || []) {
      if (!file.name || file.name.startsWith('.')) continue

      const filePath = `${folder.name}/${file.name}`
      const originalSize = file.metadata?.size || 0

      // Skip if already small (under 100KB)
      if (originalSize > 0 && originalSize < 100 * 1024) {
        console.log(`  ⏭️  ${filePath} - Already small (${(originalSize / 1024).toFixed(1)}KB), skipping`)
        skipped++
        continue
      }

      console.log(`  📥 ${filePath} (${originalSize > 0 ? (originalSize / 1024).toFixed(1) + 'KB' : 'unknown size'})`)

      try {
        // Download original
        const { data: downloadData, error: downloadError } = await supabase.storage
          .from('avatars')
          .download(filePath)

        if (downloadError) {
          console.error(`     ❌ Download error:`, downloadError.message)
          errors++
          continue
        }

        const originalBuffer = Buffer.from(await downloadData.arrayBuffer())
        totalOriginalSize += originalBuffer.length

        // Compress
        const compressedBuffer = await compressImage(originalBuffer)
        totalCompressedSize += compressedBuffer.length

        const reduction = Math.round((1 - compressedBuffer.length / originalBuffer.length) * 100)
        console.log(`     🗜️  ${(originalBuffer.length / 1024).toFixed(1)}KB → ${(compressedBuffer.length / 1024).toFixed(1)}KB (${reduction}% reduction)`)

        // Skip re-upload if no significant reduction
        if (reduction < 10) {
          console.log(`     ⏭️  Minimal reduction, keeping original`)
          skipped++
          continue
        }

        if (DRY_RUN) {
          console.log(`     ✅ Would compress (dry run)`)
          processed++
          continue
        }

        // Create new filename with .jpg extension
        const newFileName = file.name.replace(/\.[^.]+$/, '.jpg')
        const newFilePath = `${folder.name}/${newFileName}`

        // Upload compressed version
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(newFilePath, compressedBuffer, {
            contentType: 'image/jpeg',
            upsert: true
          })

        if (uploadError) {
          console.error(`     ❌ Upload error:`, uploadError.message)
          errors++
          continue
        }

        // If filename changed, update profile and delete old file
        if (newFilePath !== filePath) {
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(newFilePath)

          // Update profile with new URL
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: urlData.publicUrl })
            .eq('id', folder.name)

          if (updateError) {
            console.error(`     ⚠️  Profile update error:`, updateError.message)
            console.error(`     ⚠️  Keeping old file to avoid broken avatar`)
            // Delete the new file since we couldn't update the profile
            await supabase.storage.from('avatars').remove([newFilePath])
            errors++
            continue
          }

          // Only delete old file if --delete-originals flag is passed
          if (DELETE_ORIGINALS) {
            await supabase.storage.from('avatars').remove([filePath])
            console.log(`     🗑️  Deleted original`)
          } else {
            console.log(`     📦 Original kept as backup`)
          }
        }

        console.log(`     ✅ Compressed and uploaded`)
        processed++

      } catch (err) {
        console.error(`     ❌ Error:`, err.message)
        errors++
      }
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log(`📊 Summary${DRY_RUN ? ' (DRY RUN - no changes made)' : ''}:`)
  console.log(`   ${DRY_RUN ? 'Would process' : 'Processed'}: ${processed} avatars`)
  console.log(`   Skipped:   ${skipped} (already small or minimal reduction)`)
  console.log(`   Errors:    ${errors}`)
  if (totalOriginalSize > 0) {
    console.log(`   ${DRY_RUN ? 'Potential' : 'Total'} reduction: ${(totalOriginalSize / 1024 / 1024).toFixed(2)}MB → ${(totalCompressedSize / 1024 / 1024).toFixed(2)}MB`)
    console.log(`   ${DRY_RUN ? 'Potential savings' : 'Savings'}: ${((1 - totalCompressedSize / totalOriginalSize) * 100).toFixed(1)}%`)
  }
  if (DRY_RUN) {
    console.log('\n   Run without --dry-run to apply changes')
  }
  console.log('='.repeat(50) + '\n')
}

main().catch(console.error)
