@echo off
title De-Insure 1-Click System Launcher
echo ========================================================
echo   LAUNCHING DE-INSURE PARAMETRIC COLD-CHAIN PLATFORM
echo ========================================================
echo.

:: 1. Launch Python Oracle & AWS IoT Engine
echo [1/3] Starting Python Telemetry Oracle API (Port 5001)...
start "De-Insure Python Oracle API" cmd /k "python ml/oracle_aws.py"

:: 2. Launch Vite Web Dashboard
echo [2/3] Starting React Web Dashboard (Port 5173)...
cd dashboard
start "De-Insure Web Dashboard" cmd /k "npm run dev"
cd ..

:: 3. Wait for initialization and launch browser
echo [3/3] Waiting 3 seconds for servers to start...
timeout /t 3 /nobreak > nul
echo Opening http://localhost:5173 in default web browser...
start http://localhost:5173/

echo.
echo ========================================================
echo   DE-INSURE PLATFORM IS NOW OPERATIONAL!
echo   - Dashboard: http://localhost:5173/
echo   - Oracle API: http://127.0.0.1:5001/telemetry
echo ========================================================
echo.
pause
