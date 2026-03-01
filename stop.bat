@echo off
title Infant Growth Monitoring System - Cleanup
color 0C

echo ================================================================================
echo    STOPPING SERVERS & CLEANUP
echo ================================================================================
echo.

REM Kill processes on port 8000
echo Stopping Backend Server (Port 8000)...
netstat -ano | find ":8000" >nul
if %errorlevel% equ 0 (
    for /f "tokens=5" %%a in ('netstat -ano ^| find ":8000"') do (
        taskkill /PID %%a /F 2>nul
    )
    echo Backend Server stopped.
) else (
    echo No process found on port 8000.
)

echo.

REM Kill processes on port 19000-19006 (Expo ports)
echo Stopping Frontend Server (Expo ports)...
for /L %%i in (19000,1,19006) do (
    netstat -ano | find ":%%i" >nul
    if !errorlevel! equ 0 (
        for /f "tokens=5" %%a in ('netstat -ano ^| find ":%%i"') do (
            taskkill /PID %%a /F 2>nul
        )
    )
)
echo Frontend Server stopped.

echo.
echo ================================================================================
echo    CLEANUP COMPLETE
echo ================================================================================
echo All servers have been stopped successfully.
timeout /t 2 /nobreak >nul
exit
