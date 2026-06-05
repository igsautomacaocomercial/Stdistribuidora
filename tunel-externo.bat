@echo off
title ST Distribuidora - Tunel Externo
cd /d "%~dp0"
cls

echo ============================================
echo   ST DISTRIBUIDORA - TUNEL EXTERNO
echo ============================================
echo.
echo   Cria um link publico temporario para
echo   acessar o sistema pela internet.
echo.
echo   Requer: Node.js instalado
echo.
echo ============================================

:: Verifica se localtunnel esta instalado
where lt >nul 2>nul
if %errorlevel% neq 0 (
    echo [INSTALANDO] localtunnel...
    call npm install -g localtunnel
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar localtunnel
        pause
        exit /b 1
    )
    echo [OK] localtunnel instalado
)

echo.
echo   Iniciando tunel para porta 3000...
echo.
echo   *** COMPARTILHE O LINK ABAIXO ***
echo.
lt --port 3000 --subdomain st-distribuidora 2>nul || lt --port 3000

echo.
echo   Tunel encerrado.
pause
