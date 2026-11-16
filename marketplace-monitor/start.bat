@echo off
rem Start Marketplace Monitor (double-click this file)
cd /d "%~dp0"
call venv\Scripts\activate.bat
python -m uvicorn main:app --host 127.0.0.1 --port 8000
pause
