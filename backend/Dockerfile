FROM python:3.11-slim

WORKDIR /app

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY main.py .
COPY export_service.py .
COPY admin_api.py .

# 复制 Excel 模板（放在同级目录，通过环境变量 TEMPLATE_DIR 可覆盖）
COPY ../frontend/public/template.xlsx /app/template.xlsx

# 设置默认模板路径环境变量（供 export_service.py 使用）
ENV TEMPLATE_DIR=/app

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
