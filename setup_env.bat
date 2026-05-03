@echo off
REM ============================================================
REM  IGMS Conda Environment Setup
REM  Creates a Python 3.11 env at D:\conda_envs\IGMS
REM  and installs backEnd\requirements.txt
REM ============================================================

setlocal

set ENV_PATH=D:\conda_envs\IGMS
set REQ_FILE=%~dp0backEnd\requirements.txt

echo.
echo [1/4] Checking conda...
where conda >nul 2>nul
if errorlevel 1 (
    echo ERROR: conda not found on PATH. Open "Anaconda Prompt" or add conda to PATH.
    exit /b 1
)

echo.
echo [2/4] Creating conda env at %ENV_PATH% (Python 3.11)...
if exist "%ENV_PATH%" (
    echo Env folder already exists at %ENV_PATH% - skipping create.
) else (
    call conda create -y -p "%ENV_PATH%" python=3.11
    if errorlevel 1 (
        echo ERROR: conda create failed.
        exit /b 1
    )
)

echo.
echo [3/4] Upgrading pip...
call conda run -p "%ENV_PATH%" python -m pip install --upgrade pip setuptools wheel
if errorlevel 1 (
    echo ERROR: pip upgrade failed.
    exit /b 1
)

echo.
echo [4/4] Installing requirements from %REQ_FILE% ...
if not exist "%REQ_FILE%" (
    echo ERROR: requirements file not found: %REQ_FILE%
    exit /b 1
)
call conda run -p "%ENV_PATH%" pip install --timeout 600 --retries 10 -r "%REQ_FILE%"
if errorlevel 1 (
    echo ERROR: pip install -r requirements.txt failed.
    exit /b 1
)

echo.
echo ============================================================
echo  DONE. Activate with:
echo     conda activate %ENV_PATH%
echo.
echo  Run the backend:
echo     cd backEnd
echo     python -m uvicorn app:app --host 0.0.0.0 --port 8000
echo ============================================================

endlocal
