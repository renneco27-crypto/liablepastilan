@echo off
setlocal enabledelayedexpansion
title Jarvis Setup

:: ═══════════════════════════════════════════
::   JARVIS AUTO-INSTALLER
::   Installs: Git, Node.js, Python
::   Then optionally launches Jarvis
:: ═══════════════════════════════════════════

net session >nul 2>&1
if errorlevel 1 (
  echo.
  echo  This script needs Administrator privileges.
  echo  Right-click setup.bat and choose "Run as administrator".
  echo.
  pause
  exit /b 1
)

cd /d "%~dp0"

echo.
echo  ============================================
echo    JARVIS SETUP
echo  ============================================
echo.

where winget >nul 2>nul
if errorlevel 1 (
  echo  ERROR: winget not found.
  echo  Install "App Installer" from Microsoft Store, then re-run.
  pause
  exit /b 1
)

:: ─── 1. Git ───
echo  [1/4] Checking Git...
where git >nul 2>nul
if errorlevel 1 (
  echo        Installing Git...
  winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
) else (
  for /f "delims=" %%v in ('git --version') do echo        Found: %%v
)

:: ─── 2. Node.js ───
echo.
echo  [2/4] Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
  echo        Installing Node.js LTS...
  winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements
  echo.
  echo  ============================================================
  echo    Node.js installed. Close this window and re-run setup.bat
  echo    so npm appears on your PATH.
  echo  ============================================================
  pause
  exit /b 0
) else (
  for /f "delims=" %%v in ('node --version') do echo        Node.js: %%v
)

:: ─── 3. Python ───
echo.
echo  [3/4] Checking Python...
where python >nul 2>nul
if errorlevel 1 (
  echo        Installing Python 3.12...
  winget install --id Python.Python.3.12 -e --source winget --accept-package-agreements --accept-source-agreements
) else (
  for /f "delims=" %%v in ('python --version') do echo        Found: %%v
)

:: ─── 4. Project dependencies ───
echo.
echo  [4/4] Installing project dependencies...

if exist node_modules (
  echo        node_modules already exists - skipping.
) else (
  if exist package.json (
    echo        Running: npm install
    call npm install
  ) else (
    echo        No package.json - creating defaults...
    call npm init -y
    call npm install dotenv node-fetch
  )
  if errorlevel 1 (
    echo  ERROR: npm install failed.
    pause
    exit /b 1
  )
  echo        Done.
)

:: ─── .env ───
if not exist .env (
  (
    echo NVIDIA_API_KEY=nvapi-your-key-here
    echo COLAB_URL=
    echo JARVIS_SECRET=change-me-to-a-long-random-string
    echo PIPER_MODE=local
  ) > .env
  echo        Created .env - edit it: notepad .env
) else (
  echo        .env already exists.
)

:: ─── Piper check ───
echo.
if exist "C:\piper\piper.exe" (
  echo  Piper found at C:\piper\piper.exe
) else (
  echo  NOTE: Piper not installed. Colab mode still works.
)

:: ─── Done ───
echo.
echo  ============================================
echo    SETUP COMPLETE
echo  ============================================
echo.
echo  Next: notepad .env   (add NVIDIA_API_KEY)
echo.
echo  ============================================
set /p RUN_NOW="Start Jarvis now? [Y/N]: "
if /i "%RUN_NOW%"=="Y" (
  echo.
  echo  Starting Jarvis server...
  start "Jarvis Server" cmd /k "node jarvis-server.js"
  timeout /t 3 /nobreak >nul
  start "" "http://localhost:3000"
  echo  Jarvis is running. Close the "Jarvis Server" window to stop.
) else (
  echo.
  echo  Run it later with: node jarvis-server.js
)

echo.
pause
endlocal