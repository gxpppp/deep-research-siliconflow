# DeepResearch Platform 部署文档

## 部署方式

- [本地开发部署](#本地开发部署)
- [生产环境部署](#生产环境部署)
- [Docker 部署](#docker-部署)

---

## 本地开发部署

### 前置要求

- Python 3.10+
- Node.js 18+
- Git

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/deepresearch-platform.git
cd deepresearch-platform
```

### 2. 后端部署

```bash
cd backend

# 创建虚拟环境
python -m venv venv

# Windows 激活虚拟环境
venv\Scripts\activate

# Linux/Mac 激活虚拟环境
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入 API Key

# 启动服务
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. 前端部署

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:5173

---

## 生产环境部署

### 后端生产部署

#### 使用 Gunicorn + Uvicorn

```bash
cd backend

# 安装生产依赖
pip install gunicorn

# 使用 Gunicorn 启动
# -w: worker 数量 (建议: 2 * CPU核心数 + 1)
# -k: worker 类
# -b: 绑定地址
# --timeout: 超时时间 (秒)
gunicorn main:app \
  -w 4 \
  -k uvicorn.workers.UvicornWorker \
  -b 0.0.0.0:8000 \
  --timeout 300 \
  --access-logfile access.log \
  --error-logfile error.log
```

#### 使用 systemd 服务 (Linux)

创建服务文件 `/etc/systemd/system/deepresearch-backend.service`:

```ini
[Unit]
Description=DeepResearch Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/deepresearch/backend
Environment="PATH=/var/www/deepresearch/backend/venv/bin"
Environment="SILICONFLOW_API_KEY=your_api_key"
ExecStart=/var/www/deepresearch/backend/venv/bin/gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 --timeout 300
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

启动服务:

```bash
# 重载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start deepresearch-backend

# 开机自启
sudo systemctl enable deepresearch-backend

# 查看状态
sudo systemctl status deepresearch-backend

# 查看日志
sudo journalctl -u deepresearch-backend -f
```

### 前端生产部署

#### 构建生产版本

```bash
cd frontend

# 安装依赖
npm install

# 构建生产版本
npm run build

# 构建输出在 dist/ 目录
```

#### 使用 Nginx 部署

Nginx 配置 `/etc/nginx/sites-available/deepresearch`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /var/www/deepresearch/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # SSE 支持
        proxy_buffering off;
        proxy_read_timeout 86400;
    }

    # 健康检查
    location /health {
        proxy_pass http://localhost:8000/health;
    }
}
```

启用配置:

```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/deepresearch /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

#### 使用 PM2 部署 (Node.js)

```bash
# 全局安装 PM2
npm install -g pm2

# 创建 PM2 配置文件 ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'deepresearch-frontend',
      script: 'serve',
      args: '-s dist -l 5173',
      cwd: '/var/www/deepresearch/frontend',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}
EOF

# 安装 serve
npm install -g serve

# 启动
pm2 start ecosystem.config.js

# 保存配置
pm2 save

# 开机自启
pm2 startup
```

---

## Docker 部署

### 使用 Docker Compose (推荐)

#### 1. 创建 Dockerfile

**后端 Dockerfile** (`backend/Dockerfile`):

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**前端 Dockerfile** (`frontend/Dockerfile`):

```dockerfile
# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制 package.json
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建
RUN npm run build

# 运行阶段
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**前端 Nginx 配置** (`frontend/nginx.conf`):

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }
}
```

#### 2. 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    container_name: deepresearch-backend
    ports:
      - "8000:8000"
    environment:
      - SILICONFLOW_API_KEY=${SILICONFLOW_API_KEY}
      - JINA_API_KEY=${JINA_API_KEY}
      - DEFAULT_MODEL=${DEFAULT_MODEL:-deepseek-ai/DeepSeek-V2.5}
    volumes:
      - ./backend:/app
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build: ./frontend
    container_name: deepresearch-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

  # 可选: 使用 Redis 缓存
  redis:
    image: redis:7-alpine
    container_name: deepresearch-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

#### 3. 创建 .env 文件

```env
SILICONFLOW_API_KEY=your_siliconflow_api_key
JINA_API_KEY=your_jina_api_key
DEFAULT_MODEL=deepseek-ai/DeepSeek-V2.5
```

#### 4. 启动服务

```bash
# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 完全清理 (包括卷)
docker-compose down -v
```

### 使用 Docker Swarm

```bash
# 初始化 Swarm
docker swarm init

# 部署
docker stack deploy -c docker-compose.yml deepresearch

# 查看服务
docker stack ps deepresearch

# 查看日志
docker service logs deepresearch_backend

# 删除服务
docker stack rm deepresearch
```

---

## 云平台部署

### 部署到 Vercel (前端)

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 部署
cd frontend
vercel --prod
```

**vercel.json** 配置:

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://your-backend-url.com/api/$1"
    }
  ]
}
```

### 部署到 Railway/Render/Fly.io (后端)

这些平台支持直接从 GitHub 部署:

1. 推送代码到 GitHub
2. 连接平台到仓库
3. 配置环境变量
4. 自动部署

**Railway 配置** (`railway.json`):

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 部署到阿里云/腾讯云

#### 使用 ECS/轻量应用服务器

1. 购买云服务器 (建议配置: 2核4G+)
2. 安装 Docker 和 Docker Compose
3. 上传项目代码
4. 运行 `docker-compose up -d`

#### 使用 Serverless (函数计算)

**阿里云函数计算**:

```yaml
# template.yaml
ROSTemplateFormatVersion: '2015-09-01'
Transform: 'Aliyun::Serverless-2018-04-03'
Resources:
  deepresearch-service:
    Type: 'Aliyun::Serverless::Service'
    Properties:
      Description: 'DeepResearch Backend'
    deepresearch-function:
      Type: 'Aliyun::Serverless::Function'
      Properties:
        Handler: main.handler
        Runtime: custom
        CodeUri: ./backend
        MemorySize: 2048
        Timeout: 300
        EnvironmentVariables:
          SILICONFLOW_API_KEY: your_api_key
```

---

## HTTPS 配置

### 使用 Let's Encrypt + Certbot

```bash
# 安装 Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期测试
sudo certbot renew --dry-run
```

### 手动配置 HTTPS

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # ... 其他配置
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 性能优化

### 后端优化

1. **启用 Gzip 压缩**:

```python
# main.py
from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=1000)
```

2. **使用缓存**:

```python
# 使用 Redis 缓存搜索结果
from functools import lru_cache

@lru_cache(maxsize=100)
async def cached_search(query: str):
    return await search_web(query)
```

3. **数据库连接池** (如果使用数据库):

```python
from databases import Database

database = Database("postgresql://...", min_size=5, max_size=20)
```

### 前端优化

1. **启用 CDN**:
   - 使用 jsDelivr/unpkg 加载第三方库
   - 静态资源上传到 OSS/CDN

2. **代码分割**:

```typescript
// 懒加载组件
const ReportViewer = lazy(() => import('./components/ReportViewer'));
```

3. **资源压缩**:
   - 图片使用 WebP 格式
   - 启用 Brotli/Gzip 压缩

### Nginx 优化

```nginx
# 启用 Gzip
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript;

# 浏览器缓存
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# 连接优化
worker_processes auto;
worker_connections 4096;
```

---

## 监控与日志

### 使用 Prometheus + Grafana

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  grafana_data:
```

### 日志收集

```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  elasticsearch:
    image: elasticsearch:8.x
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"

  kibana:
    image: kibana:8.x
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

  filebeat:
    image: docker.elastic.co/beats/filebeat:8.x
    volumes:
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - ./filebeat.yml:/usr/share/filebeat/filebeat.yml
```

---

## 备份与恢复

### 备份策略

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backup/deepresearch"
DATE=$(date +%Y%m%d_%H%M%S)

# 备份代码
tar -czf $BACKUP_DIR/code_$DATE.tar.gz /var/www/deepresearch

# 备份日志
tar -czf $BACKUP_DIR/logs_$DATE.tar.gz /var/log/deepresearch

# 保留最近 30 天的备份
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

### 自动备份 (cron)

```bash
# 每天凌晨 2 点备份
0 2 * * * /var/www/deepresearch/scripts/backup.sh
```

---

## 故障排查

### 常见问题

#### 1. 后端无法启动

```bash
# 检查端口占用
sudo lsof -i :8000

# 检查日志
sudo journalctl -u deepresearch-backend -n 100

# 测试配置
python -c "from main import app; print('OK')"
```

#### 2. 前端构建失败

```bash
# 清除缓存
rm -rf node_modules package-lock.json
npm install

# 检查 TypeScript 错误
npx tsc --noEmit
```

#### 3. 502 Bad Gateway

```bash
# 检查后端服务
sudo systemctl status deepresearch-backend

# 检查 Nginx 配置
sudo nginx -t

# 检查防火墙
sudo ufw status
```

#### 4. SSE 连接断开

```bash
# 检查 Nginx 超时配置
proxy_read_timeout 86400;
proxy_send_timeout 86400;

# 检查后端超时
--timeout 300
```

---

## 安全建议

1. **使用防火墙** (UFW):

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

2. **定期更新**:

```bash
# 更新系统
sudo apt-get update && sudo apt-get upgrade -y

# 更新 Docker 镜像
docker-compose pull && docker-compose up -d
```

3. **限制 API 访问**:

```nginx
# 限制请求频率
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api/ {
    limit_req zone=api burst=20 nodelay;
    # ...
}
```

4. **使用 Secrets 管理**:

```bash
# Docker Secrets
echo "your_api_key" | docker secret create siliconflow_key -
```
