@echo off
rem Double-click to preview the site at http://localhost:8080 (close this window to stop)
cd /d "%~dp0"
start "" http://localhost:8080
py -m http.server 8080 2>nul || python -m http.server 8080
