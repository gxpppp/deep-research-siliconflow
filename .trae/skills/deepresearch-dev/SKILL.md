---
name: "deepresearch-dev"
description: "DeepResearch Platform 开发技能。提供项目开发的最佳实践、代码规范、调试技巧和常见任务指南。Invoke when working on DeepResearch Platform codebase or when user asks about development tasks."
---

# DeepResearch Platform 开发技能

## 项目概述

DeepResearch Platform 是一个基于 ReAct 模式的 AI 驱动深度研究平台。

- **技术栈**: FastAPI + React + TypeScript + LangChain + DuckDuckGo
- **核心特性**: 多阶段迭代工作流、超长文本支持、实时控制台、多源验证

## 快速导航

| 文档 | 路径 | 用途 |
|------|------|------|
| 主文档 | [README.md](file:///f:/AAAexpert/deep%20trea/README.md) | 项目介绍和快速开始 |
| 架构文档 | [docs/ARCHITECTURE.md](file:///f:/AAAexpert/deep%20trea/docs/ARCHITECTURE.md) | 系统架构和工作流详解 |
| 开发文档 | [docs/DEVELOPMENT.md](file:///f:/AAAexpert/deep%20trea/docs/DEVELOPMENT.md) | 开发环境搭建和代码规范 |
| API 文档 | [docs/API.md](file:///f:/AAAexpert/deep%20trea/docs/API.md) | API 端点和 SSE 事件说明 |
| 部署文档 | [docs/DEPLOYMENT.md](file:///f:/AAAexpert/deep%20trea/docs/DEPLOYMENT.md) | 各种部署方式指南 |

## 常用命令

### 启动项目

```bash
# Windows 一键启动
start.bat

# PowerShell 启动
.\start.ps1

# 仅启动后端
.\start.ps1 -BackendOnly

# 仅启动前端
.\start.ps1 -FrontendOnly
```

### 后端开发

```bash
cd backend
venv\Scripts\activate

# 启动服务
uvicorn main:app --reload

# 安装新依赖
pip install <package>
pip freeze > requirements.txt
```

### 前端开发

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 代码检查
npm run lint
```

## 代码规范

### Python

- 使用 Black 格式化: `black backend/`
- 使用 Ruff 检查: `ruff check backend/`
- 命名: 模块小写下划线, 类大驼峰, 函数小写下划线
- 文档字符串: Google 风格

### TypeScript/React

- 使用 ESLint: `npm run lint`
- 使用 Prettier: `npx prettier --write "src/**/*.{ts,tsx}"`
- 命名: 组件大驼峰, Hook use 前缀, 类型大驼峰
- 组件结构: 导入 -> 类型 -> 组件定义 -> 状态 -> 回调 -> 渲染

## 添加新功能

### 添加新工具

1. 在 `backend/tools/` 创建工具文件
2. 实现工具函数，返回 `{success, results, error}` 格式
3. 在 `workflow.py` 中调用

示例: [backend/tools/search_duckduckgo.py](file:///f:/AAAexpert/deep%20trea/backend/tools/search_duckduckgo.py)

### 添加新工作流阶段

1. 创建提示词文件 `backend/prompts/<stage>_prompt.txt`
2. 在 `workflow.py` 的 `execute` 方法中添加阶段
3. 实现阶段处理方法 `_<stage>_stage()`
4. 发送 `status` 和 `thinking` 事件

### 添加新组件

1. 创建组件文件 `frontend/src/components/<Component>.tsx`
2. 使用 shadcn/ui 组件
3. 在 `App.tsx` 或父组件中引入
4. 更新类型定义 `frontend/src/types/index.ts`

## 调试技巧

### 后端调试

```python
# 使用 print
print(f"[DEBUG] 变量值: {variable}")

# 查看日志
# Windows
Get-Content backend\log\research-logs-*.txt -Tail 50

# Linux/Mac
tail -f backend/log/research-logs-*.txt
```

### 前端调试

```typescript
// 控制台日志
console.log('[DEBUG] 状态:', state)
console.table(data)

// Zustand DevTools
// 在 stores 中使用 devtools middleware
import { devtools } from 'zustand/middleware'
```

## 常见问题

### Q: 后端启动报错 ModuleNotFoundError
A: 确保虚拟环境已激活并安装依赖:
```bash
cd backend
venv\Scripts\activate
pip install -r requirements.txt
```

### Q: 前端构建失败
A: 检查 TypeScript 类型:
```bash
cd frontend
npx tsc --noEmit
```

### Q: SSE 连接失败
A: 检查后端是否运行，CORS 配置是否正确

### Q: 搜索返回空结果
A: 检查 DuckDuckGo 是否可用，或查看控制台错误日志

## 文件结构速查

```
deep-research-platform/
├── start.bat / start.ps1      # 启动脚本
├── README.md                   # 主文档
├── docs/                       # 文档目录
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md
│   ├── API.md
│   └── DEPLOYMENT.md
├── backend/                    # FastAPI 后端
│   ├── agent/
│   │   ├── workflow.py        # 核心工作流
│   │   └── llm.py
│   ├── tools/                  # 工具实现
│   ├── models/
│   ├── prompts/                # 提示词文件
│   └── main.py
└── frontend/                   # React 前端
    ├── src/
    │   ├── components/         # UI 组件
    │   ├── stores/             # Zustand 状态
    │   ├── services/           # API 服务
    │   └── types/              # TypeScript 类型
    └── package.json
```

## 工作流阶段

1. **Planning** (规划) - 生成搜索查询
2. **Searching** (搜索) - 执行 DuckDuckGo 搜索
3. **Search Analysis** (搜索分析) - 分析结果，决定是否需要补充搜索
4. **Iteration** (迭代) - 可选的补充搜索
5. **Deep Analysis** (深度分析) - 综合分析所有信息
6. **Scraping** (抓取) - 抓取关键来源内容
7. **Synthesis** (综合) - 生成最终报告

## SSE 事件类型

- `status` - 状态更新 (stage, progress, message)
- `tool_call` - 工具调用 (tool, query/url)
- `tool_result` - 工具结果 (success, data/error)
- `thinking` - LLM 思考/分析摘要
- `complete` - 研究完成
- `error` - 错误信息

## 环境变量

```env
SILICONFLOW_API_KEY=your_key      # 必需
JINA_API_KEY=your_key             # 可选
DEFAULT_MODEL=deepseek-ai/DeepSeek-V2.5  # 可选
```

## 贡献指南

1. 创建分支: `git checkout -b feature/name`
2. 提交信息格式:
   - `feat:` 新功能
   - `fix:` 修复
   - `docs:` 文档
   - `refactor:` 重构
   - `test:` 测试

## 资源链接

- [SiliconFlow](https://siliconflow.cn/)
- [LangChain](https://python.langchain.com/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://react.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
