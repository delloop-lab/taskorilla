param(
  [Parameter(Mandatory = $true)]
  [string]$DumpFile,

  [string]$TargetDatabaseUrl = $env:DATABASE_URL
)

if (-not $TargetDatabaseUrl) {
  Write-Error "TargetDatabaseUrl not provided and DATABASE_URL environment variable is not set."
  exit 1
}

if (-not (Test-Path $DumpFile)) {
  Write-Error "Dump file '$DumpFile' does not exist."
  exit 1
}

if (-not (Get-Command pg_restore -ErrorAction SilentlyContinue)) {
  Write-Error "pg_restore is not installed or not in PATH. Install PostgreSQL client tools first."
  exit 1
}

Write-Host "Restoring database from $DumpFile ..."

pg_restore -d $TargetDatabaseUrl --clean --if-exists $DumpFile

if ($LASTEXITCODE -ne 0) {
  Write-Error "pg_restore failed with exit code $LASTEXITCODE."
  exit $LASTEXITCODE
}

Write-Host "Restore completed successfully."

