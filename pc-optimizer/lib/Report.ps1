#Requires -Version 5.1
<#
    Report.ps1 - диагностика системы.

    Задача отчёта: найти то, что реально крадёт FPS. Обычно самые крупные
    потери - это не "непочищенный реестр", а выключенный XMP, одна планка
    памяти вместо двух, монитор на 60 Гц вместо 165 и старый драйвер.
#>

function Get-PCFacts {
    $facts = [ordered]@{}

    try {
        $cs = Get-CimInstance Win32_ComputerSystem -ErrorAction Stop
        $facts.RamTotalGB = [math]::Round($cs.TotalPhysicalMemory / 1GB, 1)
        $facts.Model = "$($cs.Manufacturer) $($cs.Model)".Trim()
    } catch { $facts.RamTotalGB = 0; $facts.Model = 'н/д' }

    try {
        $cpu = @(Get-CimInstance Win32_Processor -ErrorAction Stop)[0]
        $facts.CpuName = $cpu.Name.Trim()
        $facts.CpuCores = $cpu.NumberOfCores
        $facts.CpuThreads = $cpu.NumberOfLogicalProcessors
        $facts.CpuMaxClockMHz = $cpu.MaxClockSpeed
    } catch { $facts.CpuName = 'н/д' }

    # Материнская плата. Чипсет важен: на Intel H610/H510/H410 разгон памяти
    # заблокирован, там базовая частота JEDEC - это потолок платформы,
    # а не забытый в BIOS профиль XMP.
    $facts.Board = 'н/д'
    $facts.MemoryOcSupported = $true
    try {
        $bb = Get-CimInstance Win32_BaseBoard -ErrorAction Stop
        $facts.Board = "$($bb.Manufacturer) $($bb.Product)".Trim()
        if ($bb.Product -match '\bH[3-6]10\b' -or $bb.Product -match '\bH[3-6]10[A-Z]') {
            $facts.MemoryOcSupported = $false
        }
    } catch { }

    $facts.Gpus = @()
    try {
        foreach ($g in (Get-CimInstance Win32_VideoController -ErrorAction Stop)) {
            $facts.Gpus += [pscustomobject]@{
                Name          = $g.Name
                DriverVersion = $g.DriverVersion
                DriverDate    = $g.DriverDate
                RefreshNow    = $g.CurrentRefreshRate
                RefreshMax    = $g.MaxRefreshRate
                Resolution    = "$($g.CurrentHorizontalResolution)x$($g.CurrentVerticalResolution)"
            }
        }
    } catch { }

    $facts.Memory = @()
    try {
        foreach ($m in (Get-CimInstance Win32_PhysicalMemory -ErrorAction Stop)) {
            $type = switch ([int]$m.SMBIOSMemoryType) {
                26      { 'DDR4' }
                34      { 'DDR5' }
                default { "тип $($m.SMBIOSMemoryType)" }
            }
            $facts.Memory += [pscustomobject]@{
                Bank       = $m.DeviceLocator
                SizeGB     = [math]::Round($m.Capacity / 1GB, 0)
                Type       = $type
                RatedMHz   = $m.Speed
                ActualMHz  = $m.ConfiguredClockSpeed
                Part       = ($m.PartNumber + '').Trim()
            }
        }
    } catch { }

    try {
        $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
        $facts.OsName = $os.Caption
        $facts.OsBuild = $os.BuildNumber
        $facts.UptimeHours = [math]::Round(((Get-Date) - $os.LastBootUpTime).TotalHours, 1)
    } catch { }

    # состояние ключевых настроек
    $facts.Hags = (Get-RegValueInfo -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' -Name 'HwSchMode').Value
    $facts.GameMode = (Get-RegValueInfo -Path 'HKCU:\SOFTWARE\Microsoft\GameBar' -Name 'AutoGameModeEnabled').Value
    $facts.GameDvr = (Get-RegValueInfo -Path 'HKCU:\System\GameConfigStore' -Name 'GameDVR_Enabled').Value
    $facts.PowerScheme = Get-ActivePowerSchemeGuid

    $facts.VbsRunning = $null
    try {
        $dg = Get-CimInstance -Namespace 'root\Microsoft\Windows\DeviceGuard' -ClassName Win32_DeviceGuard -ErrorAction Stop
        $facts.VbsRunning = ($dg.VirtualizationBasedSecurityStatus -eq 2)
        $facts.HvciRunning = (@($dg.SecurityServicesRunning) -contains 2)
    } catch { }

    $facts.SystemDiskType = 'н/д'
    $facts.SystemDiskFreeGB = 0
    $facts.SystemDiskSizeGB = 0
    try {
        $sysLetter = ($env:SystemDrive).TrimEnd(':')
        $vol = Get-Volume -DriveLetter $sysLetter -ErrorAction Stop
        $facts.SystemDiskFreeGB = [math]::Round($vol.SizeRemaining / 1GB, 1)
        $facts.SystemDiskSizeGB = [math]::Round($vol.Size / 1GB, 1)
        $disks = @(Get-PhysicalDisk -ErrorAction SilentlyContinue | Select-Object -ExpandProperty MediaType -Unique)
        if ($disks) { $facts.SystemDiskType = ($disks -join ', ') }
    } catch { }

    $facts.Nvidia = $null
    try {
        $exe = $null
        $cmd = Get-Command 'nvidia-smi' -ErrorAction SilentlyContinue
        if ($cmd) {
            $exe = $cmd.Source
        } else {
            $p = Join-Path $env:SystemRoot 'System32\nvidia-smi.exe'
            if (Test-Path -LiteralPath $p) { $exe = $p }
        }
        if ($exe) {
            $q = & $exe --query-gpu=name,driver_version,temperature.gpu,power.limit,memory.total,pcie.link.gen.current,pcie.link.width.current --format=csv,noheader,nounits 2>$null
            if ($q) {
                $parts = ($q | Select-Object -First 1) -split '\s*,\s*'
                $facts.Nvidia = [pscustomobject]@{
                    Name        = $parts[0]
                    Driver      = $parts[1]
                    TempC       = $parts[2]
                    PowerLimitW = $parts[3]
                    VramMB      = $parts[4]
                    PcieGen     = $parts[5]
                    PcieWidth   = $parts[6]
                }
            }
        }
    } catch { }

    $facts.StartupItems = @()
    try {
        $facts.StartupItems = @(Get-CimInstance Win32_StartupCommand -ErrorAction Stop |
            Select-Object -ExpandProperty Name)
    } catch { }

    return [pscustomobject]$facts
}

function Get-PCFindings {
    <# Превращает факты в список проблем, отсортированный по важности. #>
    param([Parameter(Mandatory)]$Facts)

    $findings = New-Object System.Collections.ArrayList
    function Add-Finding {
        param($Severity, $Title, $Detail)
        [void]$findings.Add([pscustomobject]@{ Severity = $Severity; Title = $Title; Detail = $Detail })
    }

    # --- память: самый частый источник потерянных 10-25% FPS
    $modules = @($Facts.Memory)
    if ($modules.Count -eq 1) {
        Add-Finding 'Критично' 'Память работает в одноканальном режиме' `
            'Установлена одна планка. Вторая планка того же объёма даёт +10-25% FPS в играх, зависящих от CPU. Ставить в слоты A2 и B2.'
    } elseif ($modules.Count -ge 2) {
        $sizes = @($modules | Select-Object -ExpandProperty SizeGB -Unique)
        if ($sizes.Count -gt 1) {
            Add-Finding 'Важно' 'Планки памяти разного объёма' `
                'Двухканальный режим работает частично (flex mode). По возможности использовать одинаковые планки.'
        }
    }
    $ddr5Base = @($modules | Where-Object { $_.Type -eq 'DDR5' -and $_.ActualMHz -le 4800 })
    $ddr4Base = @($modules | Where-Object { $_.Type -eq 'DDR4' -and $_.ActualMHz -le 2133 })
    $slowerThanRated = @($modules | Where-Object { $_.RatedMHz -and $_.ActualMHz -and $_.ActualMHz -lt $_.RatedMHz })

    if (-not $Facts.MemoryOcSupported) {
        # Плата на заблокированном чипсете: советовать XMP бессмысленно - его там нет.
        if ($ddr5Base.Count -gt 0 -or $ddr4Base.Count -gt 0 -or $slowerThanRated.Count -gt 0) {
            Add-Finding 'Средне' 'Память на базовой частоте, и это потолок платы' `
                ("Чипсет платы ($($Facts.Board)) не поддерживает разгон памяти - пункта XMP в BIOS нет, " +
                 'частота выше базовой недостижима. Это не ошибка настройки: поднять её можно только заменой платы ' +
                 'на B760/H770/Z790, и ради 5-15% FPS такая замена обычно себя не окупает.')
        }
    } else {
        if ($slowerThanRated.Count -gt 0) {
            $m = $slowerThanRated[0]
            Add-Finding 'Критично' "XMP/EXPO выключен ($($m.Bank))" `
                "Планка рассчитана на $($m.RatedMHz) МГц, а работает на $($m.ActualMHz) МГц. Включите профиль XMP/EXPO в BIOS - это до +15% FPS и бесплатно."
        }
        if ($ddr5Base.Count -gt 0 -or $ddr4Base.Count -gt 0) {
            Add-Finding 'Важно' 'Память на базовой (JEDEC) частоте' `
                'i5-14400F хорошо реагирует на скорость памяти. Профиль XMP в BIOS поднимает DDR5 с 4800 до 6000+ МГц (DDR4 - с 2133 до 3200+).'
        }
    }

    # --- монитор
    foreach ($g in @($Facts.Gpus)) {
        if ($g.RefreshNow -and $g.RefreshMax -and $g.RefreshMax -gt $g.RefreshNow) {
            Add-Finding 'Критично' "Монитор работает не на максимальной частоте ($($g.RefreshNow) Гц из $($g.RefreshMax) Гц)" `
                'Параметры > Система > Дисплей > Расширенные параметры дисплея > Частота обновления. Кадры выше текущей частоты вы просто не увидите.'
        }
    }

    # --- драйвер видеокарты
    if ($Facts.Nvidia) {
        # ширина/поколение линии PCIe
        if ($Facts.Nvidia.PcieWidth -and [int]$Facts.Nvidia.PcieWidth -lt 8) {
            Add-Finding 'Важно' "Видеокарта работает по x$($Facts.Nvidia.PcieWidth) линиям PCIe" `
                'RTX 4060 использует x8. Меньше - значит карта стоит не в верхнем слоте или слот делится с M.2 накопителем.'
        }
        if ($Facts.Nvidia.TempC -and [int]$Facts.Nvidia.TempC -gt 80) {
            Add-Finding 'Важно' "Температура GPU $($Facts.Nvidia.TempC) °C" `
                'Выше 80 °C RTX 4060 начинает сбрасывать частоты. Проверьте продув корпуса и пыль в радиаторе.'
        }
    }
    foreach ($g in @($Facts.Gpus)) {
        if ($g.DriverDate -and $g.Name -match 'NVIDIA') {
            $age = ((Get-Date) - [datetime]$g.DriverDate).Days
            if ($age -gt 180) {
                Add-Finding 'Важно' "Драйверу видеокарты $age дней" `
                    'Свежий Game Ready драйвер часто даёт +5-15% в новых играх. nvidia.com/download или приложение NVIDIA App.'
            }
        }
    }

    # --- Windows
    if ([string]$Facts.Hags -ne '2') {
        Add-Finding 'Важно' 'HAGS (аппаратное планирование GPU) выключен' 'Включается оптимизацией hags. Нужен для NVIDIA Reflex и DLSS Frame Generation.'
    }
    if ([string]$Facts.GameDvr -eq '1' -or $null -eq $Facts.GameDvr) {
        Add-Finding 'Важно' 'Фоновая запись Game DVR включена' 'Отнимает 2-6% FPS. Отключается оптимизацией gamedvr-off.'
    }
    if ([string]$Facts.GameMode -ne '1') {
        Add-Finding 'Средне' 'Игровой режим Windows выключен' 'Включается оптимизацией game-mode.'
    }
    if ($Facts.VbsRunning) {
        Add-Finding 'Средне' 'Активна VBS / Целостность памяти' `
            'Стоит 5-15% FPS в CPU-зависимых играх. Отключается вручную: -Tweak vbs-off -AllowSecurityTradeoffs. Это компромисс с безопасностью - решайте осознанно.'
    }
    if ($Facts.PowerScheme -and $Facts.PowerScheme -eq '381b4222-f694-41f0-9685-ff5bb260df2e') {
        Add-Finding 'Средне' 'Активна "Сбалансированная" схема электропитания' 'Ядра паркуются и сбрасывают частоту. Исправляется оптимизацией power-ultimate.'
    }

    # --- диск
    if ($Facts.SystemDiskSizeGB -gt 0) {
        $freePct = [math]::Round(100 * $Facts.SystemDiskFreeGB / $Facts.SystemDiskSizeGB, 1)
        if ($freePct -lt 10) {
            Add-Finding 'Важно' "На системном диске свободно $freePct%" `
                'SSD теряет скорость записи при заполнении выше 90%, растут подгрузки текстур и фризы. Освободите место (см. -Action clean).'
        }
    }
    if ($Facts.SystemDiskType -match 'HDD') {
        Add-Finding 'Средне' 'В системе есть механический диск (HDD)' 'Игры с открытым миром на HDD дают фризы подгрузки. Перенос на SSD/NVMe важнее любых твиков.'
    }

    # --- прочее
    if ($Facts.UptimeHours -gt 168) {
        Add-Finding 'Средне' "ПК не перезагружался $([math]::Round($Facts.UptimeHours / 24, 1)) дней" 'Накапливаются утечки памяти драйверов и фоновых приложений.'
    }
    if (@($Facts.StartupItems).Count -gt 12) {
        Add-Finding 'Средне' "В автозагрузке $(@($Facts.StartupItems).Count) программ" `
            'Каждый оверлей (Discord, лаунчеры, RGB-софт, браузер) отнимает CPU и ОЗУ. Диспетчер задач > Автозагрузка.'
    }

    $order = @{ 'Критично' = 0; 'Важно' = 1; 'Средне' = 2 }
    return @($findings | Sort-Object { $order[$_.Severity] })
}

function Show-PCReport {
    param([switch]$Save)

    Write-Header 'ДИАГНОСТИКА СИСТЕМЫ'
    $facts = Get-PCFacts

    Write-Host ''
    Write-Host ' Железо' -ForegroundColor White
    Write-Host "   Плата   : $($facts.Board)"
    Write-Host "   CPU     : $($facts.CpuName)  ($($facts.CpuCores) ядер / $($facts.CpuThreads) потоков)"
    foreach ($g in @($facts.Gpus)) {
        Write-Host "   GPU     : $($g.Name)  драйвер $($g.DriverVersion)"
        Write-Host "   Экран   : $($g.Resolution) @ $($g.RefreshNow) Гц (максимум $($g.RefreshMax) Гц)"
    }
    Write-Host "   ОЗУ     : $($facts.RamTotalGB) ГБ, планок - $(@($facts.Memory).Count)"
    foreach ($m in @($facts.Memory)) {
        Write-Host "             $($m.Bank): $($m.SizeGB) ГБ $($m.Type), факт $($m.ActualMHz) МГц (профиль $($m.RatedMHz) МГц)"
    }
    Write-Host "   Диск    : $($facts.SystemDiskType), свободно $($facts.SystemDiskFreeGB) из $($facts.SystemDiskSizeGB) ГБ"
    if ($facts.Nvidia) {
        Write-Host "   NVIDIA  : $($facts.Nvidia.TempC) °C, лимит $($facts.Nvidia.PowerLimitW) Вт, PCIe $($facts.Nvidia.PcieGen).0 x$($facts.Nvidia.PcieWidth)"
    }

    Write-Host ''
    Write-Host ' Система' -ForegroundColor White
    Write-Host "   ОС      : $($facts.OsName) (сборка $($facts.OsBuild))"
    Write-Host "   Аптайм  : $($facts.UptimeHours) ч"
    Write-Host "   HAGS    : $(if ([string]$facts.Hags -eq '2') { 'включён' } else { 'выключен' })"
    Write-Host "   Game DVR: $(if ([string]$facts.GameDvr -eq '0') { 'выключен' } else { 'включён' })"
    Write-Host "   VBS     : $(if ($facts.VbsRunning) { 'работает' } else { 'не работает' })"

    $findings = Get-PCFindings -Facts $facts

    Write-Header 'ЧТО МЕШАЕТ FPS'
    if (@($findings).Count -eq 0) {
        Write-Log 'Явных проблем не найдено - система уже настроена.' -Level Ok
    }
    foreach ($f in $findings) {
        $color = switch ($f.Severity) {
            'Критично' { 'Red' }
            'Важно'    { 'Yellow' }
            default    { 'Gray' }
        }
        Write-Host ''
        Write-Host "  [$($f.Severity)] $($f.Title)" -ForegroundColor $color
        Write-Host "     $($f.Detail)" -ForegroundColor DarkGray
    }

    Write-Header 'РУЧНЫЕ ШАГИ (скрипт их сделать не может)'
    $manual = @()
    if ($facts.MemoryOcSupported) {
        $manual += 'BIOS: включить профиль памяти XMP (Intel) - самый крупный бесплатный прирост для i5-14400F.'
    } else {
        $manual += 'BIOS: пункта XMP нет - чипсет платы не поддерживает разгон памяти. Базовая частота здесь и есть потолок, это нормально.'
    }
    $manual += @(
        'BIOS: включить Above 4G Decoding и Resizable BAR - для RTX 4060 это +2-8% в ряде игр.',
        'Панель управления NVIDIA > Управление параметрами 3D:',
        '   - Режим управления электропитанием: "Предпочтителен режим максимальной производительности"',
        '   - Режим низкой задержки: "Вкл." (или "Сверхвысокий" для соревновательных игр)',
        '   - Вертикальный синхроимпульс: Выкл. (при G-Sync - Вкл. + ограничитель кадров)',
        '   - Кэш шейдеров: 10 ГБ',
        'Монитор: выставить максимальную частоту обновления и включить G-Sync, если поддерживается.',
        'В играх: DLSS (Quality/Balanced) на RTX 4060 - это +30-60% FPS, больше любых системных твиков.',
        'В играх: следить за VRAM. У RTX 4060 8 ГБ - текстуры "Ultra" в 1440p часто дают фризы, а не низкий FPS.',
        'Ограничить FPS на 2-3 кадра ниже частоты монитора (NVIDIA App или встроенный лимитер) - ровнее фреймтайм.'
    )
    foreach ($line in $manual) { Write-Host "  * $line" -ForegroundColor Gray }

    if ($Save) {
        $root = Get-PCOptDataRoot
        $file = Join-Path (Join-Path $root 'logs') ("report-" + (Get-Date -Format 'yyyy-MM-dd_HH-mm-ss') + '.json')
        [pscustomobject]@{ facts = $facts; findings = $findings } | ConvertTo-Json -Depth 6 |
            Set-Content -LiteralPath $file -Encoding UTF8
        Write-Host ''
        Write-Log "Отчёт сохранён: $file" -Level Ok
    }

    return [pscustomobject]@{ Facts = $facts; Findings = $findings }
}
