@echo off
title ST Distribuidora - Setup Completo
cd /d "%~dp0"
cls

echo ============================================
echo   ST DISTRIBUIDORA - INSTALACAO COMPLETA
echo ============================================
echo.
echo   Este script vai configurar tudo para rodar
echo   o servidor no computador.
echo.
echo ============================================
echo   PASSO 1: Instalar dependencias Node.js
echo ============================================
cd /d "%~dp0backend"
call npm install
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao instalar dependencias do Node.js
    pause
    exit /b 1
)
echo [OK] Dependencias instaladas
echo.

echo ============================================
echo   PASSO 2: Configurar banco de dados
echo ============================================
echo.
echo   O script DDL esta em: %~dp0database\ddl.sql
echo.
echo   Execute manualmente no pgAdmin ou psql:
echo     psql -U postgres -d st_distribuidora -f "%~dp0database\ddl.sql"
echo.
echo   Ou crie o banco via pgAdmin:
echo     1. Abra pgAdmin
echo     2. Crie database "st_distribuidora"
echo     3. Execute o arquivo ddl.sql
echo.

echo ============================================
echo   PASSO 3: Instalar servico Windows
echo ============================================
echo.
set /p INSTALL_SVC="Deseja instalar como servico Windows? (S/N): "
if /i "%INSTALL_SVC%"=="S" (
    echo Instalando servico...
    node "%~dp0install-service.js"
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar servico. Execute este script como Administrador.
    ) else (
        echo [OK] Servico instalado e iniciado!
    )
) else (
    echo [OK] Para iniciar manualmente, execute iniciar-servidor.bat
)
echo.

echo ============================================
echo   PRONTO!
echo ============================================
echo.
echo   Acessar pelo navegador:
echo     http://localhost:3000
echo     http://%COMPUTERNAME%:3000  (na rede)
echo.
echo   Backup: Configurar em Configuracao -^> Backup
echo.
pause
