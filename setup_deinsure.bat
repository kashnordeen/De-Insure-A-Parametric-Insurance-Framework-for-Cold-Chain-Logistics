@echo off
title De-Insure System Readiness & Setup Launcher
color 0A
echo ========================================================
echo   DE-INSURE PORTABLE SYSTEM READINESS & SETUP LAUNCHER
echo ========================================================
echo.

:: 1. Try 'python' command
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Detected Python command in PATH.
    set "PY_CMD=python"
    goto RUN_CHECKER
)

:: 2. Try 'py' launcher
py --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Detected Python Launcher (py) in PATH.
    set "PY_CMD=py"
    goto RUN_CHECKER
)

:: 3. Try standard installation folders on Windows
for /d %%D in ("%LocalAppData%\Programs\Python\Python*") do (
    if exist "%%D\python.exe" (
        echo [INFO] Found Python at %%D\python.exe
        set "PY_CMD=%%D\python.exe"
        goto RUN_CHECKER
    )
)

for /d %%D in ("C:\Python*") do (
    if exist "%%D\python.exe" (
        echo [INFO] Found Python at %%D\python.exe
        set "PY_CMD=%%D\python.exe"
        goto RUN_CHECKER
    )
)

for /d %%D in ("C:\Program Files\Python*") do (
    if exist "%%D\python.exe" (
        echo [INFO] Found Python at %%D\python.exe
        set "PY_CMD=%%D\python.exe"
        goto RUN_CHECKER
    )
)

:: If Python is not found anywhere
echo [ERROR] Python 3 is NOT installed on this PC or not found!
echo.
echo To run De-Insure, please install:
echo  1. Python 3 (https://www.python.org/downloads/) - check "Add Python to PATH"
echo  2. Node.js (https://nodejs.org/)
echo.
set /p CHOICE="Would you like to open the Python download page in your browser? (Y/N): "
if /i "%CHOICE%"=="Y" (
    start https://www.python.org/downloads/
    start https://nodejs.org/
)
echo.
pause
exit /b 1

:RUN_CHECKER
echo Starting De-Insure Interactive Setup Checker...
%PY_CMD% setup_checker.py

if %errorlevel% neq 0 (
    echo.
    echo [NOTICE] Setup checker finished.
)
pause
