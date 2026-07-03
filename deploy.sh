#!/bin/bash
# =============================================
# COC 人物卡向导 - 一键部署脚本
# =============================================
# 用法：
#   首次部署:  bash deploy.sh
#   后续使用:  双击 start.command (macOS) / start.bat (Windows)
# =============================================
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Node.js 路径（系统未全局安装时使用）
export PATH="/Users/cc/.workbuddy/binaries/node/versions/22.12.0/bin:$PATH"

cd "$PROJECT_DIR/frontend"

echo "📦 安装依赖..."
npm install

echo "🔧 构建项目..."
npm run build

echo "🚀 启动本地服务 → http://localhost:3000"
cd "$PROJECT_DIR"
node frontend/server.js
