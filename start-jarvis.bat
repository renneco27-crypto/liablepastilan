@echo off
title Jarvis Launcher
cd /d "C:\Users\yuze2\Documents\New folder"

echo Starting Jarvis servers...

start "Jarvis Chat (3000)" cmd /k "cd /d ""C:\Users\yuze2\Documents\New folder"" && node jarvis-server.js"
timeout /t 2 /nobreak >nul

start "Piper TTS (5001)" cmd /k "cd /d ""C:\Users\yuze2\Documents\New folder"" && node piper-server.js"
timeout /t 3 /nobreak >nul

start "" "http://localhost:3000"

echo.
echo Both servers running. Close the two black windows to stop Jarvis.
timeout /t 3 /nobreak >nul
exit