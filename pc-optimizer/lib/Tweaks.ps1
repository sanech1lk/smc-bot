#Requires -Version 5.1
<#
    Tweaks.ps1 - каталог оптимизаций.

    Каждая оптимизация описана данными, а не кодом:
      Id       - короткий идентификатор для -Tweak
      Presets  - в какие профили входит (safe / gaming / max); пустой массив =
                 только ручной запуск по Id
      Risk     - Низкий / Средний / Высокий
      Gain     - честная оценка эффекта, без маркетинга
      Registry - список значений реестра (бэкап и запись делаются автоматически)
      Apply    - для нестандартных действий (службы, powercfg и т.п.)
      Detect   - проверка "уже применено" (по умолчанию сверяются значения Registry)

    Сознательно НЕ включены популярные "твики" без доказанного эффекта:
    отключение файла подкачки, "очистка ОЗУ", Prefetch/Superfetch-мифы,
    bcdedit /set disabledynamictick, timer resolution-хаки, "игровые" DNS.
    На современной Windows 11 они либо ничего не дают, либо вредят.
#>

function Get-TweakCatalog {

    $tweaks = @()

    # ------------------------------------------------------------- ГРАФИКА / GPU

    $tweaks += [pscustomobject]@{
        Id       = 'hags'
        Name     = 'Аппаратное ускорение планирования GPU (HAGS)'
        Category = 'GPU'
        Risk     = 'Низкий'
        Presets  = @('safe', 'gaming', 'max')
        Gain     = 'Меньше задержка ввода, +0-3% FPS. Обязателен для NVIDIA Reflex и DLSS Frame Generation на RTX 4060.'
        Reboot   = $true
        Registry = @(
            @{ Path = 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers'; Name = 'HwSchMode'; Type = 'DWord'; Value = 2 }
        )
        Apply    = $null
        Detect   = $null
        Notes    = 'Требуется перезагрузка. Если появятся артефакты или падения драйвера - откатите (значение 1).'
    }

    $tweaks += [pscustomobject]@{
        Id       = 'game-mode'
        Name     = 'Игровой режим Windows'
        Category = 'Windows'
        Risk     = 'Низкий'
        Presets  = @('safe', 'gaming', 'max')
        Gain     = 'Windows придерживает фоновые задачи и обновления во время игры: меньше просадок 1% low.'
        Reboot   = $false
        Registry = @(
            @{ Path = 'HKCU:\SOFTWARE\Microsoft\GameBar'; Name = 'AutoGameModeEnabled'; Type = 'DWord'; Value = 1 },
            @{ Path = 'HKCU:\SOFTWARE\Microsoft\GameBar'; Name = 'AllowAutoGameMode'; Type = 'DWord'; Value = 1 }
        )
        Apply    = $null
        Detect   = $null
        Notes    = ''
    }

    $tweaks += [pscustomobject]@{
        Id       = 'gamedvr-off'
        Name     = 'Отключение фоновой записи Game DVR'
        Category = 'GPU'
        Risk     = 'Низкий'
        Presets  = @('safe', 'gaming', 'max')
        Gain     = '+2-6% FPS. Фоновая запись Xbox Game Bar постоянно занимает кодировщик NVENC и часть кадрового времени.'
        Reboot   = $false
        Registry = @(
            @{ Path = 'HKCU:\System\GameConfigStore'; Name = 'GameDVR_Enabled'; Type = 'DWord'; Value = 0 },
            @{ Path = 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR'; Name = 'AppCaptureEnabled'; Type = 'DWord'; Value = 0 },
            @{ Path = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR'; Name = 'AllowGameDVR'; Type = 'DWord'; Value = 0 }
        )
        Apply    = $null
        Detect   = $null
        Notes    = 'Сама панель Win+G продолжает работать, отключается только фоновая запись последних минут.'
    }

    $tweaks += [pscustomobject]@{
        Id       = 'windowed-opt'
        Name     = 'Оптимизации для оконных игр + VRR'
        Category = 'GPU'
        Risk     = 'Низкий'
        Presets  = @('safe', 'gaming', 'max')
        Gain     = 'Игры в окне/безрамочном окне получают режим flip-model: задержка почти как в полном экране, работает G-Sync.'
        Reboot   = $false
        Registry = @()
        Apply    = {
            param($Context)
            $path = 'HKCU:\SOFTWARE\Microsoft\DirectX\UserGpuPreferences'
            $name = 'DirectXUserGlobalSettings'
            Backup-RegValue -Context $Context -Path $path -Name $name
            $current = (Get-RegValueInfo -Path $path -Name $name).Value
            $pairs = [ordered]@{}
            if ($current) {
                foreach ($chunk in ([string]$current -split ';')) {
                    if ($chunk -match '^\s*([^=]+)=(.*)$') { $pairs[$Matches[1]] = $Matches[2] }
                }
            }
            $pairs['SwapEffectUpgradeEnable'] = '1'
            $pairs['VRROptimizeEnable'] = '1'
            $value = (($pairs.Keys | ForEach-Object { "$_=$($pairs[$_])" }) -join ';') + ';'
            Set-RegValue -Path $path -Name $name -Type String -Value $value
            return $true
        }
        Detect   = {
            $v = [string](Get-RegValueInfo -Path 'HKCU:\SOFTWARE\Microsoft\DirectX\UserGpuPreferences' -Name 'DirectXUserGlobalSettings').Value
            return ($v -match 'SwapEffectUpgradeEnable=1' -and $v -match 'VRROptimizeEnable=1')
        }
        Notes    = ''
    }

    # ------------------------------------------------------------- ПЛАНИРОВЩИК / ПРИОРИТЕТЫ

    $tweaks += [pscustomobject]@{
        Id       = 'mmcss-games'
        Name     = 'Приоритет игровых задач в планировщике (MMCSS)'
        Category = 'CPU'
        Risk     = 'Низкий'
        Presets  = @('gaming', 'max')
        Gain     = 'Стабильнее 1% low: игровому потоку и GPU-очереди даётся приоритет над фоновыми задачами.'
        Reboot   = $true
        Registry = @(
            @{ Path = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile'; Name = 'SystemResponsiveness'; Type = 'DWord'; Value = 10 },
            @{ Path = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games'; Name = 'GPU Priority'; Type = 'DWord'; Value = 8 },
            @{ Path = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games'; Name = 'Priority'; Type = 'DWord'; Value = 6 },
            @{ Path = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games'; Name = 'Scheduling Category'; Type = 'String'; Value = 'High' },
            @{ Path = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games'; Name = 'SFIO Priority'; Type = 'String'; Value = 'High' }
        )
        Apply    = $null
        Detect   = $null
        Notes    = 'SystemResponsiveness = 10, а не 0: при 0 у части звуковых карт появляются щелчки.'
    }

    $tweaks += [pscustomobject]@{
        Id       = 'net-throttle-off'
        Name     = 'Отключение сетевого троттлинга мультимедиа'
        Category = 'Сеть'
        Risk     = 'Низкий'
        Presets  = @('gaming', 'max')
        Gain     = 'Снимает искусственный лимит ~10 000 пакетов/с. Заметно в сетевых играх и при стриминге.'
        Reboot   = $true
        Registry = @(
            # -1 записывается в реестр как 0xFFFFFFFF - штатное значение "отключено"
            @{ Path = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile'; Name = 'NetworkThrottlingIndex'; Type = 'DWord'; Value = -1 }
        )
        Apply    = $null
        Detect   = {
            $v = (Get-RegValueInfo -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile' -Name 'NetworkThrottlingIndex').Value
            return ($null -ne $v -and ([int]$v -eq -1 -or [string]$v -eq '4294967295'))
        }
        Notes    = ''
    }

    $tweaks += [pscustomobject]@{
        Id       = 'prio-foreground'
        Name     = 'Больше квантов CPU активному окну'
        Category = 'CPU'
        Risk     = 'Средний'
        Presets  = @('gaming', 'max')
        Gain     = 'Win32PrioritySeparation = 0x26: игра на переднем плане реже вытесняется фоном.'
        Reboot   = $true
        Registry = @(
            @{ Path = 'HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl'; Name = 'Win32PrioritySeparation'; Type = 'DWord'; Value = 38 }
        )
        Apply    = $null
        Detect   = $null
        Notes    = 'Если параллельно рендерите/компилируете в фоне - лучше откатить (значение по умолчанию 2).'
    }

    # ------------------------------------------------------------- ПИТАНИЕ

    $tweaks += [pscustomobject]@{
        Id       = 'power-ultimate'
        Name     = 'Схема "Максимальная производительность" + PCIe/USB без энергосбережения'
        Category = 'Питание'
        Risk     = 'Низкий'
        Presets  = @('gaming', 'max')
        Gain     = 'Ядра i5-14400F не уходят в паркинг, PCIe-линия RTX 4060 не сбрасывает состояние: стабильнее фреймтайм.'
        Reboot   = $false
        Registry = @()
        Apply    = {
            param($Context)
            Backup-PowerScheme -Context $Context | Out-Null
            $ultimateTemplate = 'e9a42b02-d5df-448d-aa00-03f14749eb61'
            $list = (& powercfg /list 2>$null) -join "`n"
            $guid = $null
            if ($list -match $ultimateTemplate) {
                $guid = $ultimateTemplate
            } else {
                $out = (& powercfg -duplicatescheme $ultimateTemplate 2>$null) -join "`n"
                if ($out -match '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})') {
                    $guid = $Matches[1]
                }
            }
            if (-not $guid) {
                # схема недоступна (редакция Windows) - берём "Высокая производительность"
                $guid = '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c'
                Write-Log 'Схема "Максимальная производительность" недоступна, включаю "Высокая производительность".' -Level Warn
            }
            & powercfg /setactive $guid 2>$null | Out-Null
            # PCI Express -> Управление питанием состояния связи -> Откл.
            & powercfg /setacvalueindex $guid 501a4d13-42af-4429-9fd1-a8218c268e20 ee12f906-d277-404b-b6da-e5fa1a576df5 0 2>$null | Out-Null
            # USB -> Параметр временного отключения USB-порта -> Запрещено
            & powercfg /setacvalueindex $guid 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0 2>$null | Out-Null
            & powercfg /setactive $guid 2>$null | Out-Null
            return $true
        }
        Detect   = {
            $guid = Get-ActivePowerSchemeGuid
            return ($guid -in @('e9a42b02-d5df-448d-aa00-03f14749eb61', '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c'))
        }
        Notes    = 'Простой ПК будет потреблять на 5-15 Вт больше. Для десктопа это нормально.'
    }

    # ------------------------------------------------------------- ИНТЕРФЕЙС

    $tweaks += [pscustomobject]@{
        Id       = 'visual-fx'
        Name     = 'Эффекты рабочего стола: производительность вместо красоты'
        Category = 'Windows'
        Risk     = 'Низкий'
        Presets  = @('gaming', 'max')
        Gain     = 'Освобождает немного GPU и VRAM у DWM. На FPS в полноэкранной игре влияет слабо, заметнее при alt-tab.'
        Reboot   = $false
        Registry = @(
            @{ Path = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects'; Name = 'VisualFXSetting'; Type = 'DWord'; Value = 2 },
            @{ Path = 'HKCU:\Control Panel\Desktop'; Name = 'FontSmoothing'; Type = 'String'; Value = '2' },
            @{ Path = 'HKCU:\Control Panel\Desktop\WindowMetrics'; Name = 'MinAnimate'; Type = 'String'; Value = '0' },
            @{ Path = 'HKCU:\Control Panel\Desktop'; Name = 'MenuShowDelay'; Type = 'String'; Value = '0' },
            @{ Path = 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize'; Name = 'EnableTransparency'; Type = 'DWord'; Value = 0 }
        )
        Apply    = $null
        Detect   = $null
        Notes    = 'Сглаживание шрифтов остаётся включённым - текст не станет "лесенкой".'
    }

    # ------------------------------------------------------------- СЛУЖБЫ

    $tweaks += [pscustomobject]@{
        Id       = 'svc-diagtrack'
        Name     = 'Отключение службы телеметрии (DiagTrack)'
        Category = 'Службы'
        Risk     = 'Низкий'
        Presets  = @('gaming', 'max')
        Gain     = 'Убирает периодические всплески записи на диск и работы CPU в фоне.'
        Reboot   = $false
        Registry = @()
        Apply    = {
            param($Context)
            if (-not (Backup-ServiceState -Context $Context -Name 'DiagTrack')) {
                Write-Log 'Служба DiagTrack не найдена - пропускаю.' -Level Warn
                return $false
            }
            Set-ServiceStartup -Name 'DiagTrack' -StartupType Disabled -StopNow | Out-Null
            return $true
        }
        Detect   = {
            $s = Get-CimInstance -ClassName Win32_Service -Filter "Name='DiagTrack'" -ErrorAction SilentlyContinue
            return ($null -ne $s -and $s.StartMode -eq 'Disabled')
        }
        Notes    = 'На работу Windows Update и лицензии не влияет.'
    }

    # ------------------------------------------------------------- ТОЛЬКО ВРУЧНУЮ (-Tweak <id>)

    $tweaks += [pscustomobject]@{
        Id       = 'mem-compression-off'
        Name     = 'Отключение сжатия памяти (только при 32 ГБ ОЗУ и больше)'
        Category = 'Память'
        Risk     = 'Средний'
        Presets  = @('max')
        Gain     = 'Снимает нагрузку на CPU от сжатия страниц. При 32 ГБ памяти сжимать почти нечего, а такты тратятся.'
        Reboot   = $true
        Registry = @()
        Apply    = {
            param($Context)
            $total = 0
            try { $total = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB) } catch { }
            if ($total -lt 24) {
                Write-Log "Обнаружено $total ГБ ОЗУ - сжатие памяти отключать нельзя, пропускаю." -Level Warn
                return $false
            }
            $state = $true
            try { $state = [bool](Get-MMAgent).MemoryCompression } catch { }
            [void]$Context.entries.Add([pscustomobject]@{ kind = 'mmagent'; name = 'MemoryCompression'; compression = $state })
            Disable-MMAgent -MemoryCompression -ErrorAction Stop
            return $true
        }
        Detect   = {
            try { return (-not (Get-MMAgent).MemoryCompression) } catch { return $false }
        }
        Notes    = 'Если начнёте упираться в объём ОЗУ (тяжёлые сборки, много вкладок + игра) - откатите.'
    }

    $tweaks += [pscustomobject]@{
        Id       = 'net-nagle'
        Name     = 'Отключение алгоритма Нейгла (сетевая задержка)'
        Category = 'Сеть'
        Risk     = 'Низкий'
        Presets  = @('max')
        Gain     = 'Минус 10-40 мс к отклику в шутерах и MOBA. На FPS не влияет - только на пинг.'
        Reboot   = $true
        Registry = @()
        Apply    = {
            param($Context)
            $base = 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces'
            $count = 0
            foreach ($iface in (Get-ChildItem -LiteralPath $base -ErrorAction SilentlyContinue)) {
                $p = $iface.PSPath
                $props = Get-ItemProperty -LiteralPath $p -ErrorAction SilentlyContinue
                $hasIp = ($props.DhcpIPAddress -and $props.DhcpIPAddress -ne '0.0.0.0') -or
                         ($props.IPAddress -and "$($props.IPAddress)" -notmatch '^0\.0\.0\.0')
                if (-not $hasIp) { continue }
                foreach ($name in @('TcpAckFrequency', 'TCPNoDelay')) {
                    Backup-RegValue -Context $Context -Path $p -Name $name
                    Set-RegValue -Path $p -Name $name -Type DWord -Value 1
                }
                $count++
            }
            if ($count -eq 0) {
                Write-Log 'Активных сетевых интерфейсов не найдено.' -Level Warn
                return $false
            }
            Write-Log "Настроено интерфейсов: $count" -Level Info
            return $true
        }
        Detect   = { return $false }
        Notes    = 'Применяется только к интерфейсам с активным IP-адресом.'
    }

    $tweaks += [pscustomobject]@{
        Id       = 'fso-off'
        Name     = 'Отключение оптимизаций полноэкранного режима (глобально)'
        Category = 'GPU'
        Risk     = 'Средний'
        Presets  = @()
        Gain     = 'Спорный твик. В части старых игр (DX9/DX11) убирает микрофризы, в новых с Reflex/HDR - наоборот вредит.'
        Reboot   = $false
        Registry = @(
            @{ Path = 'HKCU:\System\GameConfigStore'; Name = 'GameDVR_FSEBehaviorMode'; Type = 'DWord'; Value = 2 },
            @{ Path = 'HKCU:\System\GameConfigStore'; Name = 'GameDVR_HonorUserFSEBehaviorMode'; Type = 'DWord'; Value = 1 },
            @{ Path = 'HKCU:\System\GameConfigStore'; Name = 'GameDVR_DXGIHonorFSEWindowsCompatible'; Type = 'DWord'; Value = 1 },
            @{ Path = 'HKCU:\System\GameConfigStore'; Name = 'GameDVR_EFSEFeatureFlags'; Type = 'DWord'; Value = 0 }
        )
        Apply    = $null
        Detect   = $null
        Notes    = 'Включайте только под конкретную игру и обязательно замеряйте до/после.'
    }

    $tweaks += [pscustomobject]@{
        Id       = 'gpu-msi'
        Name     = 'Прерывания MSI для видеокарты'
        Category = 'GPU'
        Risk     = 'Средний'
        Presets  = @()
        Gain     = 'Меньше DPC-задержек. На RTX 4060 с современным драйвером обычно уже включено - утилита это проверит.'
        Reboot   = $true
        Registry = @()
        Apply    = {
            param($Context)
            $done = 0
            foreach ($gpu in (Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue)) {
                if (-not $gpu.PNPDeviceID) { continue }
                $path = "HKLM:\SYSTEM\CurrentControlSet\Enum\$($gpu.PNPDeviceID)\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties"
                if (-not (Test-Path -LiteralPath $path)) {
                    Write-Log "$($gpu.Name): ключ MSI отсутствует (устройство не поддерживает) - пропускаю." -Level Warn
                    continue
                }
                if (Test-RegValue -Path $path -Name 'MSISupported' -Value 1) {
                    Write-Log "$($gpu.Name): MSI уже включён." -Level Ok
                    continue
                }
                try {
                    Backup-RegValue -Context $Context -Path $path -Name 'MSISupported'
                    Set-RegValue -Path $path -Name 'MSISupported' -Type DWord -Value 1
                    Write-Log "$($gpu.Name): MSI включён." -Level Ok
                    $done++
                } catch {
                    Write-Log "$($gpu.Name): нет прав на изменение ключа Enum ($($_.Exception.Message))." -Level Warn
                }
            }
            return ($done -gt 0)
        }
        Detect   = { return $false }
        Notes    = 'При чёрном экране после перезагрузки - загрузиться в безопасном режиме и откатить.'
    }

    $tweaks += [pscustomobject]@{
        Id       = 'svc-sysmain'
        Name     = 'Перевод SysMain (Superfetch) в ручной запуск'
        Category = 'Службы'
        Risk     = 'Средний'
        Presets  = @()
        Gain     = 'На NVMe иногда убирает фоновые всплески чтения при запуске игры. На HDD - строго не отключать.'
        Reboot   = $false
        Registry = @()
        Apply    = {
            param($Context)
            if (-not (Backup-ServiceState -Context $Context -Name 'SysMain')) {
                Write-Log 'Служба SysMain не найдена.' -Level Warn
                return $false
            }
            Set-ServiceStartup -Name 'SysMain' -StartupType Manual -StopNow | Out-Null
            return $true
        }
        Detect   = {
            $s = Get-CimInstance -ClassName Win32_Service -Filter "Name='SysMain'" -ErrorAction SilentlyContinue
            return ($null -ne $s -and $s.StartMode -ne 'Auto')
        }
        Notes    = 'Microsoft рекомендует оставлять включённой. Меняйте, только если видите проблему в мониторинге.'
    }

    $tweaks += [pscustomobject]@{
        Id       = 'vbs-off'
        Name     = 'Отключение VBS / Целостности памяти (HVCI)'
        Category = 'Безопасность'
        Risk     = 'Высокий'
        Presets  = @()
        Gain     = 'Самый крупный прирост из всего списка: +5-15% FPS в CPU-зависимых играх (Escape from Tarkov, Cities, MMO, симуляторы).'
        Reboot   = $true
        Registry = @(
            @{ Path = 'HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard'; Name = 'EnableVirtualizationBasedSecurity'; Type = 'DWord'; Value = 0 },
            @{ Path = 'HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity'; Name = 'Enabled'; Type = 'DWord'; Value = 0 }
        )
        Apply    = $null
        Detect   = $null
        Notes    = 'ЭТО СНИЖАЕТ ЗАЩИЩЁННОСТЬ СИСТЕМЫ: отключается аппаратная защита ядра от вредоносных драйверов. ' +
                   'Требуется флаг -AllowSecurityTradeoffs. Часть античитов (Valorant/Vanguard, Faceit) может требовать VBS включённым. ' +
                   'На рабочем/корпоративном ПК не трогать.'
    }

    $tweaks += [pscustomobject]@{
        Id       = 'fast-startup-off'
        Name     = 'Отключение быстрого запуска Windows'
        Category = 'Windows'
        Risk     = 'Низкий'
        Presets  = @()
        Gain     = 'На FPS не влияет. Убирает накопление проблем драйверов: каждое выключение = настоящая перезагрузка.'
        Reboot   = $false
        Registry = @(
            @{ Path = 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power'; Name = 'HiberbootEnabled'; Type = 'DWord'; Value = 0 }
        )
        Apply    = $null
        Detect   = $null
        Notes    = 'ПК будет включаться на несколько секунд дольше.'
    }

    return $tweaks
}

function Get-TweaksForPreset {
    param(
        [Parameter(Mandatory)][ValidateSet('safe', 'gaming', 'max')][string]$Preset
    )
    return @(Get-TweakCatalog | Where-Object { $_.Presets -contains $Preset })
}

function Test-TweakApplied {
    param([Parameter(Mandatory)]$Tweak)
    if ($Tweak.Detect) {
        try { return [bool](& $Tweak.Detect) } catch { return $false }
    }
    if (@($Tweak.Registry).Count -eq 0) { return $false }
    foreach ($r in $Tweak.Registry) {
        if (-not (Test-RegValue -Path $r.Path -Name $r.Name -Value $r.Value)) { return $false }
    }
    return $true
}

function Invoke-Tweak {
    <# Применяет одну оптимизацию, записывая прежнее состояние в $Context. #>
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory)]$Tweak,
        [Parameter(Mandatory)]$Context
    )

    if (-not $PSCmdlet.ShouldProcess($Tweak.Name, 'применить')) { return $true }

    $ok = $true
    foreach ($r in $Tweak.Registry) {
        try {
            Backup-RegValue -Context $Context -Path $r.Path -Name $r.Name
            Set-RegValue -Path $r.Path -Name $r.Name -Type $r.Type -Value $r.Value
        } catch {
            $ok = $false
            Write-Log "  реестр $($r.Path)\$($r.Name): $($_.Exception.Message)" -Level Error
        }
    }

    if ($Tweak.Apply) {
        try {
            $result = & $Tweak.Apply $Context
            if ($result -eq $false) { $ok = $false }
        } catch {
            $ok = $false
            Write-Log "  $($Tweak.Id): $($_.Exception.Message)" -Level Error
        }
    }

    return $ok
}
