#Requires -Version 5.1
<#
.SYNOPSIS
    PC Optimizer - настройка Windows 10/11 на максимальный FPS.
    Собран под конфигурацию: RTX 4060 + Core i5-14400F + 32 ГБ ОЗУ.

.DESCRIPTION
    Утилита делает три вещи:
      1) диагностирует систему и показывает, что реально крадёт FPS;
      2) применяет проверенные оптимизации Windows (с бэкапом каждой правки);
      3) откатывает любое изменение обратно одной командой.

    Всё, что меняется, сначала записывается в JSON-бэкап
    (%ProgramData%\PCOptimizer\backups). Откат: -Action restore.

.PARAMETER Action
    report  - диагностика и рекомендации (по умолчанию, ничего не меняет)
    list    - список всех оптимизаций и их текущее состояние
    apply   - применить оптимизации
    restore - откатить изменения из бэкапа
    clean   - очистить временные файлы и кэш шейдеров

.PARAMETER Preset
    safe   - только безопасный минимум (HAGS, игровой режим, Game DVR, оконный режим)
    gaming - рекомендуемый набор (по умолчанию)
    max    - всё вышеперечисленное + сеть, память, службы

.PARAMETER Tweak
    Применить конкретные оптимизации по Id вместо профиля. Список: -Action list

.PARAMETER AllowSecurityTradeoffs
    Разрешает оптимизации, снижающие защищённость системы (vbs-off).
    Без этого флага они пропускаются.

.EXAMPLE
    .\Optimize-PC.ps1
    Диагностика без изменений.

.EXAMPLE
    .\Optimize-PC.ps1 -Action apply -Preset gaming
    Применить рекомендуемый набор.

.EXAMPLE
    .\Optimize-PC.ps1 -Action apply -Preset gaming -WhatIf
    Показать, что будет сделано, ничего не меняя.

.EXAMPLE
    .\Optimize-PC.ps1 -Action restore
    Откатить последний применённый набор.
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [ValidateSet('report', 'list', 'apply', 'restore', 'clean')]
    [string]$Action = 'report',

    [ValidateSet('safe', 'gaming', 'max')]
    [string]$Preset = 'gaming',

    [string[]]$Tweak,

    [switch]$AllowSecurityTradeoffs,

    [switch]$NoRestorePoint,

    [string]$BackupFile,

    [switch]$IncludeRecycleBin,

    [switch]$Trim,

    [Alias('Yes')]
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'lib\Common.ps1')
. (Join-Path $here 'lib\Tweaks.ps1')
. (Join-Path $here 'lib\Report.ps1')
. (Join-Path $here 'lib\Clean.ps1')

Assert-Windows
[void](Initialize-PCOptLog -Name $Action)

Write-Host ''
Write-Host '  PC OPTIMIZER' -ForegroundColor Cyan
Write-Host '  Оптимизация Windows под игры. Каждое изменение обратимо.' -ForegroundColor DarkGray

function Confirm-Continue {
    param([string]$Question)
    if ($Force -or $WhatIfPreference) { return $true }
    Write-Host ''
    $answer = Read-Host "$Question [y/N]"
    return ($answer -match '^(y|yes|д|да)$')
}

function Show-TweakList {
    Write-Header 'КАТАЛОГ ОПТИМИЗАЦИЙ'
    foreach ($group in (Get-TweakCatalog | Group-Object Category)) {
        Write-Host ''
        Write-Host " $($group.Name)" -ForegroundColor White
        foreach ($t in $group.Group) {
            $applied = Test-TweakApplied -Tweak $t
            $mark = if ($applied) { '[применено]' } else { '[   -    ]' }
            $color = if ($applied) { 'Green' } else { 'Gray' }
            $presets = if (@($t.Presets).Count -eq 0) { 'только вручную' } else { ($t.Presets -join ', ') }
            Write-Host ("  {0} {1,-22} {2}" -f $mark, $t.Id, $t.Name) -ForegroundColor $color
            Write-Host ("      профили: {0} | риск: {1}" -f $presets, $t.Risk) -ForegroundColor DarkGray
            Write-Host ("      эффект : {0}" -f $t.Gain) -ForegroundColor DarkGray
            if ($t.Notes) { Write-Host ("      важно  : {0}" -f $t.Notes) -ForegroundColor DarkYellow }
        }
    }
    Write-Host ''
    Write-Host '  Применить конкретную: .\Optimize-PC.ps1 -Action apply -Tweak hags,gamedvr-off' -ForegroundColor DarkGray
}

function Invoke-Apply {
    if (-not (Test-Admin)) {
        Write-Log 'Нужны права администратора. Запустите START.bat или PowerShell "от имени администратора".' -Level Error
        return
    }

    $selected = if ($Tweak) {
        $catalog = Get-TweakCatalog
        $found = @()
        foreach ($id in $Tweak) {
            $match = $catalog | Where-Object { $_.Id -eq $id }
            if ($match) {
                $found += $match
            } else {
                Write-Log "Неизвестная оптимизация: $id (см. -Action list)" -Level Warn
            }
        }
        $found
    } else {
        Get-TweaksForPreset -Preset $Preset
    }

    if (@($selected).Count -eq 0) {
        Write-Log 'Нечего применять.' -Level Warn
        return
    }

    # оптимизации с высоким риском требуют явного согласия
    $risky = @($selected | Where-Object { $_.Risk -eq 'Высокий' })
    if ($risky -and -not $AllowSecurityTradeoffs) {
        foreach ($r in $risky) {
            Write-Log "Пропускаю '$($r.Id)': нужен флаг -AllowSecurityTradeoffs. $($r.Notes)" -Level Warn
        }
        $selected = @($selected | Where-Object { $_.Risk -ne 'Высокий' })
    }

    Write-Header "ПЛАН ($(if ($Tweak) { 'выбранные оптимизации' } else { "профиль $Preset" }))"
    $i = 0
    foreach ($t in $selected) {
        $i++
        $state = if (Test-TweakApplied -Tweak $t) { 'уже применено' } else { 'будет применено' }
        Write-Host ("  {0}. {1}" -f $i, $t.Name) -ForegroundColor White
        Write-Host ("     {0} | риск: {1} | {2}" -f $t.Id, $t.Risk, $state) -ForegroundColor DarkGray
        Write-Host ("     {0}" -f $t.Gain) -ForegroundColor DarkGray
    }

    if (-not (Confirm-Continue 'Применить перечисленное?')) {
        Write-Log 'Отменено пользователем.' -Level Info
        return
    }

    if (-not $NoRestorePoint -and -not $WhatIfPreference) {
        Write-Host ''
        Write-Log 'Создаю точку восстановления Windows (может занять минуту)...' -Level Info
        New-RestorePointSafe -Description "PC Optimizer ($Preset)" | Out-Null
    }

    $context = New-BackupContext -Preset $(if ($Tweak) { 'manual' } else { $Preset })
    $okCount = 0
    $failCount = 0
    $needReboot = $false

    Write-Header 'ПРИМЕНЕНИЕ'
    foreach ($t in $selected) {
        Write-Host ''
        Write-Log $t.Name -Level Step
        $ok = Invoke-Tweak -Tweak $t -Context $context
        if ($ok) {
            $okCount++
            Write-Log "  готово ($($t.Id))" -Level Ok
            if ($t.Reboot) { $needReboot = $true }
        } else {
            $failCount++
            Write-Log "  не применено ($($t.Id))" -Level Warn
        }
    }

    $backup = Save-BackupContext -Context $context

    Write-Header 'ИТОГ'
    Write-Log "Применено: $okCount, с ошибками/пропущено: $failCount" -Level Info
    if ($backup) {
        Write-Log "Бэкап прежних настроек: $backup" -Level Ok
        Write-Log 'Полный откат: .\Optimize-PC.ps1 -Action restore' -Level Info
    }
    if ($needReboot) {
        Write-Host ''
        Write-Log 'Часть изменений вступит в силу после ПЕРЕЗАГРУЗКИ.' -Level Warn
    }
    Write-Host ''
    Write-Log 'Замерьте результат: один и тот же отрезок игры до и после, смотрите средний FPS и 1% low.' -Level Info
}

function Invoke-Restore {
    if (-not (Test-Admin)) {
        Write-Log 'Нужны права администратора для отката.' -Level Error
        return
    }

    $file = $BackupFile
    if (-not $file) {
        $backups = Get-BackupFiles
        if (@($backups).Count -eq 0) {
            Write-Log 'Бэкапов не найдено - откатывать нечего.' -Level Warn
            return
        }
        Write-Header 'ДОСТУПНЫЕ БЭКАПЫ'
        $n = 0
        foreach ($b in $backups) {
            $n++
            Write-Host ("  {0}. {1}  ({2})" -f $n, $b.Name, $b.LastWriteTime)
        }
        $file = $backups[0].FullName
        Write-Host ''
        Write-Log "Будет использован последний: $($backups[0].Name)" -Level Info
        Write-Log 'Другой бэкап: -BackupFile "полный\путь\к\backup-....json"' -Level Info
    }

    if (-not (Confirm-Continue 'Откатить изменения из этого бэкапа?')) {
        Write-Log 'Отменено пользователем.' -Level Info
        return
    }

    Write-Header 'ОТКАТ'
    Restore-FromBackupFile -Path $file | Out-Null
    Write-Host ''
    Write-Log 'Перезагрузите ПК, чтобы откат вступил в силу полностью.' -Level Warn
}

switch ($Action) {
    'report'  { Show-PCReport -Save | Out-Null }
    'list'    { Show-TweakList }
    'apply'   { Invoke-Apply }
    'restore' { Invoke-Restore }
    'clean'   {
        if (-not (Test-Admin)) { Write-Log 'Часть каталогов очистится только с правами администратора.' -Level Warn }
        Invoke-PCClean -IncludeRecycleBin:$IncludeRecycleBin -Trim:$Trim
    }
}

Write-Host ''
if ($script:PCOptLogFile) { Write-Host "  Лог: $script:PCOptLogFile" -ForegroundColor DarkGray }
Write-Host ''
