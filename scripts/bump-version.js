#!/usr/bin/env node

/**
 * Bump version in both package.json and version.json
 * Usage: node scripts/bump-version.js [patch|minor|major]
 * Default: patch
 */

const fs = require('fs')
const path = require('path')

const packageJsonPath = path.join(process.cwd(), 'package.json')
const versionJsonPath = path.join(process.cwd(), 'version.json')

function bumpVersion(version, type = 'patch') {
  const parts = version.split('.').map(Number)
  
  if (type === 'major') {
    parts[0]++
    parts[1] = 0
    parts[2] = 0
  } else if (type === 'minor') {
    parts[1]++
    parts[2] = 0
  } else {
    // patch
    parts[2]++
  }
  
  return parts.join('.')
}

try {
  // Read package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  const currentVersion = packageJson.version

  if (!currentVersion) {
    console.error('❌ No version found in package.json')
    process.exit(1)
  }

  // Get bump type from command line argument
  const bumpType = process.argv[2] || 'patch'
  if (!['patch', 'minor', 'major'].includes(bumpType)) {
    console.error('❌ Invalid bump type. Use: patch, minor, or major')
    process.exit(1)
  }

  const newVersion = bumpVersion(currentVersion, bumpType)

  // Update package.json
  packageJson.version = newVersion
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + '\n',
    'utf8'
  )

  // Update version.json
  const versionJson = { version: newVersion }
  fs.writeFileSync(
    versionJsonPath,
    JSON.stringify(versionJson, null, 2) + '\n',
    'utf8'
  )

  console.log(`✅ Bumped version: ${currentVersion} → ${newVersion} (${bumpType})`)
  console.log(`   Updated package.json and version.json`)
} catch (error) {
  console.error('❌ Error bumping version:', error.message)
  process.exit(1)
}
