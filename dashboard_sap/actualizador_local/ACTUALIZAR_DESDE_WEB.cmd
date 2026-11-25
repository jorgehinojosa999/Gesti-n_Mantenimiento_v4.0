@echo off
setlocal
REM EDITA ESTA RUTA para que apunte a tu VBS IW39 modificado que publica en GitHub.
set "IW39_VBS=C:\RUTA\A\IW39_OT_ACTUALIZADOR_GITHUB.vbs"
cd /d "%~dp0"
py servidor_iw39.py
pause
