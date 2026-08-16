#Requires -Version 5.1
<#
    Optimize-GUI.ps1 - графическая оболочка PC Optimizer.

    То же, что и Optimize-PC.ps1, но с окном: галочками отмечаются нужные
    оптимизации, справа видно описание и честная оценка эффекта.
    Запуск: START.bat (запросит права администратора).
#>

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'lib\Common.ps1')
. (Join-Path $here 'lib\Tweaks.ps1')
. (Join-Path $here 'lib\Report.ps1')
. (Join-Path $here 'lib\Clean.ps1')

Assert-Windows
[void](Initialize-PCOptLog -Name 'gui')
Set-LogSink (New-Object System.Collections.ArrayList)

$script:catalog = @(Get-TweakCatalog)

# ------------------------------------------------------------------ окно

$form = New-Object System.Windows.Forms.Form
$form.Text = 'PC Optimizer - настройка Windows под максимальный FPS'
$form.Size = New-Object System.Drawing.Size(1000, 720)
$form.StartPosition = 'CenterScreen'
$form.BackColor = [System.Drawing.Color]::FromArgb(24, 26, 31)
$form.ForeColor = [System.Drawing.Color]::Gainsboro
$form.Font = New-Object System.Drawing.Font('Segoe UI', 9)

$header = New-Object System.Windows.Forms.Label
$header.Location = New-Object System.Drawing.Point(16, 12)
$header.Size = New-Object System.Drawing.Size(960, 44)
$header.ForeColor = [System.Drawing.Color]::FromArgb(120, 200, 255)
$header.Text = 'Определяю конфигурацию...'
$form.Controls.Add($header)

# --- профили
$presetBox = New-Object System.Windows.Forms.GroupBox
$presetBox.Text = 'Профиль'
$presetBox.Location = New-Object System.Drawing.Point(16, 60)
$presetBox.Size = New-Object System.Drawing.Size(480, 56)
$presetBox.ForeColor = [System.Drawing.Color]::Gainsboro
$form.Controls.Add($presetBox)

$radios = @{}
$x = 14
foreach ($p in @(
        @{ Key = 'safe';   Text = 'Безопасный' },
        @{ Key = 'gaming'; Text = 'Игровой (рекомендуется)' },
        @{ Key = 'max';    Text = 'Максимум' })) {
    $rb = New-Object System.Windows.Forms.RadioButton
    $rb.Text = $p.Text
    $rb.Location = New-Object System.Drawing.Point($x, 22)
    $rb.AutoSize = $true
    $rb.Tag = $p.Key
    $presetBox.Controls.Add($rb)
    $radios[$p.Key] = $rb
    $x += $rb.PreferredSize.Width + 18
}
$radios['gaming'].Checked = $true

# --- список оптимизаций
$listLabel = New-Object System.Windows.Forms.Label
$listLabel.Text = 'Оптимизации (галочка = будет применена):'
$listLabel.Location = New-Object System.Drawing.Point(16, 124)
$listLabel.AutoSize = $true
$form.Controls.Add($listLabel)

$list = New-Object System.Windows.Forms.CheckedListBox
$list.Location = New-Object System.Drawing.Point(16, 146)
$list.Size = New-Object System.Drawing.Size(480, 300)
$list.BackColor = [System.Drawing.Color]::FromArgb(32, 35, 42)
$list.ForeColor = [System.Drawing.Color]::Gainsboro
$list.CheckOnClick = $true
$list.BorderStyle = 'FixedSingle'
$form.Controls.Add($list)

# --- описание
$descLabel = New-Object System.Windows.Forms.Label
$descLabel.Text = 'Описание:'
$descLabel.Location = New-Object System.Drawing.Point(512, 124)
$descLabel.AutoSize = $true
$form.Controls.Add($descLabel)

$desc = New-Object System.Windows.Forms.TextBox
$desc.Location = New-Object System.Drawing.Point(512, 146)
$desc.Size = New-Object System.Drawing.Size(456, 300)
$desc.Multiline = $true
$desc.ReadOnly = $true
$desc.ScrollBars = 'Vertical'
$desc.BackColor = [System.Drawing.Color]::FromArgb(32, 35, 42)
$desc.ForeColor = [System.Drawing.Color]::Gainsboro
$desc.BorderStyle = 'FixedSingle'
$form.Controls.Add($desc)

# --- лог
$log = New-Object System.Windows.Forms.TextBox
$log.Location = New-Object System.Drawing.Point(16, 500)
$log.Size = New-Object System.Drawing.Size(952, 138)
$log.Multiline = $true
$log.ReadOnly = $true
$log.ScrollBars = 'Vertical'
$log.BackColor = [System.Drawing.Color]::FromArgb(18, 20, 24)
$log.ForeColor = [System.Drawing.Color]::FromArgb(150, 220, 150)
$log.Font = New-Object System.Drawing.Font('Consolas', 9)
$log.BorderStyle = 'FixedSingle'
$form.Controls.Add($log)

$restoreCheck = New-Object System.Windows.Forms.CheckBox
$restoreCheck.Text = 'Создать точку восстановления Windows перед изменениями'
$restoreCheck.Location = New-Object System.Drawing.Point(16, 460)
$restoreCheck.AutoSize = $true
$restoreCheck.Checked = $true
$form.Controls.Add($restoreCheck)

# ------------------------------------------------------------------ функции окна

function Write-GuiLog {
    param([string]$Text)
    $log.AppendText($Text + [Environment]::NewLine)
    [System.Windows.Forms.Application]::DoEvents()
}

function Sync-Log {
    foreach ($line in (Read-LogSink)) { Write-GuiLog $line }
}

function Update-List {
    param([string]$Preset)
    $list.Items.Clear()
    foreach ($t in $script:catalog) {
        $applied = Test-TweakApplied -Tweak $t
        $mark = if ($applied) { '[применено] ' } else { '' }
        $manual = if (@($t.Presets).Count -eq 0) { ' (только вручную)' } else { '' }
        [void]$list.Items.Add("$mark$($t.Name)$manual")
        $index = $list.Items.Count - 1
        $list.SetItemChecked($index, (($t.Presets -contains $Preset) -and -not $applied))
    }
}

function Show-Description {
    param([int]$Index)
    if ($Index -lt 0 -or $Index -ge $script:catalog.Count) { return }
    $t = $script:catalog[$Index]
    $presets = if (@($t.Presets).Count -eq 0) { 'только ручной выбор' } else { ($t.Presets -join ', ') }
    $lines = @(
        $t.Name,
        ('-' * 60),
        "Идентификатор : $($t.Id)",
        "Категория     : $($t.Category)",
        "Профили       : $presets",
        "Риск          : $($t.Risk)",
        "Перезагрузка  : $(if ($t.Reboot) { 'требуется' } else { 'не требуется' })",
        "Состояние     : $(if (Test-TweakApplied -Tweak $t) { 'уже применено' } else { 'не применено' })",
        '',
        'Что даёт:',
        $t.Gain
    )
    if ($t.Notes) { $lines += @('', 'Важно:', $t.Notes) }
    $desc.Text = ($lines -join [Environment]::NewLine)
}

function Test-AdminOrWarn {
    if (Test-Admin) { return $true }
    [System.Windows.Forms.MessageBox]::Show(
        'Нужны права администратора. Закройте окно и запустите START.bat (он запросит повышение прав).',
        'PC Optimizer', 'OK', 'Warning') | Out-Null
    return $false
}

# ------------------------------------------------------------------ кнопки

function New-Button {
    param([string]$Text, [int]$X, [int]$Y, [int]$W = 150, $Accent = $false)
    $b = New-Object System.Windows.Forms.Button
    $b.Text = $Text
    $b.Location = New-Object System.Drawing.Point($X, $Y)
    $b.Size = New-Object System.Drawing.Size($W, 34)
    $b.FlatStyle = 'Flat'
    $b.ForeColor = [System.Drawing.Color]::White
    $b.BackColor = if ($Accent) {
        [System.Drawing.Color]::FromArgb(0, 120, 200)
    } else {
        [System.Drawing.Color]::FromArgb(52, 56, 66)
    }
    $form.Controls.Add($b)
    return $b
}

$btnReport  = New-Button -Text 'Диагностика'    -X 512 -Y 60  -W 150
$btnApply   = New-Button -Text 'Применить'      -X 672 -Y 60  -W 140 -Accent $true
$btnRestore = New-Button -Text 'Откатить всё'   -X 818 -Y 60  -W 150
$btnClean   = New-Button -Text 'Очистка мусора' -X 818 -Y 456 -W 150

$list.Add_SelectedIndexChanged({ Show-Description -Index $list.SelectedIndex })

foreach ($key in @('safe', 'gaming', 'max')) {
    $radios[$key].Add_CheckedChanged({
        if ($this.Checked) { Update-List -Preset ([string]$this.Tag) }
    })
}

$btnReport.Add_Click({
    $log.Clear()
    Write-GuiLog 'Диагностика...'
    $facts = Get-PCFacts
    Write-GuiLog "CPU: $($facts.CpuName)"
    foreach ($g in @($facts.Gpus)) {
        Write-GuiLog "GPU: $($g.Name), драйвер $($g.DriverVersion)"
        Write-GuiLog "Экран: $($g.Resolution) @ $($g.RefreshNow) Гц (максимум $($g.RefreshMax) Гц)"
    }
    Write-GuiLog "ОЗУ: $($facts.RamTotalGB) ГБ, планок $(@($facts.Memory).Count)"
    foreach ($m in @($facts.Memory)) {
        Write-GuiLog "  $($m.Bank): $($m.SizeGB) ГБ $($m.Type), факт $($m.ActualMHz) МГц из $($m.RatedMHz) МГц"
    }
    Write-GuiLog ''
    $findings = Get-PCFindings -Facts $facts
    if (@($findings).Count -eq 0) {
        Write-GuiLog 'Проблем не найдено - система настроена.'
    } else {
        Write-GuiLog 'Что мешает FPS:'
        foreach ($f in $findings) {
            Write-GuiLog "  [$($f.Severity)] $($f.Title)"
            Write-GuiLog "      $($f.Detail)"
        }
    }
    Sync-Log
})

$btnApply.Add_Click({
    if (-not (Test-AdminOrWarn)) { return }

    $selected = @()
    for ($i = 0; $i -lt $script:catalog.Count; $i++) {
        if ($list.GetItemChecked($i)) { $selected += $script:catalog[$i] }
    }
    if ($selected.Count -eq 0) {
        [System.Windows.Forms.MessageBox]::Show('Не отмечено ни одной оптимизации.', 'PC Optimizer', 'OK', 'Information') | Out-Null
        return
    }

    $risky = @($selected | Where-Object { $_.Risk -eq 'Высокий' })
    if ($risky.Count -gt 0) {
        $names = ($risky | ForEach-Object { $_.Name }) -join [Environment]::NewLine
        $answer = [System.Windows.Forms.MessageBox]::Show(
            "Отмечены изменения, снижающие защищённость системы:$([Environment]::NewLine)$names$([Environment]::NewLine)$([Environment]::NewLine)$(($risky | ForEach-Object { $_.Notes }) -join [Environment]::NewLine)$([Environment]::NewLine)$([Environment]::NewLine)Применять?",
            'Внимание', 'YesNo', 'Warning')
        if ($answer -ne 'Yes') { return }
    }

    $confirm = [System.Windows.Forms.MessageBox]::Show(
        "Будет применено оптимизаций: $($selected.Count).$([Environment]::NewLine)Прежние значения сохранятся в бэкап - откат доступен кнопкой «Откатить всё».$([Environment]::NewLine)$([Environment]::NewLine)Продолжить?",
        'PC Optimizer', 'YesNo', 'Question')
    if ($confirm -ne 'Yes') { return }

    $log.Clear()
    $btnApply.Enabled = $false

    try {
        if ($restoreCheck.Checked) {
            Write-GuiLog 'Создаю точку восстановления Windows (до минуты)...'
            New-RestorePointSafe -Description 'PC Optimizer' | Out-Null
            Sync-Log
        }

        $context = New-BackupContext -Preset 'gui'
        $ok = 0
        $fail = 0
        $reboot = $false

        foreach ($t in $selected) {
            Write-GuiLog "-> $($t.Name)"
            $result = Invoke-Tweak -Tweak $t -Context $context
            Sync-Log
            if ($result) {
                $ok++
                if ($t.Reboot) { $reboot = $true }
            } else {
                $fail++
            }
        }

        $backup = Save-BackupContext -Context $context
        Write-GuiLog ''
        Write-GuiLog "Готово. Применено: $ok, пропущено/с ошибками: $fail"
        if ($backup) { Write-GuiLog "Бэкап: $backup" }

        $msg = "Применено: $ok из $($selected.Count)."
        if ($reboot) { $msg += "$([Environment]::NewLine)$([Environment]::NewLine)Часть изменений заработает после перезагрузки." }
        [System.Windows.Forms.MessageBox]::Show($msg, 'PC Optimizer', 'OK', 'Information') | Out-Null

        $current = ($radios.Keys | Where-Object { $radios[$_].Checked } | Select-Object -First 1)
        Update-List -Preset ([string]$current)
    } finally {
        $btnApply.Enabled = $true
    }
})

$btnRestore.Add_Click({
    if (-not (Test-AdminOrWarn)) { return }
    $backups = Get-BackupFiles
    if (@($backups).Count -eq 0) {
        [System.Windows.Forms.MessageBox]::Show('Бэкапов не найдено - откатывать нечего.', 'PC Optimizer', 'OK', 'Information') | Out-Null
        return
    }
    $answer = [System.Windows.Forms.MessageBox]::Show(
        "Откатить изменения из последнего бэкапа?$([Environment]::NewLine)$($backups[0].Name) от $($backups[0].LastWriteTime)",
        'PC Optimizer', 'YesNo', 'Question')
    if ($answer -ne 'Yes') { return }

    $log.Clear()
    Write-GuiLog 'Откат...'
    Restore-FromBackupFile -Path $backups[0].FullName | Out-Null
    Sync-Log
    Write-GuiLog 'Готово. Перезагрузите ПК для полного применения отката.'
    $current = ($radios.Keys | Where-Object { $radios[$_].Checked } | Select-Object -First 1)
    Update-List -Preset ([string]$current)
})

$btnClean.Add_Click({
    $answer = [System.Windows.Forms.MessageBox]::Show(
        'Будут удалены временные файлы, кэш шейдеров DirectX/NVIDIA и дампы сбоев. Личные файлы не затрагиваются. Продолжить?',
        'PC Optimizer', 'YesNo', 'Question')
    if ($answer -ne 'Yes') { return }
    $log.Clear()
    Write-GuiLog 'Очистка...'
    Invoke-PCClean -Confirm:$false
    Sync-Log
})

# ------------------------------------------------------------------ старт

$form.Add_Shown({
    $form.Activate()
    try {
        $facts = Get-PCFacts
        $gpu = if (@($facts.Gpus).Count -gt 0) { $facts.Gpus[0].Name } else { 'GPU не определён' }
        $header.Text = "$($facts.CpuName)$([Environment]::NewLine)$gpu  |  ОЗУ $($facts.RamTotalGB) ГБ  |  $($facts.OsName)"
    } catch {
        $header.Text = 'Не удалось определить конфигурацию.'
    }
    Update-List -Preset 'gaming'
    if ($list.Items.Count -gt 0) { $list.SelectedIndex = 0 }
    Write-GuiLog 'Отметьте нужные пункты и нажмите «Применить». Все изменения обратимы кнопкой «Откатить всё».'
    if (-not (Test-Admin)) {
        Write-GuiLog 'ВНИМАНИЕ: программа запущена без прав администратора - применение изменений будет недоступно.'
    }
})

[void]$form.ShowDialog()
