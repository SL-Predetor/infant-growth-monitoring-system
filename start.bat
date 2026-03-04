@echo off
title Infant Growth Monitoring System - Launcher
color 0A

echo ================================================================================
echo    INFANT GROWTH MONITORING SYSTEM - ONE-CLICK LAUNCHER
echo ================================================================================
echo.
echo Checking for existing processes on port 8000...
echo.

REM Get the directory where the batch file is located
cd /d "%~dp0"

REM Kill any existing processes on port 8000
netstat -ano | find ":8000" >nul
if %errorlevel% equ 0 (
    echo Cleaning up port 8000...
    for /f "tokens=5" %%a in ('netstat -ano ^| find ":8000"') do (
        taskkill /PID %%a /F 2>nul
    )
    timeout /t 2 /nobreak >nul
    echo Port 8000 cleaned up.
    echo.
)

echo Starting Backend and Frontend servers...
echo.

REM Start Backend Server (FastAPI)
echo [1/2] Starting Backend Server (FastAPI on port 8000)...
start "Backend Server" cmd /k "cd backEnd && .venv\Scripts\activate && python app.py"

REM Wait a few seconds for backend to initialize
timeout /t 4 /nobreak >nul

REM Start Frontend Server (Expo)
echo [2/2] Starting Frontend Server (Expo)...
start "Frontend Server" cmd /k "cd frontEnd && npm start"

echo.
echo ================================================================================
echo    SERVERS STARTED SUCCESSFULLY!
echo ================================================================================
echo.
echo Backend Server: http://localhost:8000
echo Frontend Server: Will open in new terminal (check Expo QR code)
echo.
echo IMPORTANT:
echo - Keep both terminal windows open
echo - Backend API: http://localhost:8000
echo - To stop servers: Close the terminal windows or press CTRL+C in each
echo.
echo This window can be closed safely.
echo ================================================================================
pause
