param(
  [string]$OutputDir = "./backups"
)

if (-not $env:DATABASE_URL) {
  Write-Error "DATABASE_URL environment variable is not set. Set it to your Supabase Postgres connection string."
  exit 1
}

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
  Write-Error "pg_dump is not installed or not in PATH. Install PostgreSQL client tools first."
  exit 1
}

if (-not (Test-Path $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$fileName = "helper-db-$timestamp.dump"
$outputPath = Join-Path $OutputDir $fileName

Write-Host "Creating database backup to $outputPath ..."

pg_dump $env:DATABASE_URL -Fc -f $outputPath

if ($LASTEXITCODE -ne 0) {
  Write-Error "pg_dump failed with exit code $LASTEXITCODE."
  exit $LASTEXITCODE
}

Write-Host "Backup completed successfully."
Write-Host "File: $outputPath"

