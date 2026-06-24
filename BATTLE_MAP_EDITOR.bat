@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'node\s+tools[/\\]poi-editor-server\.mjs\s+--battle-map' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
npm run battle-map:editor
pause
