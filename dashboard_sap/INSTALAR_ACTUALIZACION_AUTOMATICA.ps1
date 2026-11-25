# Ejecutar UNA SOLA VEZ desde PowerShell en Windows. No requiere BAT.
$ErrorActionPreference = 'Stop'
$raizDashboard = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = Split-Path -Parent $raizDashboard
if (-not (Test-Path (Join-Path $repo 'dashboard_sap\app.js'))) {
    Write-Host 'ERROR: Coloca esta carpeta dashboard_sap dentro del repositorio Gesti-n_Mantenimiento_v4.0.' -ForegroundColor Red
    Read-Host 'Presiona Enter'; exit 1
}
$python = (Get-Command py -ErrorAction SilentlyContinue)
$py = $null
if ($python) {
    $candidato = (& py -3 -c 'import sys; print(sys.executable)' 2>$null | Select-Object -First 1)
    if ($LASTEXITCODE -eq 0 -and (Test-Path $candidato)) { $py = $candidato }
}
if (-not $py) {
    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python) { $py = $python.Source }
}
if (-not $py) { throw 'Python no está instalado. Instala Python 3 primero.' }
$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) { throw 'Git no está disponible en PATH. Instala Git para Windows.' }
& $py -c 'import openpyxl' 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Instalando openpyxl...' -ForegroundColor Yellow
    & $py -m pip install --user openpyxl
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo instalar openpyxl' }
}
$posibles = New-Object 'System.Collections.Generic.List[string]'
foreach ($oneDrive in @($env:OneDriveCommercial, $env:OneDrive, $env:OneDriveConsumer)) {
    if ($oneDrive) {
        $posibles.Add((Join-Path $oneDrive '04. ORDENES\HISTORICO'))
        $posibles.Add((Join-Path $oneDrive '04. ORDENES\HISTORICOS'))
    }
}
$historico = $posibles | Where-Object { Test-Path -LiteralPath $_ -PathType Container } | Select-Object -First 1
if (-not $historico) {
    Write-Host 'No se encontró HISTORICO automáticamente en OneDrive.' -ForegroundColor Yellow
    $historico = Read-Host 'Pega la ruta completa de la carpeta HISTORICO'
    $historico = $historico.Trim('"')
}
if (-not (Test-Path -LiteralPath $historico -PathType Container)) { throw "No existe HISTORICO: $historico" }
$config = Join-Path $raizDashboard 'config_iw39_auto.json'
@{ historico = (Resolve-Path -LiteralPath $historico).Path; repo = (Resolve-Path $repo).Path; estado_dir = $raizDashboard } | ConvertTo-Json | Set-Content -LiteralPath $config -Encoding UTF8
$script = Join-Path $raizDashboard 'auto_iw39.py'
# Solo se ejecuta mientras está iniciada la sesión: OneDrive y Git usan tus credenciales.
$taskName = 'TESALIA_IW39_DASHBOARD_AUTOMATICO'
$action = New-ScheduledTaskAction -Execute $py -Argument ('"{0}" --config "{1}"' -f $script, $config) -WorkingDirectory $repo
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5)
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel LeastPrivilege
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 15) -MultipleInstances IgnoreNew -StartWhenAvailable
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Write-Host "Tarea automática instalada: $taskName" -ForegroundColor Green
Write-Host "Fuente: $historico"
Write-Host 'Frecuencia: cada 5 minutos, cuando la sesión de Windows esté iniciada.'
Write-Host 'Se iniciará una primera comprobación ahora...'
Start-ScheduledTask -TaskName $taskName
Write-Host "Revisa el log en: $(Join-Path $raizDashboard 'iw39_automatico.log')"
Write-Host 'Si Git solicita credenciales, autentica GitHub en esa computadora la primera vez.'
