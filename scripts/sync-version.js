#!/usr/bin/env node

/**
 * Sync version.json with package.json
 * This ensures the version displayed in the app matches package.json
 */

const fs = require('fs')
const path = require('path')

const packageJsonPath = path.join(process.cwd(), 'package.json')
const versionJsonPath = path.join(process.cwd(), 'version.json')

try {
  // Read package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  const packageVersion = packageJson.version

  if (!packageVersion) {
    console.error('❌ No version found in package.json')
    process.exit(1)
  }

  // Read or create version.json
  let versionJson = { version: '0.0.0' }
  if (fs.existsSync(versionJsonPath)) {
    versionJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'))
  }

  // Update version if different
  if (versionJson.version !== packageVersion) {
    versionJson.version = packageVersion
    fs.writeFileSync(
      versionJsonPath,
      JSON.stringify(versionJson, null, 2) + '\n',
      'utf8'
    )
    console.log(`✅ Synced version.json: ${versionJson.version} → ${packageVersion}`)
  } else {
    console.log(`✓ Versions are already in sync: ${packageVersion}`)
  }
} catch (error) {
  console.error('❌ Error syncing versions:', error.message)
  process.exit(1)
}
