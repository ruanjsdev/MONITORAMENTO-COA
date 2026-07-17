. "$PSScriptRoot/coa-local-common.ps1"

Write-Host "Encerrando processos gerenciados do COA-BOT" -ForegroundColor Yellow
Stop-ManagedProcess "api"
Stop-ManagedProcess "web"
Stop-ManagedProcess "excel-agent"
Stop-ManagedProcess "whatsapp-agent"
Write-Host "Excel do operador, sessão WhatsApp, banco, planilhas e backups foram preservados."
