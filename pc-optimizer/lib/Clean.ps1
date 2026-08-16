#Requires -Version 5.1
<#
    Clean.ps1 - безопасная очистка мусора.

    Чистятся только каталоги, которые Windows и драйверы пересоздают сами.
    Личные файлы, документы, сохранения игр и настройки не трогаются.
    Кэш шейдеров чистить полезно после смены драйвера: старый кэш - частая
    причина фризов в первые минуты игры.
#>

function Get-FolderSizeMB {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return 0 }
    try {
        $bytes = (Get-ChildItem -LiteralPath $Path -Recurse -Force -File -ErrorAction SilentlyContinue |
            Measure-Object -Property Length -Sum).Sum
        return [math]::Round(($bytes / 1MB), 1)
    } catch {
        return 0
    }
}

function Get-CleanTargets {
    $targets = @(
        @{ Name = 'Временные файлы пользователя'; Path = $env:TEMP },
        @{ Name = 'Временные файлы Windows';      Path = (Join-Path $env:SystemRoot 'Temp') },
        @{ Name = 'Кэш шейдеров DirectX';         Path = (Join-Path $env:LOCALAPPDATA 'D3DSCache') },
        @{ Name = 'Кэш шейдеров NVIDIA (DX)';     Path = (Join-Path $env:LOCALAPPDATA 'NVIDIA\DXCache') },
        @{ Name = 'Кэш шейдеров NVIDIA (GL)';     Path = (Join-Path $env:LOCALAPPDATA 'NVIDIA\GLCache') },
        @{ Name = 'Кэш NVIDIA Corporation';       Path = (Join-Path $env:LOCALAPPDATA 'NVIDIA Corporation\NV_Cache') },
        @{ Name = 'Дампы аварийного завершения';  Path = (Join-Path $env:LOCALAPPDATA 'CrashDumps') },
        @{ Name = 'Скачанные обновления Windows'; Path = (Join-Path $env:SystemRoot 'SoftwareDistribution\Download') }
    )
    return @($targets | Where-Object { $_.Path -and (Test-Path -LiteralPath $_.Path) })
}

function Invoke-PCClean {
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [switch]$IncludeRecycleBin,
        [switch]$Trim
    )

    Write-Header 'ОЧИСТКА'
    $freed = 0.0

    foreach ($t in (Get-CleanTargets)) {
        $sizeMB = Get-FolderSizeMB -Path $t.Path
        if ($sizeMB -lt 1) {
            Write-Log "$($t.Name): чисто" -Level Info
            continue
        }
        if (-not $PSCmdlet.ShouldProcess($t.Path, "удалить содержимое ($sizeMB МБ)")) { continue }

        $before = $sizeMB
        Get-ChildItem -LiteralPath $t.Path -Force -ErrorAction SilentlyContinue | ForEach-Object {
            try {
                Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction Stop
            } catch {
                # файл занят работающим процессом - это нормально, пропускаем
            }
        }
        $after = Get-FolderSizeMB -Path $t.Path
        $delta = [math]::Round($before - $after, 1)
        $freed += $delta
        Write-Log "$($t.Name): освобождено $delta МБ" -Level Ok
    }

    if ($IncludeRecycleBin) {
        if ($PSCmdlet.ShouldProcess('Корзина', 'очистить')) {
            try {
                Clear-RecycleBin -Force -ErrorAction Stop
                Write-Log 'Корзина очищена' -Level Ok
            } catch {
                Write-Log "Корзину очистить не удалось: $($_.Exception.Message)" -Level Warn
            }
        }
    }

    if ($Trim) {
        $sysLetter = ($env:SystemDrive).TrimEnd(':')
        if ($PSCmdlet.ShouldProcess("$sysLetter`:", 'выполнить TRIM')) {
            try {
                Optimize-Volume -DriveLetter $sysLetter -ReTrim -ErrorAction Stop
                Write-Log "TRIM для диска $sysLetter выполнен" -Level Ok
            } catch {
                Write-Log "TRIM не выполнен: $($_.Exception.Message)" -Level Warn
            }
        }
    }

    Write-Host ''
    Write-Log ("Итого освобождено: {0} МБ" -f [math]::Round($freed, 1)) -Level Ok
    Write-Log 'Первый запуск игр после очистки кэша шейдеров будет чуть медленнее - кэш соберётся заново.' -Level Info
}
