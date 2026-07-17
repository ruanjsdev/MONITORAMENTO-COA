$ErrorActionPreference = "Stop"

$Script:ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Script:RuntimeRoot = Join-Path $ProjectRoot ".coa-runtime"
$Script:PidRoot = Join-Path $RuntimeRoot "pids"
$Script:LogRoot = Join-Path $ProjectRoot "logs"
$Script:RequiredDirs = @(
  "planilhas-homologacao",
  "backups-excel-local",
  "whatsapp-session",
  "whatsapp-runtime",
  "temp",
  "logs",
  ".coa-runtime",
  ".coa-runtime/pids"
)
$Script:ExpectedWorkbooks = @(
  "Planilha Plantio cana.dev.xlsm",
  "Acompanhamento Tratos Culturais.dev.xlsm"
)

function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "== $Message ==" -ForegroundColor Cyan
}

function Test-CommandAvailable([string]$Name) {
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function New-StrongSecret([int]$Bytes = 48) {
  $buffer = New-Object byte[] $Bytes
  [Security.Cryptography.RandomNumberGenerator]::Fill($buffer)
  return [Convert]::ToBase64String($buffer).TrimEnd("=")
}

function Read-EnvFile([string]$Path = (Join-Path $ProjectRoot ".env")) {
  $values = [ordered]@{}
  if (!(Test-Path -LiteralPath $Path)) { return $values }
  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -match "^\s*#" -or $line -notmatch "=") { continue }
    $parts = $line.Split("=", 2)
    $key = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"')
    if ($key) { $values[$key] = $value }
  }
  return $values
}

function Write-EnvFile([hashtable]$Values, [string]$Path = (Join-Path $ProjectRoot ".env")) {
  $lines = @()
  foreach ($key in $Values.Keys) {
    $value = [string]$Values[$key]
    if ($value -match "\s|#|;") { $value = '"' + $value.Replace('"', '\"') + '"' }
    $lines += "$key=$value"
  }
  Set-Content -LiteralPath $Path -Value $lines -Encoding UTF8
}

function Ensure-Directories {
  foreach ($dir in $RequiredDirs) {
    New-Item -ItemType Directory -Force -Path (Join-Path $ProjectRoot $dir) | Out-Null
  }
}

function Ensure-EnvFile {
  $envPath = Join-Path $ProjectRoot ".env"
  if (Test-Path -LiteralPath $envPath) {
    Write-Host ".env existente preservado; segredos não foram alterados." -ForegroundColor Yellow
    return
  }
  $examplePath = Join-Path $ProjectRoot ".env.example"
  if (!(Test-Path -LiteralPath $examplePath)) { throw ".env.example não encontrado." }
  Copy-Item -LiteralPath $examplePath -Destination $envPath
  $values = Read-EnvFile $envPath
  $values["JWT_SECRET"] = New-StrongSecret
  $values["EXCEL_AGENT_TOKEN"] = New-StrongSecret
  $values["WHATSAPP_SHADOW_TOKEN"] = New-StrongSecret
  $values["DATABASE_MODE"] = "prisma"
  $values["SIMULATION_MODE"] = "true"
  $values["POSTGRES_PORT"] = "5433"
  $values["DATABASE_URL"] = "postgresql://coa_bot:coa_bot_dev@localhost:5433/coa_bot?schema=public"
  $values["OFFICIAL_EXCEL_WRITE"] = "false"
  $values["LOCAL_OPERATIONAL_EXCEL_WRITE"] = "true"
  $values["LOCAL_OPERATIONAL_MODE"] = "LOCAL_OPERATIONAL"
  Write-EnvFile $values $envPath
  Write-Host ".env criado a partir do .env.example com segredos fortes ocultos." -ForegroundColor Green
}

function Import-LocalEnv {
  $values = Read-EnvFile
  foreach ($key in $values.Keys) {
    [Environment]::SetEnvironmentVariable($key, [string]$values[$key], "Process")
  }
}

function Test-Port([int]$Port) {
  try {
    $client = New-Object Net.Sockets.TcpClient
    $async = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
    $connected = $async.AsyncWaitHandle.WaitOne(250)
    if ($connected) { $client.EndConnect($async) }
    $client.Close()
    return $connected
  } catch { return $false }
}

function Test-ExcelCom {
  $isWindowsRuntime = [System.Environment]::OSVersion.Platform -eq "Win32NT"
  if (!$isWindowsRuntime) {
    return @{ applicable = $false; excelFound = $false; comAvailable = $false; message = "Excel COM não aplicável neste ambiente" }
  }
  $excel = $null
  try {
    $type = [type]::GetTypeFromProgID("Excel.Application")
    if ($null -eq $type) { return @{ applicable = $true; excelFound = $false; comAvailable = $false; message = "Microsoft Excel não encontrado" } }
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    try { $excel.AutomationSecurity = 3 } catch {}
    return @{ applicable = $true; excelFound = $true; comAvailable = $true; message = "Microsoft Excel encontrado; Excel COM disponível; macros bloqueadas" }
  } catch {
    return @{ applicable = $true; excelFound = $true; comAvailable = $false; message = $_.Exception.Message }
  } finally {
    if ($null -ne $excel) {
      try { $excel.Quit() } catch {}
      try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($excel) } catch {}
      [GC]::Collect()
      [GC]::WaitForPendingFinalizers()
    }
  }
}

function Test-WorkbookPresence {
  $root = Join-Path $ProjectRoot "planilhas-homologacao"
  $result = @()
  foreach ($name in $ExpectedWorkbooks) {
    $file = Join-Path $root $name
    $result += [pscustomobject]@{ Name = $name; Path = $file; Exists = (Test-Path -LiteralPath $file -PathType Leaf) }
  }
  return $result
}

function Ensure-DockerPostgres {
  if (!(Test-CommandAvailable "docker")) { throw "Docker não encontrado. Instale/inicie o Docker Desktop." }
  $info = & docker info 2>$null
  if ($LASTEXITCODE -ne 0) { throw "Docker Engine indisponível. Abra o Docker Desktop e tente novamente." }
  Push-Location $ProjectRoot
  try { & docker compose up -d postgres; if ($LASTEXITCODE -ne 0) { throw "Falha ao iniciar PostgreSQL via Docker Compose." } }
  finally { Pop-Location }
}

function Wait-Postgres {
  $deadline = (Get-Date).AddSeconds(90)
  do {
    if (Test-Port 5433) { return $true }
    Start-Sleep -Seconds 2
  } while ((Get-Date) -lt $deadline)
  return $false
}

function Invoke-LoggedProcess([string]$Name, [string]$FilePath, [string[]]$Arguments) {
  New-Item -ItemType Directory -Force -Path $PidRoot, $LogRoot | Out-Null
  $pidFile = Join-Path $PidRoot "$Name.pid"
  if (Test-Path -LiteralPath $pidFile) {
    $oldPid = [int](Get-Content -LiteralPath $pidFile -Raw)
    $old = Get-Process -Id $oldPid -ErrorAction SilentlyContinue
    if ($old) { Write-Host "$Name já está rodando (PID $oldPid)."; return }
  }
  $outLog = Join-Path $LogRoot "$Name.out.log"
  $errLog = Join-Path $LogRoot "$Name.err.log"
  $process = Start-Process -FilePath $FilePath -ArgumentList $Arguments -WorkingDirectory $ProjectRoot -WindowStyle Minimized -PassThru -RedirectStandardOutput $outLog -RedirectStandardError $errLog
  Set-Content -LiteralPath $pidFile -Value $process.Id
  Write-Host "$Name iniciado (PID $($process.Id))."
}

function Stop-ManagedProcess([string]$Name) {
  $pidFile = Join-Path $PidRoot "$Name.pid"
  if (!(Test-Path -LiteralPath $pidFile)) { Write-Host "${Name}: sem PID registrado."; return }
  $pidValue = [int](Get-Content -LiteralPath $pidFile -Raw)
  $process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
  $commandLine = if ($process) { (Get-CimInstance Win32_Process -Filter "ProcessId=$pidValue" -ErrorAction SilentlyContinue).CommandLine } else { "" }
  $managed = $process -and ($process.ProcessName -eq "node" -or ($process.ProcessName -eq "powershell" -and $commandLine -like "*watch-service.ps1*"))
  if ($managed) { Stop-ProcessTree $pidValue; Write-Host "$Name encerrado." }
  elseif ($process) { Write-Host "${Name}: PID não pertence ao COA-BOT; não será encerrado." -ForegroundColor Yellow }
  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}

function Stop-ProcessTree([int]$ProcessId) {
  $children = @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$ProcessId" -ErrorAction SilentlyContinue)
  foreach ($child in $children) { Stop-ProcessTree ([int]$child.ProcessId) }
  Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

function Get-HttpState([string]$Url) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) { return "ONLINE" }
    return "ERRO"
  } catch { return "OFFLINE" }
}
