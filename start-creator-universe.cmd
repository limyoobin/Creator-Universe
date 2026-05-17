@echo off
setlocal

set "ROOT=%~dp0"
set "NODE_HOME=D:\project\tools\node"
set "PATH=%NODE_HOME%;%PATH%"

echo Starting Creator Universe demo backend...
start "Creator Universe Demo API" /D "%ROOT%" "%NODE_HOME%\node.exe" scripts\demo-api.mjs

echo Starting Creator Universe frontend...
start "Creator Universe Web" /D "%ROOT%frontend" "%NODE_HOME%\npm.cmd" run dev

echo.
echo Creator Universe is starting.
echo Frontend: http://127.0.0.1:5173
echo Backend:  http://127.0.0.1:4000/health
echo.
echo Demo creator account: yurino_script / demo1234
echo Demo reader account:  reader_one / demo1234
echo Admin/root account is disabled unless ROOT_ADMIN_PASSWORD is set in your local .env.
echo.
pause
