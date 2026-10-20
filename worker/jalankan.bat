@echo off
cd /d "%~dp0"
where python >nul 2>nul || (echo Python belum terpasang. Unduh dari python.org lalu centang "Add to PATH". & pause & exit /b 1)
python -m pip install -q -r requirements.txt
python layerup_hotkey.py
pause
