@echo off
title Jarvis Launcher
cd /d "C:\Users\yuze2\Documents\New folder"

echo.
echo   === JARVIS LAUNCHER ===
echo   1. Local mode     (Piper on this PC - slow)
echo   2. Colab mode     (Piper on Google Colab via ngrok)
echo   3. Stop all       (kill node processes)
echo.
set /p choice="  Choose [1/2/3]: "

if "%choice%"=="1" goto local
if "%choice%"=="2" goto colab
if "%choice%"=="3" goto stop
goto end

:local
echo Starting LOCAL mode...
powershell -Command "(Get-Content .env) -replace '^PIPER_MODE=.*','PIPER_MODE=local' -replace '^COLAB_URL=.*','COLAB_URL=' | Set-Content .env"
start "Jarvis Chat (3000)" cmd /k "node jarvis-server.js"
timeout /t 2 /nobreak >nul
start "Piper TTS (5001)" cmd /k "node piper-server.js"
timeout /t 3 /nobreak >nul
start "" "http://localhost:3000"
goto end

:colab
echo.
set /p COLAB="  Paste your Colab ngrok URL (https://xxxx.ngrok.io): "
powershell -Command "(Get-Content .env) -replace '^PIPER_MODE=.*','PIPER_MODE=colab' -replace '^COLAB_URL=.*','COLAB_URL=%COLAB%' | Set-Content .env"
echo Starting COLAB mode (Piper runs remotely)...
start "Jarvis Chat (3000)" cmd /k "node jarvis-server.js"
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"
goto end

:stop
echo Killing node processes...
taskkill /F /IM node.exe 2>nul
echo Done.
goto end

:end
timeout /t 2 /nobreak >nul
exit