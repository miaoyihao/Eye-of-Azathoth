#!/bin/bash
# =============================================
# COC 人物卡向导 - macOS 启动脚本
# =============================================
# 部署说明：
#   1) 首次使用前确保已执行 npm install && npm run build
#      在终端执行: cd frontend && npm install && npm run build
#   2) 之后每次使用双击此文件即可
#   3) 浏览器会自动打开 http://localhost:3000
#   4) 所有服务在后台持续运行，关掉终端窗口不影响
# =============================================

cd "$(dirname "$0")"

echo "==========================================="
echo "  COC 人物卡向导 - 正在启动..."
echo "==========================================="

# 检查前端是否已构建
if [ ! -d "frontend/dist" ]; then
  echo ""
  echo "  前端尚未构建，正在执行构建..."
  echo "==========================================="
  cd frontend
  npm install
  npm run build
  cd ..
fi

# 启动 Python 后端（Excel 导出服务）
echo ""
echo "  启动 Excel 导出后端..."
echo "==========================================="
cd backend
python3 -m uvicorn main:app --host 127.0.0.1 --port 8080 > /tmp/coc_backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 启动前端服务（后台运行）
echo ""
echo "  启动前端服务..."
echo "==========================================="
NODE_BIN="/Users/cc/.workbuddy/binaries/node/versions/22.12.0/bin/node"
"$NODE_BIN" frontend/server.js &
FRONTEND_PID=$!

# 等待服务就绪
sleep 2

# 打开浏览器
open http://localhost:3000

echo ""
echo "==========================================="
echo "  ✅ 所有服务已启动！"
echo "==========================================="
echo "  前端地址:  http://localhost:3000"
echo "  API 地址:  http://localhost:8080"
echo ""
echo "  前端 PID:  $FRONTEND_PID"
echo "  后端 PID:  $BACKEND_PID"
echo ""
echo "  如需停止服务:"
echo "    kill $FRONTEND_PID $BACKEND_PID"
echo "==========================================="
echo ""

# 保持窗口打开
echo "按 Enter 键关闭此窗口（服务将继续在后台运行）..."
read
