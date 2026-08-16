#Requires -Version 5.1
<#
    Common.ps1 - общие функции PC Optimizer:
    логирование, проверка прав, работа с реестром/службами и система бэкапов.

    Ключевой принцип: НИЧЕГО не меняется без предварительной записи
    прежнего состояния в JSON-бэкап. Любую правку можно откатить.
#>

$script:PCOptLogFile = $null
# Приёмник сообщений для графической оболочки: если задан ArrayList,
# Write-Log дублирует строки туда, а GUI их забирает и показывает.
$script:PCOptLogSink = $null

function Set-LogSink {
    param($Sink)
    $script:PCOptLogSink = $Sink
}

function Read-LogSink {
    <# Забирает накопленные строки и очищает приёмник. #>
    if ($null -eq $script:PCOptLogSink) { return @() }
    $lines = @($script:PCOptLogSink.ToArray())
    $script:PCOptLogSink.Clear()
    return $lines
}

# ---------------------------------------------------------------- инфраструктура

function Get-PCOptDataRoot {
    <# Каталог с бэкапами и логами. ProgramData, при отсутствии прав - LocalAppData. #>
    $candidates = @()
    foreach ($base in @($env:ProgramData, $env:LOCALAPPDATA, $env:TEMP)) {
        if ($base) { $candidates += (Join-Path $base 'PCOptimizer') }
    }
    foreach ($root in $candidates) {
        try {
            foreach ($sub in @('backups', 'logs')) {
                $p = Join-Path $root $sub
                if (-not (Test-Path -LiteralPath $p)) {
                    New-Item -ItemType Directory -Path $p -Force -ErrorAction Stop | Out-Null
                }
            }
            return $root
        } catch {
            continue
        }
    }
    throw 'Не удалось создать рабочий каталог PCOptimizer (нет прав на запись).'
}

function Initialize-PCOptLog {
    param([string]$Name = 'optimizer')
    $root = Get-PCOptDataRoot
    $stamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
    $script:PCOptLogFile = Join-Path (Join-Path $root 'logs') "$Name-$stamp.log"
    return $script:PCOptLogFile
}

function Write-Log {
    param(
        [Parameter(Mandatory)][string]$Message,
        [ValidateSet('Info', 'Ok', 'Warn', 'Error', 'Step', 'Plain')][string]$Level = 'Info'
    )
    $prefix = switch ($Level) {
        'Ok'    { '[ OK ] ' }
        'Warn'  { '[ !  ] ' }
        'Error' { '[ХХХХ] ' }
        'Step'  { '' }
        'Plain' { '' }
        default { '[ .. ] ' }
    }
    $color = switch ($Level) {
        'Ok'    { 'Green' }
        'Warn'  { 'Yellow' }
        'Error' { 'Red' }
        'Step'  { 'Cyan' }
        default { 'Gray' }
    }
    $line = "$prefix$Message"
    if ($null -ne $script:PCOptLogSink) {
        [void]$script:PCOptLogSink.Add($line)
    } else {
        Write-Host $line -ForegroundColor $color
    }
    if ($script:PCOptLogFile) {
        $ts = Get-Date -Format 'HH:mm:ss'
        try { Add-Content -LiteralPath $script:PCOptLogFile -Value "$ts $line" -Encoding UTF8 } catch { }
    }
}

function Write-Header {
    param([string]$Text)
    Write-Host ''
    Write-Host ('=' * 74) -ForegroundColor DarkCyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host ('=' * 74) -ForegroundColor DarkCyan
}

function Test-Admin {
    try {
        $id = [Security.Principal.WindowsIdentity]::GetCurrent()
        $principal = New-Object Security.Principal.WindowsPrincipal($id)
        return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    } catch {
        return $false
    }
}

function Assert-Windows {
    if ($env:OS -ne 'Windows_NT') {
        throw 'PC Optimizer работает только в Windows 10/11.'
    }
}

# ---------------------------------------------------------------- бэкап

function New-BackupContext {
    param([string]$Preset = 'manual')
    return [pscustomobject]@{
        created = (Get-Date).ToString('o')
        machine = $env:COMPUTERNAME
        user    = $env:USERNAME
        preset  = $Preset
        entries = New-Object System.Collections.ArrayList
    }
}

function Save-BackupContext {
    param([Parameter(Mandatory)]$Context)
    if ($Context.entries.Count -eq 0) { return $null }
    $root = Get-PCOptDataRoot
    $stamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
    $file = Join-Path (Join-Path $root 'backups') "backup-$stamp.json"
    $Context | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $file -Encoding UTF8
    return $file
}

function Get-BackupFiles {
    $root = Get-PCOptDataRoot
    return @(Get-ChildItem -LiteralPath (Join-Path $root 'backups') -Filter 'backup-*.json' -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending)
}

# ---------------------------------------------------------------- реестр

function Get-RegValueInfo {
    <# Возвращает сведения о значении реестра: существует ли, тип, текущее значение. #>
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Name
    )
    $info = [pscustomobject]@{ Exists = $false; Type = $null; Value = $null }
    if (-not (Test-Path -LiteralPath $Path)) { return $info }
    try {
        $key = Get-Item -LiteralPath $Path -ErrorAction Stop
        if ($key.GetValueNames() -notcontains $Name) { return $info }
        $info.Exists = $true
        $info.Type = $key.GetValueKind($Name).ToString()
        $info.Value = $key.GetValue($Name, $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
    } catch {
        return $info
    }
    return $info
}

function Backup-RegValue {
    param(
        [Parameter(Mandatory)]$Context,
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Name
    )
    $info = Get-RegValueInfo -Path $Path -Name $Name
    $value = $info.Value
    if ($info.Type -eq 'Binary' -and $null -ne $value) { $value = @($value) }
    [void]$Context.entries.Add([pscustomobject]@{
        kind    = 'registry'
        path    = $Path
        name    = $Name
        existed = $info.Exists
        type    = $info.Type
        value   = $value
    })
}

function Set-RegValue {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Name,
        [ValidateSet('DWord', 'QWord', 'String', 'ExpandString', 'Binary', 'MultiString')][string]$Type = 'DWord',
        [Parameter(Mandatory)]$Value
    )
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -Path $Path -Force -ErrorAction Stop | Out-Null
    }
    New-ItemProperty -LiteralPath $Path -Name $Name -PropertyType $Type -Value $Value -Force -ErrorAction Stop | Out-Null
}

function Test-RegValue {
    <# Совпадает ли текущее значение с ожидаемым. #>
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)]$Value
    )
    $info = Get-RegValueInfo -Path $Path -Name $Name
    if (-not $info.Exists) { return $false }
    if ($info.Value -is [array] -or $Value -is [array]) {
        return ((@($info.Value) -join ',') -eq (@($Value) -join ','))
    }
    return ([string]$info.Value -eq [string]$Value)
}

# ---------------------------------------------------------------- службы

function Backup-ServiceState {
    param(
        [Parameter(Mandatory)]$Context,
        [Parameter(Mandatory)][string]$Name
    )
    $svc = Get-Service -Name $Name -ErrorAction SilentlyContinue
    if (-not $svc) { return $false }
    $startup = 'Automatic'
    try {
        $wmi = Get-CimInstance -ClassName Win32_Service -Filter "Name='$Name'" -ErrorAction Stop
        $startup = switch ($wmi.StartMode) {
            'Auto'     { 'Automatic' }
            'Manual'   { 'Manual' }
            'Disabled' { 'Disabled' }
            default    { 'Manual' }
        }
    } catch { }
    [void]$Context.entries.Add([pscustomobject]@{
        kind        = 'service'
        name        = $Name
        startupType = $startup
        status      = $svc.Status.ToString()
    })
    return $true
}

function Set-ServiceStartup {
    param(
        [Parameter(Mandatory)][string]$Name,
        [ValidateSet('Automatic', 'Manual', 'Disabled')][string]$StartupType,
        [switch]$StopNow
    )
    $svc = Get-Service -Name $Name -ErrorAction SilentlyContinue
    if (-not $svc) { return $false }
    Set-Service -Name $Name -StartupType $StartupType -ErrorAction Stop
    if ($StopNow -and $svc.Status -eq 'Running') {
        Stop-Service -Name $Name -Force -ErrorAction SilentlyContinue
    }
    return $true
}

# ---------------------------------------------------------------- питание

function Get-ActivePowerSchemeGuid {
    try {
        $out = & powercfg /getactivescheme 2>$null
        if ($out -match '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})') {
            return $Matches[1]
        }
    } catch { }
    return $null
}

function Backup-PowerScheme {
    param([Parameter(Mandatory)]$Context)
    $guid = Get-ActivePowerSchemeGuid
    if (-not $guid) { return $false }
    [void]$Context.entries.Add([pscustomobject]@{ kind = 'powerplan'; guid = $guid })
    return $true
}

# ---------------------------------------------------------------- точка восстановления

function New-RestorePointSafe {
    param([string]$Description = 'PC Optimizer')
    try {
        # снимаем ограничение "не чаще раза в 24 часа", иначе точка молча не создастся
        Set-RegValue -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SystemRestore' `
            -Name 'SystemRestorePointCreationFrequency' -Type DWord -Value 0
        Enable-ComputerRestore -Drive "$env:SystemDrive\" -ErrorAction SilentlyContinue
        Checkpoint-Computer -Description $Description -RestorePointType 'MODIFY_SETTINGS' -ErrorAction Stop
        Write-Log "Точка восстановления Windows создана: $Description" -Level Ok
        return $true
    } catch {
        Write-Log "Точку восстановления создать не удалось ($($_.Exception.Message)). Откат всё равно доступен через -Action restore." -Level Warn
        return $false
    }
}

# ---------------------------------------------------------------- восстановление

function Restore-FromBackupFile {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) { throw "Файл бэкапа не найден: $Path" }
    $data = Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
    $restored = 0
    $failed = 0

    foreach ($entry in @($data.entries)) {
        try {
            switch ($entry.kind) {
                'registry' {
                    if ($entry.existed) {
                        $value = $entry.value
                        switch ($entry.type) {
                            'DWord'  { $value = [int]$value }
                            'QWord'  { $value = [int64]$value }
                            'Binary' { $value = [byte[]]@($value) }
                        }
                        if ($PSCmdlet.ShouldProcess("$($entry.path)\$($entry.name)", 'вернуть прежнее значение')) {
                            Set-RegValue -Path $entry.path -Name $entry.name -Type $entry.type -Value $value
                            Write-Log "реестр: $($entry.path)\$($entry.name) -> $($entry.value)" -Level Ok
                        }
                    } else {
                        if ($PSCmdlet.ShouldProcess("$($entry.path)\$($entry.name)", 'удалить добавленное значение')) {
                            Remove-ItemProperty -LiteralPath $entry.path -Name $entry.name -Force -ErrorAction SilentlyContinue
                            Write-Log "реестр: $($entry.path)\$($entry.name) -> удалено (не существовало)" -Level Ok
                        }
                    }
                    $restored++
                }
                'service' {
                    if ($PSCmdlet.ShouldProcess($entry.name, "вернуть тип запуска $($entry.startupType)")) {
                        Set-ServiceStartup -Name $entry.name -StartupType $entry.startupType | Out-Null
                        if ($entry.status -eq 'Running') {
                            Start-Service -Name $entry.name -ErrorAction SilentlyContinue
                        }
                        Write-Log "служба $($entry.name) -> $($entry.startupType)" -Level Ok
                    }
                    $restored++
                }
                'powerplan' {
                    if ($PSCmdlet.ShouldProcess($entry.guid, 'вернуть схему электропитания')) {
                        & powercfg /setactive $entry.guid 2>$null | Out-Null
                        Write-Log "схема электропитания -> $($entry.guid)" -Level Ok
                    }
                    $restored++
                }
                'mmagent' {
                    if ($PSCmdlet.ShouldProcess('MemoryCompression', "вернуть значение $($entry.compression)")) {
                        if ($entry.compression) {
                            Enable-MMAgent -MemoryCompression -ErrorAction SilentlyContinue
                        } else {
                            Disable-MMAgent -MemoryCompression -ErrorAction SilentlyContinue
                        }
                        Write-Log "сжатие памяти -> $($entry.compression)" -Level Ok
                    }
                    $restored++
                }
                'powercfgvalue' {
                    if ($PSCmdlet.ShouldProcess("$($entry.sub)\$($entry.setting)", 'вернуть параметр электропитания')) {
                        & powercfg /setacvalueindex $entry.scheme $entry.sub $entry.setting $entry.ac 2>$null | Out-Null
                        & powercfg /setactive $entry.scheme 2>$null | Out-Null
                    }
                    $restored++
                }
                default {
                    Write-Log "неизвестный тип записи бэкапа: $($entry.kind)" -Level Warn
                }
            }
        } catch {
            $failed++
            Write-Log "не удалось откатить $($entry.kind) $($entry.name): $($_.Exception.Message)" -Level Error
        }
    }

    Write-Log "Откат завершён: восстановлено записей - $restored, ошибок - $failed." -Level Info
    return [pscustomobject]@{ Restored = $restored; Failed = $failed }
}
