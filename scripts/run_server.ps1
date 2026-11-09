# Script PowerShell para lanzar servidor local en puerto 8000
# Úsalo desde la raíz del proyecto: PowerShell -ExecutionPolicy Bypass -File scripts/run_server.ps1

$port = 8000
$projectRoot = Join-Path (Split-Path -Parent $PSScriptRoot) "frontend"

Write-Host "Iniciando servidor HTTP en puerto $port..."
Write-Host "Abre en tu navegador: http://localhost:$port"
Write-Host "Presiona Ctrl+C para detener el servidor."

Set-Location $projectRoot
python -m http.server $port --bind localhost
