@echo off
chcp 65001 >nul
REM =============================================
REM COC 人物卡向导 - Windows 启动脚本
REM =============================================
REM 部署说明：
REM   1) 首次使用前确保已执行 npm install && npm run build
REM      在终端执行: cd frontend && npm install && npm run build
REM   2) 之后每次使用双击此文件即可
REM   3) 浏览器会自动打开 http://localhost:3000
REM   4) 所有服务在后台持续运行，关闭此窗口不影响
REM =============================================

cd /d "%~dp0"

echo ===========================================
echo   COC 人物卡向导 - 正在启动...
echo ===========================================

REM 检查前端是否已构建
if not exist "frontend\dist" (
  echo.
  echo   前端尚未构建，正在执行构建...
  echo ===========================================
  cd frontend
  call npm install
  call npm run build
  cd ..
)

REM 启动 Python 后端（Excel 导出服务）
echo.
echo   启动 Excel 导出后端...
echo ===========================================
start /B "" python backend\main.py

REM 启动前端服务
echo.
echo   启动前端服务...
echo ===========================================

start "" "http://localhost:3000"
node frontend/server.js

echo.
echo  服务已停止。
echo.
pause
