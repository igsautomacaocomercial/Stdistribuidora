@echo off
title ST Distribuidora - Desinstalar Servico
cd /d "%~dp0backend"
echo ============================================
echo   REMOVER SERVICO WINDOWS
echo ============================================
echo.
echo   Isso vai parar e remover o servico.
echo   Execute como Administrador!
echo.
pause

node -e "
const { Service } = require('node-windows');
const svc = new Service({ name: 'ST Distribuidora - OS Server' });
svc.on('uninstall', () => { console.log('Servico removido!'); });
svc.uninstall();
"

echo.
echo PRESSIONE QUALQUER TECLA PARA SAIR
pause > nul
