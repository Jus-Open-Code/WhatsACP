@echo off
title WhatsACP Backend (WhatsApp Engine)
color 0A
echo =======================================================
echo          WhatsACP - WhatsApp Group Sync Engine
echo =======================================================
echo.
echo Starting Node.js Server... Please wait for the QR Code...
echo.
del /F /Q "%~dp0.wwebjs_auth\session\SingletonLock" 2>nul
node server.js
pause
