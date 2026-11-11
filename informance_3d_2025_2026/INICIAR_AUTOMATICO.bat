@echo off
cd /d "%~dp0"
start "Informance - Sincronizador" cmd /k py -u SINCRONIZADOR_AUTOMATICO.py
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:8765/informance_3d_2025_2026/"
