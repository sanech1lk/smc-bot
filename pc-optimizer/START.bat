@echo off
rem ============================================================
rem  PC Optimizer - launcher (requests administrator rights)
rem  Menu text is ASCII on purpose: cmd.exe code pages mangle
rem  Cyrillic in .bat files. The tool itself is in Russian.
rem ============================================================
setlocal
cd /d "%~dp0"

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting administrator rights...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

:menu
cls
echo ================================================================
echo   PC OPTIMIZER   RTX 4060 / i5-14400F / 32 GB
echo ================================================================
echo.
echo   1 - GUI  (graphical window / graficheskoe okno)
echo   2 - Diagnostics only, changes nothing
echo   3 - Apply "gaming" preset
echo   4 - Apply "max" preset
echo   5 - Restore (undo last changes)
echo   6 - Clean temp files and shader cache
echo   7 - List all tweaks
echo   0 - Exit
echo.
set /p choice=Select:

if "%choice%"=="1" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Optimize-GUI.ps1" & goto menu
if "%choice%"=="2" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Optimize-PC.ps1" -Action report & pause & goto menu
if "%choice%"=="3" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Optimize-PC.ps1" -Action apply -Preset gaming & pause & goto menu
if "%choice%"=="4" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Optimize-PC.ps1" -Action apply -Preset max & pause & goto menu
if "%choice%"=="5" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Optimize-PC.ps1" -Action restore & pause & goto menu
if "%choice%"=="6" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Optimize-PC.ps1" -Action clean & pause & goto menu
if "%choice%"=="7" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Optimize-PC.ps1" -Action list & pause & goto menu
if "%choice%"=="0" exit /b

goto menu
