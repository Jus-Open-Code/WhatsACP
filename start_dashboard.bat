@echo off
title WhatsACP Dashboard (Frontend Server)
color 0B
echo =======================================================
echo          WhatsACP - Starting Kanban Dashboard
echo =======================================================
echo.
echo Starting Next.js Local Server...
echo Please wait a few seconds, then open: http://localhost:3000
echo.
cd /d "%~dp0dashboard"
set PATH=%PATH%;C:\Program Files\nodejs
npm run dev
pause
