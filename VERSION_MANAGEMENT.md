# Version Management

The application version is displayed in the footer and must be kept in sync between `package.json` and `version.json`.

## Current Version

The version is displayed in the **Footer component** on all pages, showing as "Beta V[version]".

## Version Files

- **`package.json`** - Main version source (used by npm)
- **`version.json`** - Used by the app to display version in the UI via `/api/version` endpoint

## Version Bumping

### Automatic Sync

The `sync-version` script automatically syncs `version.json` with `package.json`:
- Runs automatically before `npm run build`
- Can be run manually: `npm run sync-version`

### Bump Version (Recommended)

Use the bump script to update both files at once:

```bash
# Bump patch version (0.99.895 → 0.99.896)
npm run bump-version
# or
npm run bump-version:patch

# Bump minor version (0.99.895 → 0.100.0)
npm run bump-version:minor

# Bump major version (0.99.895 → 1.0.0)
npm run bump-version:major
```

### Manual Bumping

If you manually update `package.json`:
1. Update the version in `package.json`
2. Run `npm run sync-version` to sync `version.json`
3. Commit both files together

## Workflow

1. **When making changes that require a version bump:**
   ```bash
   npm run bump-version:patch  # or :minor, :major
   git add package.json version.json
   git commit -m "Bump version to X.X.X"
   git push
   ```

2. **Before building:**
   - The build process automatically runs `sync-version` to ensure files are in sync
   - No manual action needed

3. **Version Display:**
   - The Footer component fetches version from `/api/version`
   - The API route reads from `version.json`
   - Version is displayed as "Beta V[version]" in the footer

## GitHub Actions

There's a GitHub workflow (`.github/workflows/increment-version.yml`) that auto-increments `version.json` on pushes to main, but it's recommended to use the bump scripts instead for better control.

## Notes

- Always keep `package.json` and `version.json` in sync
- The version is displayed in the footer on all pages
- Version format: `X.Y.Z` (e.g., `0.99.895`)
- The sync script ensures they match before every build
