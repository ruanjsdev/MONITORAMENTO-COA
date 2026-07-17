param(
  [Parameter(Mandatory=$true)][string]$Workspace,
  [string[]]$ExtraArgs = @()
)

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

while ($true) {
  Write-Host "[$Workspace] iniciando em $(Get-Date -Format o)"
  & npm run start --workspace $Workspace @ExtraArgs
  $code = $LASTEXITCODE
  Write-Host "[$Workspace] encerrou com código $code; reiniciando em 2s." -ForegroundColor Yellow
  Start-Sleep -Seconds 2
}
