@echo off
title ST Distribuidora - Instalar Servico
cd /d "C:\Stdistribuidora\backend"
echo ============================================
echo   Instalar servico Windows
echo ============================================
echo.
echo Execute como Administrador para instalar
echo o servico de inicializacao automatica.
echo.
echo Instalando...
node C:\Stdistribuidora\install-service.js
echo.
echo PRESSIONE QUALQUER TECLA PARA SAIR
pause > nul
