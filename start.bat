@echo off
chcp 65001 >nul
title DeepResearch Platform 启动器
echo.
echo ==========================================
echo    DeepResearch Platform 启动器
echo ==========================================
echo.

REM 检查 Python 环境
echo [1/5] 检查 Python 环境...
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Python，请安装 Python 3.10+
    pause
    exit /b 1
)
echo [✓] Python 已安装

REM 检查 Node.js 环境
echo [2/5] 检查 Node.js 环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Node.js，请安装 Node.js 18+
    pause
    exit /b 1
)
echo [✓] Node.js 已安装

REM 检查并创建后端虚拟环境
echo [3/5] 检查后端环境...
cd /d "%~dp0backend"
if not exist "venv" (
    echo [信息] 创建虚拟环境...
    python -m venv venv
)

REM 激活虚拟环境并安装依赖
call venv\Scripts\activate
if not exist "venv\Lib\site-packages\fastapi" (
    echo [信息] 安装后端依赖...
    pip install -r requirements.txt
)
echo [✓] 后端环境就绪

REM 检查前端依赖
echo [4/5] 检查前端环境...
cd /d "%~dp0frontend"
if not exist "node_modules" (
    echo [信息] 安装前端依赖...
    npm install
)
echo [✓] 前端环境就绪

REM 启动服务
echo [5/5] 启动服务...
echo.
echo ==========================================
echo    正在启动服务...
echo    前端: http://localhost:5173
echo    后端: http://localhost:8000
echo    API文档: http://localhost:8000/docs
echo ==========================================
echo.
echo 按 Ctrl+C 停止服务
echo.

REM 启动后端 (在新窗口)
start "DeepResearch Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

REM 等待后端启动
timeout /t 3 /nobreak >nul

REM 启动前端 (在当前窗口)
cd /d "%~dp0frontend"
npm run dev

REM 清理
echo.
echo 服务已停止
echo.
pause
