. "$PSScriptRoot/coa-local-common.ps1"

Write-Host "Iniciando COA-BOT LOCAL_OPERATIONAL" -ForegroundColor Green
Ensure-Directories
$envPath = Join-Path $ProjectRoot ".env"
if (!(Test-Path -LiteralPath $envPath)) { throw ".env não encontrado. Execute npm run setup:windows primeiro." }
Import-LocalEnv

Ensure-DockerPostgres
if (!(Wait-Postgres)) { throw "PostgreSQL não respondeu em localhost:5433." }

Push-Location $ProjectRoot
try {
  & npm run db:generate
  if ($LASTEXITCODE -ne 0) { throw "Prisma generate falhou." }
  & npm run db:migrate
  if ($LASTEXITCODE -ne 0) { throw "Migrations falharam." }
} finally { Pop-Location }

Invoke-LoggedProcess "api" "powershell" @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "cd '$ProjectRoot'; npm run dev --workspace @coa-bot/api")
Invoke-LoggedProcess "web" "powershell" @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "cd '$ProjectRoot'; npm run dev --workspace @coa-bot/web -- --port 5173")
Invoke-LoggedProcess "excel-agent" "powershell" @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "cd '$ProjectRoot'; npm run dev --workspace @coa-bot/excel-agent")
Invoke-LoggedProcess "whatsapp-agent" "powershell" @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "cd '$ProjectRoot'; npm run dev --workspace @coa-bot/whatsapp")

$deadline = (Get-Date).AddSeconds(60)
do {
  $api = Get-HttpState "http://localhost:3333/health"
  $web = Get-HttpState "http://localhost:5173"
  if ($api -eq "ONLINE" -and $web -eq "ONLINE") { break }
  Start-Sleep -Seconds 2
} while ((Get-Date) -lt $deadline)

try { Start-Process "http://localhost:5173" | Out-Null } catch {}

Write-Host ""
Write-Host "COA-BOT iniciado" -ForegroundColor Green
Write-Host "Painel: http://localhost:5173"
Write-Host "API: http://localhost:3333"
Write-Host "Health: http://localhost:3333/health"
Write-Host "Modo: LOCAL_OPERATIONAL"
Write-Host "Planilha oficial: BLOQUEADA"
Write-Host "Planilhas locais: habilitadas"
Write-Host "WhatsApp envio: BLOQUEADO"
Write-Host "WhatsApp reação: BLOQUEADA"
Write-Host "Logs: $LogRoot"
