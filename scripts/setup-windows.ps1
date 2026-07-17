. "$PSScriptRoot/coa-local-common.ps1"

Write-Host "COA-BOT setup Windows/local" -ForegroundColor Green
Write-Host "Este script é idempotente: não apaga banco, sessão, planilhas, backups ou segredos."

Write-Step "Ambiente"
$isWindowsRuntime = [System.Environment]::OSVersion.Platform -eq "Win32NT"
if (-not $isWindowsRuntime) { Write-Host "Windows: não detectado neste ambiente. As etapas COM serão apenas informativas." -ForegroundColor Yellow }
else { Write-Host "Windows: OK" -ForegroundColor Green }
Write-Host "PowerShell: $($PSVersionTable.PSVersion)"
if (!(Test-CommandAvailable "node")) { throw "Node.js não encontrado." }
if (!(Test-CommandAvailable "npm")) { throw "npm não encontrado." }
Write-Host "Node.js: $(& node --version)"
Write-Host "npm: $(& npm --version)"

Write-Step "Pastas e .env"
Ensure-Directories
Ensure-EnvFile
Import-LocalEnv

Write-Step "Portas"
$postgresPort = if ($env:POSTGRES_PORT) { [int]$env:POSTGRES_PORT } else { 5433 }
foreach ($port in @(3333, 5173, $postgresPort)) {
  $state = if (Test-Port $port) { "em uso/online" } else { "livre" }
  Write-Host "Porta ${port}: $state"
}

Write-Step "Docker e PostgreSQL"
Ensure-DockerPostgres
if (!(Wait-Postgres)) { throw "PostgreSQL não respondeu na porta 5433 dentro do tempo esperado." }
Write-Host "PostgreSQL: ONLINE localhost:5433" -ForegroundColor Green

Write-Step "Prisma e banco"
Push-Location $ProjectRoot
try {
  & npm run db:generate
  if ($LASTEXITCODE -ne 0) { throw "Prisma generate falhou." }
  & npm run db:migrate
  if ($LASTEXITCODE -ne 0) { throw "Prisma migrate falhou." }
  & npm run db:seed
  if ($LASTEXITCODE -ne 0) { throw "Seed falhou." }
} finally { Pop-Location }

Write-Step "Microsoft Excel"
$excel = Test-ExcelCom
Write-Host $excel.message
if ($excel.applicable -and $excel.comAvailable) {
  Write-Host "Microsoft Excel: encontrado" -ForegroundColor Green
  Write-Host "Excel COM: disponível" -ForegroundColor Green
  Write-Host "Macros: bloqueadas" -ForegroundColor Green
} elseif ($excel.applicable) {
  Write-Host "Microsoft Excel/COM: atenção" -ForegroundColor Yellow
}

Write-Step "Planilhas locais .dev"
$missing = @()
foreach ($book in Test-WorkbookPresence) {
  if ($book.Exists) { Write-Host "$($book.Name): ENCONTRADA" -ForegroundColor Green }
  else {
    $missing += $book
    Write-Host "$($book.Name): AUSENTE" -ForegroundColor Yellow
    Write-Host "Copie para: $($book.Path)"
  }
}

Write-Step "Resumo final"
Write-Host "Painel: http://localhost:5173"
Write-Host "API: http://localhost:3333"
Write-Host "PostgreSQL: localhost:5433"
Write-Host "Modo desejado: LOCAL_OPERATIONAL"
Write-Host "Planilha oficial: BLOQUEADA (OFFICIAL_EXCEL_WRITE=false)"
Write-Host "Planilhas locais: habilitadas (LOCAL_OPERATIONAL_EXCEL_WRITE=true)"
Write-Host "WhatsApp envio: BLOQUEADO"
Write-Host "WhatsApp reação: BLOQUEADA"
if ($missing.Count -gt 0) { Write-Host "Falta copiar $($missing.Count) planilha(s) .dev; o restante do sistema continua funcional." -ForegroundColor Yellow }
Write-Host "Login local: $($env:ADMIN_EMAIL)"
Write-Host "Senha local: valor definido no .env (não exibido)."
