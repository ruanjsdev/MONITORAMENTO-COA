$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$backupRoot = Join-Path $projectRoot "backups-database"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
$target = Join-Path $backupRoot ("coa-bot-{0}.sql" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
& docker exec coa-bot-postgres pg_dump -U coa_bot -d coa_bot --clean --if-exists | Set-Content -LiteralPath $target -Encoding UTF8
if ($LASTEXITCODE -ne 0) { throw "Backup PostgreSQL falhou." }
Get-ChildItem -LiteralPath $backupRoot -Filter "coa-bot-*.sql" | Where-Object LastWriteTime -lt (Get-Date).AddDays(-14) | Remove-Item -Force
Write-Host "Backup PostgreSQL: $target"
