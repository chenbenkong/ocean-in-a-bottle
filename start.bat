@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 瓶中沧海 - 本地服务启动中...
start "" "http://localhost:8643/index.html?day=0.24"
python serve.py 8643
pause
