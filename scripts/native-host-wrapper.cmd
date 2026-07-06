@echo off
setlocal
set SCRIPT_DIR=%~dp0
set REPO_ROOT=%SCRIPT_DIR%..
cd /d "%REPO_ROOT%"
node native-host\src\host.mjs
