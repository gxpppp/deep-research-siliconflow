# DeepResearch Platform 开发文档

## 开发环境搭建

### 前置要求

- **Python**: 3.10 或更高版本
- **Node.js**: 18 或更高版本
- **Git**: 版本控制
- **IDE**: 推荐使用 VS Code 或 Trae

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/deepresearch-platform.git
cd deepresearch-platform
```

### 2. 后端环境配置

```bash
cd backend

# 创建虚拟环境
python -m venv venv

# Windows 激活虚拟环境
venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 创建环境变量文件
copy .env.example .env

# 编辑 .env 文件，填入你的 API Key
notepad .env
```

### 3. 前端环境配置

```bash
cd frontend

# 安装依赖
npm install

# 安装推荐插件 (VS Code)
# - ESLint
# - Prettier
# - TypeScript Importer
```

### 4. 启动开发服务器

#### 方式一：使用启动脚本

```bash
# 在项目根目录
cd ..

# Windows
start.bat

# PowerShell
.\start.ps1
```

#### 方式二：手动启动

```bash
# 终端 1: 启动后端
cd backend
venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 终端 2: 启动前端
cd frontend
npm run dev
```

访问 http://localhost:5173

## 项目结构详解

### 后端结构

```
backend/
├── agent/                      # Agent 核心逻辑
│   ├── __init__.py
│   ├── llm.py                 # LLM 配置和封装
│   └── workflow.py            # 研究工作流 (核心)
├── tools/                      # 工具实现
│   ├── __init__.py
│   ├── search.py              # 搜索工具 (DuckDuckGo)
│   ├── search_duckduckgo.py   # DuckDuckGo 实现
│   ├── scrape.py              # 网页抓取 (Jina AI)
│   └── pdf.py                 # PDF 分析 (PyMuPDF)
├── models/                     # 数据模型
│   ├── __init__.py
│   └── schemas.py             # Pydantic 模型
├── prompts/                    # 提示词文件
│   ├── system_prompt.txt
│   ├── planning_prompt.txt
│   ├── search_analysis_prompt.txt
│   ├── deep_analysis_prompt.txt
│   └── synthesis_prompt.txt
├── main.py                     # FastAPI 入口
├── requirements.txt            # Python 依赖
└── .env                        # 环境变量
```

### 前端结构

```
frontend/
├── src/
│   ├── components/             # React 组件
│   │   ├── ui/                # shadcn/ui 组件
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── select.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── switch.tsx
│   │   │   └── textarea.tsx
│   │   ├── ConsolePanel.tsx   # 控制台面板
│   │   ├── ProgressBar.tsx    # 进度条
│   │   ├── ReportViewer.tsx   # 报告查看器
│   │   ├── ResearchChat.tsx   # 研究聊天 (主组件)
│   │   └── SettingsPanel.tsx  # 设置面板
│   ├── lib/                    # 工具函数
│   │   └── utils.ts           # 通用工具
│   ├── services/               # API 服务
│   │   └── api.ts             # API 调用
│   ├── stores/                 # Zustand 状态
│   │   ├── researchStore.ts   # 研究状态
│   │   └── settingsStore.ts   # 设置状态
│   ├── types/                  # TypeScript 类型
│   │   └── index.ts           # 类型定义
│   ├── App.tsx                 # 主应用
│   ├── main.tsx                # 入口
│   └── index.css               # 全局样式
├── components.json             # shadcn/ui 配置
├── package.json
├── tailwind.config.js          # Tailwind 配置
├── tsconfig.json
└── vite.config.ts              # Vite 配置
```

## 代码规范

### Python 代码规范

使用 Black 和 Ruff 进行代码格式化和检查：

```bash
# 格式化代码
black backend/

# 检查代码
ruff check backend/

# 自动修复
ruff check backend/ --fix
```

#### 命名规范

- **模块名**: 小写，下划线分隔 (`search_duckduckgo.py`)
- **类名**: 大驼峰 (`ResearchWorkflow`)
- **函数名**: 小写，下划线分隔 (`execute_search`)
- **常量**: 大写，下划线分隔 (`MAX_ITERATIONS`)
- **私有函数**: 下划线前缀 (`_internal_method`)

#### 文档字符串

```python
def example_function(param1: str, param2: int) -> Dict[str, Any]:
    """
    函数简短描述。
    
    详细描述函数的功能、使用场景和注意事项。
    
    Args:
        param1: 参数1的描述
        param2: 参数2的描述
        
    Returns:
        返回值的描述
        
    Raises:
        ValueError: 当参数无效时抛出
        
    Example:
        >>> result = example_function("test", 123)
        >>> print(result)
    """
    pass
```

### TypeScript/React 代码规范

使用 ESLint 和 Prettier：

```bash
# 检查代码
cd frontend
npm run lint

# 格式化
npx prettier --write "src/**/*.{ts,tsx}"
```

#### 命名规范

- **组件名**: 大驼峰 (`ResearchChat.tsx`)
- **Hook 名**: use 前缀 (`useResearch`)
- **类型名**: 大驼峰 (`ResearchState`)
- **接口名**: I 前缀或直接使用 (`IUser` 或 `User`)
- **枚举名**: 大驼峰 (`ResearchStatus`)
- **常量**: 大写，下划线分隔 (`MAX_QUERY_LENGTH`)

#### 组件结构

```typescript
// 1. 导入
import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'

// 2. 类型定义
interface ComponentProps {
  title: string
  onAction: () => void
}

// 3. 组件定义
export function ComponentName({ title, onAction }: ComponentProps) {
  // 3.1 状态
  const [count, setCount] = useState(0)
  
  // 3.2 回调
  const handleClick = useCallback(() => {
    setCount(c => c + 1)
    onAction()
  }, [onAction])
  
  // 3.3 渲染
  return (
    <div className="p-4">
      <h1>{title}</h1>
      <Button onClick={handleClick}>
        Count: {count}
      </Button>
    </div>
  )
}
```

## 调试技巧

### 后端调试

#### 1. 使用 print 调试

```python
# workflow.py
print(f"[DEBUG] 搜索查询: {search_query}")
print(f"[DEBUG] 结果数量: {len(results)}")
```

#### 2. 使用日志

```python
import logging

logger = logging.getLogger(__name__)

logger.debug("调试信息")
logger.info("一般信息")
logger.warning("警告")
logger.error("错误")
```

#### 3. 使用 IDE 调试

VS Code 配置 (`.vscode/launch.json`):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": ["main:app", "--reload"],
      "jinja": true,
      "cwd": "${workspaceFolder}/backend"
    }
  ]
}
```

#### 4. API 测试

使用 Swagger UI: http://localhost:8000/docs

或使用 curl:

```bash
curl -X POST "http://localhost:8000/api/research" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "测试查询",
    "settings": {
      "api_key": "your_key",
      "model": "deepseek-ai/DeepSeek-V2.5"
    }
  }'
```

### 前端调试

#### 1. React DevTools

安装浏览器扩展，检查组件状态和 props。

#### 2. 控制台日志

```typescript
console.log('[DEBUG] 状态:', state)
console.table(data)
console.group('请求')
console.log('URL:', url)
console.log('参数:', params)
console.groupEnd()
```

#### 3. Zustand DevTools

```typescript
// stores/researchStore.ts
import { devtools } from 'zustand/middleware'

export const useResearchStore = create<ResearchState>()(
  devtools(
    (set, get) => ({
      // ... state
    }),
    { name: 'ResearchStore' }
  )
)
```

#### 4. 网络调试

浏览器开发者工具 -> Network -> 筛选 XHR/Fetch

## 添加新功能

### 添加新工具

以添加 Wikipedia 搜索为例：

1. **创建工具文件** (`backend/tools/wikipedia.py`):

```python
"""Wikipedia 搜索工具"""
import aiohttp
from typing import Dict, Any, List

async def search_wikipedia(query: str, max_results: int = 5) -> Dict[str, Any]:
    """
    搜索 Wikipedia。
    
    Args:
        query: 搜索查询
        max_results: 最大结果数
        
    Returns:
        搜索结果字典
    """
    try:
        # 实现搜索逻辑
        results = []
        # ... 搜索代码
        
        return {
            "success": True,
            "results": results,
            "total": len(results)
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
```

2. **在 workflow.py 中使用**:

```python
from tools.wikipedia import search_wikipedia

# 在适当的位置调用
result = await search_wikipedia(query)
```

### 添加新阶段

以添加数据验证阶段为例：

1. **创建提示词文件** (`backend/prompts/validation_prompt.txt`)

2. **在 workflow.py 中添加阶段**:

```python
async def execute(self, query: str, settings: Dict[str, Any]):
    # ... 现有阶段
    
    # 新增验证阶段
    yield self._sse_event("status", {
        "stage": "验证",
        "progress": 60,
        "message": "验证数据准确性..."
    })
    
    validation_result = await self._validate_data(report)
    
    # ... 后续阶段

async def _validate_data(self, report: Dict) -> Dict[str, Any]:
    """验证数据准确性"""
    # 实现验证逻辑
    pass
```

### 添加新组件

以添加历史记录组件为例：

1. **创建组件文件** (`frontend/src/components/HistoryPanel.tsx`):

```typescript
import { useState } from 'react'
import { Card } from '@/components/ui/card'

interface HistoryItem {
  id: string
  query: string
  date: Date
}

export function HistoryPanel() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  
  return (
    <Card className="p-4">
      <h3 className="font-bold mb-4">研究历史</h3>
      {/* 渲染历史列表 */}
    </Card>
  )
}
```

2. **在 App.tsx 中引入**:

```typescript
import { HistoryPanel } from '@/components/HistoryPanel'

// 在适当位置渲染
<HistoryPanel />
```

## 测试

### 后端测试

```bash
cd backend

# 运行所有测试
pytest

# 运行特定测试
pytest tests/test_workflow.py

# 带覆盖率
pytest --cov=agent tests/
```

### 前端测试

```bash
cd frontend

# 运行测试
npm test

# 运行特定测试
npm test -- ReportViewer.test.tsx
```

## 性能优化

### 后端优化

1. **异步处理**: 使用 `async/await` 避免阻塞
2. **并发搜索**: 多个查询并行执行
3. **缓存**: 缓存搜索结果
4. **超时控制**: 设置合理的超时时间

### 前端优化

1. **虚拟列表**: 长列表使用虚拟滚动
2. **懒加载**: 组件按需加载
3. **状态选择**: 使用 Zustand 选择器避免不必要渲染
4. **防抖节流**: 输入框使用防抖

## 常见问题

### Q: 后端启动报错 ModuleNotFoundError

A: 确保虚拟环境已激活，并安装了所有依赖：

```bash
cd backend
venv\Scripts\activate
pip install -r requirements.txt
```

### Q: 前端构建失败

A: 检查 TypeScript 类型错误：

```bash
cd frontend
npx tsc --noEmit
```

### Q: API 请求失败

A: 检查：
1. 后端服务是否运行
2. CORS 配置是否正确
3. API Key 是否有效

### Q: 热重载不工作

A: 确保使用 `--reload` 参数启动：

```bash
uvicorn main:app --reload
```

## 贡献指南

1. **创建分支**:
   ```bash
   git checkout -b feature/your-feature
   ```

2. **提交更改**:
   ```bash
   git add .
   git commit -m "feat: 添加新功能"
   ```

3. **推送分支**:
   ```bash
   git push origin feature/your-feature
   ```

4. **创建 Pull Request**

### 提交信息规范

- `feat`: 新功能
- `fix`: 修复
- `docs`: 文档
- `style`: 格式调整
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具

示例: `feat: 添加 Wikipedia 搜索工具`

## 资源链接

- [FastAPI 文档](https://fastapi.tiangolo.com/)
- [React 文档](https://react.dev/)
- [Tailwind CSS 文档](https://tailwindcss.com/)
- [shadcn/ui 文档](https://ui.shadcn.com/)
- [LangChain 文档](https://python.langchain.com/)
