#!/bin/bash
# =============================================
# COC 人物卡向导 - macOS 启动脚本
# =============================================
# 部署说明：
#   1) 首次使用前确保已执行 npm install && npm run build
#      在终端执行: cd frontend && npm install && npm run build
#   2) 之后每次使用双击此文件即可
#   3) 浏览器会自动打开 http://localhost:3000
#   4) 服务会在后台持续运行，关掉终端窗口不影响
# =============================================

cd "$(dirname "$0")"

# 检查前端是否已构建
if [ ! -d "frontend/dist" ]; then
  echo "==========================================="
  echo "  前端尚未构建，正在执行构建..."
  echo "==========================================="
  cd frontend
  npm install
  npm run build
  cd ..
fi

# 启动服务（后台运行）
NODE_BIN="/Users/cc/.workbuddy/binaries/node/versions/22.12.0/bin/node"
"$NODE_BIN" frontend/server.js &
SERVER_PID=$!

# 等待服务就绪
sleep 1

# 打开浏览器
open http://localhost:3000

echo ""
echo "  服务已启动 (PID: $SERVER_PID)"
echo "  浏览器已打开 http://localhost:3000"
echo "  如需停止服务，在终端执行: kill $SERVER_PID"
echo ""

# 保持窗口打开（使用 read 防止终端自动关闭）
echo "按 Enter 键关闭此窗口（服务将继续在后台运行）..."
read
