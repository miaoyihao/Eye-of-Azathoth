"""
COC 人物卡向导 - API 服务
=========================

功能：
  1. Excel 导出（/api/export-excel）
  2. 管理员用户管理（/api/admin/*）

启动方式：
    uvicorn main:app --host 127.0.0.1 --port 8080

或单独运行此文件：
    python main.py
"""

import json
import logging
import os
import sys

from urllib.parse import quote

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

# 将项目根加入 sys.path（便于导入 export_service / admin_api）
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from export_service import export_to_xlsx
from admin_api import router as admin_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title='COC 人物卡 API 服务')

# CORS：允许前端（localhost:3000, Vercel, file:// 等）调用
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# ── 挂载子路由 ──
app.include_router(admin_router)


# ========================================
# 健康检查
# ========================================
@app.get('/api/health')
def health():
    return {'status': 'ok', 'service': 'coc-excel-export'}


# ========================================
# Excel 导出
# ========================================
@app.post('/api/export-excel')
def export_excel(data: dict):
    """接收调查员 JSON，返回 xlsx 文件"""
    try:
        investigator = data.get('investigator', data)
        occupation_name = data.get('occupationName', investigator.get('occupationName', ''))
        character_id = data.get('characterId', '')
        xlsx_bytes, filename = export_to_xlsx(investigator, occupation_name, character_id)

        # 对中文文件名做 URL 编码（RFC 5987），避免 latin-1 编码错误
        encoded_name = quote(filename, safe='')
        return Response(
            content=xlsx_bytes,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={
                'Content-Disposition': f"attachment; filename*=UTF-8''{encoded_name}",
                'Content-Length': str(len(xlsx_bytes)),
            },
        )
    except Exception as e:
        logger.exception('导出 Excel 失败')
        raise HTTPException(status_code=500, detail=str(e))


# ========================================
# 直接运行
# ========================================
if __name__ == '__main__':
    import uvicorn
    logger.info('启动 COC Excel 导出服务 → http://127.0.0.1:8080')
    uvicorn.run(app, host='127.0.0.1', port=8080, log_level='info')
