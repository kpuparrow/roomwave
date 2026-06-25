param(
  [string]$OutputDir = "backups"
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$target = Join-Path $OutputDir "roomwave-$timestamp.sql"

if (-not $env:DATABASE_URL) {
  throw "DATABASE_URL is required for backup."
}

pg_dump $env:DATABASE_URL --clean --if-exists --no-owner --file $target
Write-Host "Backup written to $target"
