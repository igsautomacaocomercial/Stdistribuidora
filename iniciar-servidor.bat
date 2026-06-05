@echo off
title ST Distribuidora - Servidor OS
cd /d "%~dp0backend"
echo ============================================
echo   ST DISTRIBUIDORA - Servidor de OS
echo ============================================
echo   Iniciando servidor...
echo   Acessar: http://localhost:3000
echo   Rede:    http://%COMPUTERNAME%:3000
echo.
node src/index.js
if %errorlevel% neq 0 (
    echo.
    echo   ERRO: Servidor nao iniciou.
    echo   Execute npm install primeiro.
    pause
)
