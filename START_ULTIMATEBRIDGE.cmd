@echo off
setlocal
cd /d "%~dp0"
pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Start-UltimateBridge.ps1"
if errorlevel 1 (
  echo.
  echo UltimateBridge launcher check failed. Run: npm run diagnose:local
  exit /b 1
)
echo.
echo UltimateBridge launcher check OK.
echo Next: npm run diagnose:local
endlocal
