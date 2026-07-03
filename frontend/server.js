/**
 * COC 人物卡向导 - HTTP 服务 + 数据持久化
 * =============================================
 * 部署说明：
 *   1) 确保已执行 npm install && npm run build（构建前端）
 *   2) 在项目根目录执行：node frontend/server.js
 *   或双击 start.command (macOS) / start.bat (Windows)
 *   3) 打开浏览器访问 http://localhost:3000
 *
 * 数据存储：
 *   所有人物卡数据保存在项目根目录 ../data/characters.json
 *   备份此文件即可备份全部数据
 * =============================================
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DIST_DIR = path.join(__dirname, 'dist');
const DATA_FILE = path.join(__dirname, '..', 'data', 'characters.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

// ── 数据文件管理 ──

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
  }
}

function readAll() {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeAll(data) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** 从 investigator 数据计算元信息 */
function buildMeta(c) {
  const inv = c.investigator;
  const computedHpMax = Math.floor((inv.con + inv.siz) / 10);
  const computedSanMax = inv.pow;
  const hpMax = inv.hpMax || computedHpMax;
  const sanMax = inv.sanMax || computedSanMax;
  const hpCurrent = Math.min(inv.hpCurrent || hpMax, hpMax);
  const sanCurrent = Math.min(inv.sanCurrent || sanMax, sanMax);
  return {
    id: c.id,
    name: inv.name || '未命名',
    player: inv.player || '-',
    occupationName: inv.occupationName || '未选择',
    era: inv.era || '-',
    age: inv.age,
    gender: inv.gender || '',
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    hpCurrent,
    hpMax,
    sanCurrent,
    sanMax,
  };
}

// ── URL 解析 ──

function parseUrl(reqUrl) {
  return reqUrl.split('?')[0];
}

// ── 请求正文收集 ──

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// ── 发送 JSON 响应 ──

function jsonResponse(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

// ── 服务文件 ──

function serveFile(res, filePath) {
  const ext = path.extname(filePath);
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'max-age=86400',
  });
  fs.createReadStream(filePath).pipe(res);
}

function serveIndex(res) {
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<html><body style="font-family:sans-serif;padding:2em;text-align:center">
      <h1>🎲 COC 人物卡向导</h1>
      <p>前端页面尚未构建。</p>
      <p>请在终端执行：<code>cd frontend && npm install && npm run build</code></p>
      <p>然后刷新此页面。</p>
    </body></html>`);
    return;
  }
  serveFile(res, indexPath);
}

// ── HTTP 服务 ──

const server = http.createServer(async (req, res) => {
  const method = req.method;
  const urlPath = parseUrl(req.url);

  try {
    console.log(`${new Date().toLocaleTimeString()} → ${method} ${urlPath}`);

    // ========================
    // API routes
    // ========================

    // GET /api/characters — 获取所有人物卡元数据列表
    if (method === 'GET' && urlPath === '/api/characters') {
      const all = readAll();
      const metas = all.map(buildMeta);
      jsonResponse(res, 200, metas);
      return;
    }

    // GET /api/characters/summaries — 简要摘要
    if (method === 'GET' && urlPath === '/api/characters/summaries') {
      const all = readAll();
      const summaries = all.map(c => ({
        id: c.id,
        name: c.investigator.name || '未命名',
        updatedAt: c.updatedAt,
      }));
      jsonResponse(res, 200, summaries);
      return;
    }

    // POST /api/characters/save — 保存（新建/更新）
    if (method === 'POST' && urlPath === '/api/characters/save') {
      const body = await collectBody(req);
      const { investigator, existingId } = body;
      const all = readAll();
      const now = new Date().toISOString();
      let id;

      if (existingId) {
        const idx = all.findIndex(c => c.id === existingId);
        if (idx !== -1) {
          all[idx] = { ...all[idx], investigator, updatedAt: now };
          id = existingId;
        } else {
          id = generateId();
          all.push({ id, investigator, createdAt: now, updatedAt: now });
        }
      } else {
        id = generateId();
        all.push({ id, investigator, createdAt: now, updatedAt: now });
      }
      writeAll(all);
      jsonResponse(res, 200, { id });
      return;
    }

    // GET /api/characters/:id — 获取单个人物卡
    const getMatch = urlPath.match(/^\/api\/characters\/([a-z0-9]+)$/);
    if (method === 'GET' && getMatch) {
      const all = readAll();
      const char = all.find(c => c.id === getMatch[1]);
      if (char) {
        jsonResponse(res, 200, char);
      } else {
        jsonResponse(res, 404, { error: 'Not found' });
      }
      return;
    }

    // DELETE /api/characters/:id — 删除
    const deleteMatch = urlPath.match(/^\/api\/characters\/([a-z0-9]+)$/);
    if (method === 'DELETE' && deleteMatch) {
      const all = readAll();
      const filtered = all.filter(c => c.id !== deleteMatch[1]);
      if (filtered.length === all.length) {
        jsonResponse(res, 404, { error: 'Not found' });
      } else {
        writeAll(filtered);
        jsonResponse(res, 200, { success: true });
      }
      return;
    }

    // ========================
    // Static files + SPA fallback
    // ========================

    let filePath = urlPath === '/' ? '/index.html' : urlPath;
    filePath = path.join(DIST_DIR, filePath);

    // Security：防止路径穿越
    if (!filePath.startsWith(DIST_DIR)) {
      jsonResponse(res, 403, { error: 'Forbidden' });
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      serveFile(res, filePath);
    } else {
      serveIndex(res);
    }

  } catch (err) {
    console.error('Server error:', err);
    jsonResponse(res, 500, { error: 'Internal server error' });
  }
});

server.listen(PORT, () => {
  console.log(`
  🎲 COC 人物卡向导
  ═══════════════════════════════
  🌐  打开浏览器: http://localhost:${PORT}
  📁  数据文件:    ${DATA_FILE}
  ⏹   按 Ctrl+C 停止服务
  ═══════════════════════════════
  `);
});
