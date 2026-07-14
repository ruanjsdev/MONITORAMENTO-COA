. "$PSScriptRoot/coa-local-common.ps1"

Import-LocalEnv
$api = Get-HttpState "http://127.0.0.1:3333/health"
$web = Get-HttpState "http://127.0.0.1:5173"
$postgres = if (Test-Port 5433) { "ONLINE" } else { "OFFLINE" }
$excelAgent = "UNKNOWN"
$whatsapp = "UNKNOWN"
$mode = "UNKNOWN"
$selected = "NÃO SELECIONADO"
$headers = @{}
if ($env:WHATSAPP_SHADOW_TOKEN) { $headers["x-whatsapp-shadow-token"] = $env:WHATSAPP_SHADOW_TOKEN }

try {
  $modeResponse = Invoke-RestMethod -Uri "http://127.0.0.1:3333/whatsapp-shadow/local/mode" -Headers $headers -TimeoutSec 2
  $mode = $modeResponse.mode
} catch {}
try {
  $groupResponse = Invoke-RestMethod -Uri "http://127.0.0.1:3333/whatsapp-shadow/local/selected-group" -Headers $headers -TimeoutSec 2
  if ($groupResponse.groupName) { $selected = $groupResponse.groupName }
} catch { $whatsapp = "OFFLINE" }
try {
  $shadowResponse = Invoke-RestMethod -Uri "http://127.0.0.1:3333/whatsapp-shadow/local/status" -Headers $headers -TimeoutSec 2
  $whatsapp = if ($shadowResponse.qrState -eq "CONNECTED") { "CONNECTED" } else { $shadowResponse.qrState }
  if ($shadowResponse.monitoredGroup.name) { $selected = $shadowResponse.monitoredGroup.name }
} catch { if ($whatsapp -eq "UNKNOWN") { $whatsapp = "OFFLINE" } }
try {
  $excelAgent = Get-HttpState "http://127.0.0.1:3333/excel-agent/local"
} catch { $excelAgent = "OFFLINE" }

Write-Host "API: $api"
Write-Host "WEB: $web"
Write-Host "POSTGRESQL: $postgres"
Write-Host "EXCEL AGENT: $excelAgent"
Write-Host "WHATSAPP: $whatsapp"
Write-Host "MODO: $mode"
Write-Host "GRUPO: $selected"
Write-Host ""
foreach ($book in Test-WorkbookPresence) {
  $state = if ($book.Exists) { "ENCONTRADA" } else { "NÃO LOCALIZADA" }
  if ($book.Name -like "Planilha Plantio*") { Write-Host "Plantio: $state" }
  else { Write-Host "Tratos: $state" }
}
Write-Host ""
Write-Host "LOCAL_OPERATIONAL_EXCEL_WRITE=$($env:LOCAL_OPERATIONAL_EXCEL_WRITE)"
Write-Host "OFFICIAL_EXCEL_WRITE=$($env:OFFICIAL_EXCEL_WRITE)"
Write-Host "sendMessage=false"
Write-Host "sendReaction=false"
