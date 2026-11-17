@echo off
rem ============================================================
rem  Marketplace Monitor: first-time install + start.
rem  Just double-click this file. Keep the black window open
rem  while you use the app.
rem ============================================================
cd /d "%~dp0"
title Marketplace Monitor

rem --- 1. Is Python installed? ---
python --version >nul 2>nul
if errorlevel 1 goto nopython

rem --- 2. Create the virtual environment on first start ---
if not exist "venv\Scripts\python.exe" (
  echo [1/2] First start: creating virtual environment...
  python -m venv venv
  if errorlevel 1 goto failed
)

rem --- 3. Install libraries if they are missing ---
venv\Scripts\python.exe -c "import fastapi, uvicorn, bs4, apscheduler, vinted" >nul 2>nul
if errorlevel 1 (
  echo [2/2] Installing libraries, please wait 1-3 minutes...
  venv\Scripts\python.exe -m pip install -r requirements.txt
  if errorlevel 1 goto failed
)

rem --- 4. Start the server (it opens the browser itself when ready) ---
echo.
echo Starting... The browser will open http://127.0.0.1:8000 when the server is ready.
echo Do NOT close this window while you use the app.
echo To stop the app: press Ctrl+C here or close this window.
echo.
set MM_OPEN_BROWSER=1
venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
echo.
echo The server has stopped. If there is an error above, send a screenshot of this window.
pause
exit /b

:nopython
echo.
echo Python is not installed or not added to PATH.
echo 1. Download Python 3.12: https://www.python.org/downloads/windows/
echo 2. In the installer tick "Add python.exe to PATH", then "Install Now".
echo 3. Run this file again.
echo.
pause
exit /b

:failed
echo.
echo Something went wrong - see the error above.
echo Send a screenshot of this window.
pause
exit /b
