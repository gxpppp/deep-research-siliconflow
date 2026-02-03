# DeepResearch Platform 启动脚本
# 支持参数: -BackendOnly, -FrontendOnly, -Port <port>

param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 5173
)

# 设置编码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "DeepResearch Platform 启动器"

# 颜色定义
$Colors = @{
    Success = "Green"
    Error = "Red"
    Warning = "Yellow"
    Info = "Cyan"
    Title = "Magenta"
}

function Write-ColorLine {
    param([string]$Text, [string]$Color = "White")
    Write-Host $Text -ForegroundColor $Colors[$Color]
}

function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

function Test-Port {
    param([int]$Port)
    $listener = $null
    try {
        $listener = New-Object System.Net.Sockets.TcpListener ([System.Net.IPAddress]::Any, $Port)
        $listener.Start()
        $listener.Stop()
        return $true
    } catch {
        return $false
    }
}

# 清屏并显示标题
Clear-Host
Write-ColorLine "==========================================" "Title"
Write-ColorLine "   DeepResearch Platform 启动器" "Title"
Write-ColorLine "==========================================" "Title"
Write-Host ""

# 获取项目根目录
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendPath = Join-Path $ProjectRoot "backend"
$FrontendPath = Join-Path $ProjectRoot "frontend"

# 检查环境
if (-not $FrontendOnly) {
    Write-ColorLine "[1/5] 检查 Python 环境..." "Info"
    if (-not (Test-Command "python")) {
        Write-ColorLine "[错误] 未找到 Python，请安装 Python 3.10+" "Error"
        exit 1
    }
    $PythonVersion = python --version 2>&1
    Write-ColorLine "[✓] $PythonVersion" "Success"
}

if (-not $BackendOnly) {
    Write-ColorLine "[2/5] 检查 Node.js 环境..." "Info"
    if (-not (Test-Command "node")) {
        Write-ColorLine "[错误] 未找到 Node.js，请安装 Node.js 18+" "Error"
        exit 1
    }
    $NodeVersion = node --version
    Write-ColorLine "[✓] Node.js $NodeVersion" "Success"
}

# 检查端口
if (-not $FrontendOnly) {
    Write-ColorLine "[3/5] 检查端口 $BackendPort..." "Info"
    if (-not (Test-Port $BackendPort)) {
        Write-ColorLine "[警告] 端口 $BackendPort 已被占用" "Warning"
        $BackendPort = Read-Host "请输入新的后端端口 (默认: 8001)"
        if ([string]::IsNullOrWhiteSpace($BackendPort)) { $BackendPort = 8001 }
    } else {
        Write-ColorLine "[✓] 端口 $BackendPort 可用" "Success"
    }
}

if (-not $BackendOnly) {
    Write-ColorLine "[4/5] 检查端口 $FrontendPort..." "Info"
    if (-not (Test-Port $FrontendPort)) {
        Write-ColorLine "[警告] 端口 $FrontendPort 已被占用" "Warning"
        $FrontendPort = Read-Host "请输入新的前端端口 (默认: 5174)"
        if ([string]::IsNullOrWhiteSpace($FrontendPort)) { $FrontendPort = 5174 }
    } else {
        Write-ColorLine "[✓] 端口 $FrontendPort 可用" "Success"
    }
}

# 准备后端环境
if (-not $FrontendOnly) {
    Write-ColorLine "[5/5] 准备后端环境..." "Info"
    Set-Location $BackendPath
    
    # 检查虚拟环境
    if (-not (Test-Path "venv")) {
        Write-ColorLine "[信息] 创建虚拟环境..." "Info"
        python -m venv venv
    }
    
    # 激活虚拟环境
    & "venv\Scripts\Activate.ps1"
    
    # 检查依赖
    $PythonPackages = python -c "import fastapi" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-ColorLine "[信息] 安装后端依赖..." "Info"
        pip install -r requirements.txt
    }
    Write-ColorLine "[✓] 后端环境就绪" "Success"
}

# 准备前端环境
if (-not $BackendOnly) {
    Write-ColorLine "[6/6] 准备前端环境..." "Info"
    Set-Location $FrontendPath
    
    if (-not (Test-Path "node_modules")) {
        Write-ColorLine "[信息] 安装前端依赖..." "Info"
        npm install
    }
    Write-ColorLine "[✓] 前端环境就绪" "Success"
}

# 显示启动信息
Write-Host ""
Write-ColorLine "==========================================" "Title"
Write-ColorLine "   正在启动服务..." "Title"
if (-not $FrontendOnly) {
    Write-ColorLine "   后端: http://localhost:$BackendPort" "Info"
    Write-ColorLine "   API文档: http://localhost:$BackendPort/docs" "Info"
}
if (-not $BackendOnly) {
    Write-ColorLine "   前端: http://localhost:$FrontendPort" "Info"
}
Write-ColorLine "==========================================" "Title"
Write-Host ""
Write-ColorLine "按 Ctrl+C 停止服务" "Warning"
Write-Host ""

# 启动后端
$BackendJob = $null
if (-not $FrontendOnly) {
    $BackendJob = Start-Job -ScriptBlock {
        param($Path, $Port)
        Set-Location $Path
        & "venv\Scripts\Activate.ps1"
        uvicorn main:app --host 0.0.0.0 --port $Port --reload
    } -ArgumentList $BackendPath, $BackendPort
    
    Write-ColorLine "[✓] 后端服务已启动 (Job ID: $($BackendJob.Id))" "Success"
    Start-Sleep -Seconds 3
}

# 启动前端
$FrontendJob = $null
if (-not $BackendOnly) {
    Set-Location $FrontendPath
    npm run dev -- --port $FrontendPort
}

# 清理
Write-Host ""
Write-ColorLine "正在停止服务..." "Warning"

if ($BackendJob) {
    Stop-Job $BackendJob
    Remove-Job $BackendJob
    Write-ColorLine "[✓] 后端服务已停止" "Success"
}

Write-Host ""
Write-ColorLine "感谢使用 DeepResearch Platform!" "Title"
Write-Host ""
