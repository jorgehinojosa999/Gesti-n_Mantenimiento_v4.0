@echo off
setlocal
set "HISTORICO=%USERPROFILE%\OneDrive - Embotelladora la Mariposa,S.A\04. ORDENES\HISTORICO"
set "REPO=%USERPROFILE%\OneDrive - Embotelladora la Mariposa,S.A\Documents\PORTAL_MANTENIMIENTO_UNIFICADO\github\Gesti-n_Mantenimiento_v4.0"
REM Si tu OneDrive usa otra ruta, edita HISTORICO y REPO arriba.
cd /d "%~dp0"
py actualizar_dashboard_sap.py --historico "%HISTORICO%" --repo "%REPO%" --sin-publicar --exigir-mes 2026-11
if errorlevel 1 (echo ERROR: revisa las rutas, OneDrive, permisos y el registro anterior.) else (echo Actualizacion completada; comprueba la salida.)
pause
