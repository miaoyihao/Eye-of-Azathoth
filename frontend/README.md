# COC 人物卡向导 (Eye of Azathoth)

克苏鲁的呼唤七版角色卡生成工具。基于 React + TypeScript + Vite + Tailwind CSS。

## 使用方式

### 首次部署

```bash
# 1. 安装依赖并构建前端
cd frontend
npm install
npm run build

# 2. 启动服务
cd ..
node frontend/server.js
# 或: bash deploy.sh（一键完成以上所有步骤）
```

### 后续使用

| 系统 | 操作 |
|------|------|
| **macOS** | 双击 `start.command`（自动启动服务 + 打开浏览器） |
| **Windows** | 双击 `start.bat`（自动启动服务 + 打开浏览器） |

然后打开浏览器访问：**http://localhost:3000**

### 服务管理

- **后台运行**：服务启动后保持运行即可，浏览器标签页不关随时可用
- **停止服务**：按 `Ctrl+C`
- **重启**：双击 `start.command` / `start.bat` 即可重启

### 数据存储

所有人物卡保存在项目根目录的 `data/characters.json` 文件中。

- 备份：复制此文件即可备份全部数据
- 迁移：复制到另一台电脑的同一目录下即可恢复
- 此文件不会因 `npm run build` 被清空

## 开发

```bash
cd frontend
npm install
npm run dev
```

## 文件说明

| 文件 | 说明 |
|------|------|
| `frontend/server.js` | HTTP 服务器（内置 REST API + 静态文件服务） |
| `start.command` | macOS 双击启动脚本 |
| `start.bat` | Windows 双击启动脚本 |
| `deploy.sh` | 一键部署脚本（安装→构建→启动） |
| `data/characters.json` | 人物卡数据文件（自动生成） |
