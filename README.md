# DeepResearch Platform

AI 驱动的深度研究平台，基于 SiliconFlow API 和 LangChain 构建，提供可验证、多角度、带溯源的智能研究分析。

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 功能特性

- **智能研究流程**: 规划 → 搜索 → 分析 → 迭代 → 深度分析 → 综合总结，全流程自动化
- **多阶段迭代**: ReAct 风格工作流，LLM 自动判断是否需要补充搜索
- **超长文本支持**: 支持最多 50,000 字符输入，自动调整输入框高度
- **多源验证**: 交叉比对多个权威来源，确保信息准确性
- **透明溯源**: 每个结论都带来源编号，文末附完整参考文献
- **实时流式输出**: SSE 流式返回研究进度和中间结果
- **实时控制台**: 显示完整的研究过程日志
- **多模型支持**: 支持 DeepSeek、Qwen、Llama 等多种大模型
- **DuckDuckGo 搜索**: 内置 DuckDuckGo 搜索，无需 SerpAPI
- **安全设计**: API Key 本地存储，XSS 过滤，URL 安全校验

## 技术栈

### 后端
- **FastAPI** - 高性能 Python Web 框架
- **LangChain** - LLM 应用开发框架
- **SiliconFlow API** - 大模型推理服务 (OpenAI 兼容)
- **DuckDuckGo Search** - 免费搜索引擎
- **Jina AI Reader** - 网页内容提取
- **PyMuPDF** - PDF 文档解析

### 前端
- **React 18** + **TypeScript**
- **Vite** - 构建工具
- **Tailwind CSS** - 样式框架
- **shadcn/ui** - UI 组件库
- **Zustand** - 状态管理
- **React Markdown** - Markdown 渲染

## 快速开始

### 环境要求
- Python 3.10+
- Node.js 18+

### 方式一：一键启动 (推荐)

#### Windows
```bash
# 双击运行
start.bat

# 或使用 PowerShell
.\start.ps1

# 仅启动后端
.\start.ps1 -BackendOnly

# 仅启动前端
.\start.ps1 -FrontendOnly

# 自定义端口
.\start.ps1 -BackendPort 8001 -FrontendPort 5174
```

### 方式二：手动启动

#### 后端

```bash
cd backend

# 创建虚拟环境
python -m venv venv

# Windows 激活虚拟环境
venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### 前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:5173

## 配置说明

### 环境变量

创建 `backend/.env` 文件：

```env
# SiliconFlow API (必需)
SILICONFLOW_API_KEY=your_siliconflow_api_key

# Jina AI (可选，用于网页提取)
JINA_API_KEY=your_jina_api_key

# 默认模型 (可选)
DEFAULT_MODEL=deepseek-ai/DeepSeek-V3.2
```

获取 API Key: https://cloud.siliconflow.cn/

## 使用指南

### 1. 设置 API Key

首次使用时，点击右上角设置按钮，填入你的 SiliconFlow API Key。

### 2. 选择模型

在设置中选择合适的模型：

**DeepSeek 系列 (推荐)**
- **DeepSeek-V3.2** - 最新版本，综合性能最强
- **DeepSeek-V3** - V3 正式版
- **DeepSeek-R1** - 推理专用模型
- **DeepSeek-V2.5** - 性价比之选

**Qwen3 系列**
- **Qwen3-235B-Instruct** - Qwen3 旗舰指令版
- **Qwen3-235B-Thinking** - Qwen3 旗舰推理版
- **Qwen3-32B/14B/8B** - 不同规模模型

**Qwen2.5 系列**
- **Qwen2.5-72B** - 中英双语均衡
- **Qwen2.5-Coder-32B** - 代码专用

**GLM 系列**
- **GLM-4.6** - 智谱最新模型
- **GLM-4-32B/9B** - 不同规模

**Kimi 系列**
- **Kimi-K2.5** - Moonshot 最新模型
- **Kimi-K2-Thinking** - 推理专用

**其他**
- **QwQ-32B** - 推理模型
- **MiniMax-M2** - MiniMax 模型

### 3. 开始研究

在左侧输入框中输入研究问题，支持超长文本（最多 50,000 字符）：
- "2024年人工智能芯片市场发展趋势"
- "新能源汽车电池技术最新突破"
- "量子计算在药物研发中的应用"

点击发送或按 Enter，AI 将自动执行多阶段研究流程：
1. **规划** - 分析查询并生成搜索策略
2. **搜索** - 使用 DuckDuckGo 执行搜索
3. **搜索分析** - 分析结果，判断是否需要补充搜索
4. **迭代** (可选) - 根据分析结果补充搜索
5. **深度分析** - 对所有信息进行综合分析
6. **综合总结** - 生成结构化报告

### 4. 查看报告

右侧报告区将显示：
- **核心摘要** - 关键结论
- **研究路径** - AI 执行的关键步骤
- **关键发现** - 带来源编号的事实
- **多维分析** - 技术/商业/风险/伦理视角
- **未解问题** - 研究中发现的开放性问题
- **参考文献** - 可点击的完整来源列表

### 5. 查看控制台

底部控制台面板显示：
- 工具调用记录
- 搜索分析摘要
- 深度分析洞察
- 执行进度和状态

## 项目结构

```
deep-research-platform/
├── start.bat                   # Windows 一键启动脚本
├── start.ps1                   # PowerShell 启动脚本
├── backend/                    # FastAPI 后端
│   ├── agent/                  # Agent 工作流
│   │   ├── workflow.py         # 核心研究流程 (多阶段迭代)
│   │   ├── llm.py             # LLM 配置
│   │   └── __init__.py
│   ├── tools/                  # 工具实现
│   │   ├── search.py          # DuckDuckGo 搜索
│   │   ├── search_duckduckgo.py # DuckDuckGo 实现
│   │   ├── scrape.py          # Jina AI 网页提取
│   │   └── pdf.py             # PyMuPDF PDF 分析
│   ├── models/                 # Pydantic 模型
│   ├── prompts/                # 系统提示词
│   │   ├── system_prompt.txt
│   │   ├── planning_prompt.txt
│   │   ├── search_analysis_prompt.txt  # 搜索分析阶段
│   │   ├── deep_analysis_prompt.txt    # 深度分析阶段
│   │   └── synthesis_prompt.txt
│   ├── main.py                 # FastAPI 入口
│   └── requirements.txt
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── components/         # UI 组件
│   │   │   ├── ResearchChat.tsx    # 研究聊天 (支持超长文本)
│   │   │   ├── ReportViewer.tsx    # 报告查看器
│   │   │   ├── ConsolePanel.tsx    # 控制台面板
│   │   │   ├── ProgressBar.tsx
│   │   │   └── SettingsPanel.tsx
│   │   ├── stores/             # Zustand 状态
│   │   ├── services/           # API 服务
│   │   └── types/              # TypeScript 类型
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## 多阶段研究工作流

本系统采用 ReAct (Reasoning + Acting) 风格的迭代工作流：

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   规划阶段   │ -> │   搜索阶段   │ -> │ 搜索分析阶段 │
│  Planning   │    │  Searching  │    │   Analysis  │
└─────────────┘    └─────────────┘    └──────┬──────┘
                                             │
                    ┌────────────────────────┘
                    │ (如需补充搜索)
                    ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  综合总结阶段 │ <- │  深度分析阶段 │ <- │  内容抓取阶段 │
│ Synthesizing│    │Deep Analysis│    │   Scraping  │
└─────────────┘    └─────────────┘    └─────────────┘
```

### 各阶段说明

1. **规划阶段 (Planning)**
   - LLM 分析用户查询
   - 生成 3-5 个搜索子查询
   - 制定研究策略

2. **搜索阶段 (Searching)**
   - 使用 DuckDuckGo 执行搜索
   - 收集多个来源的信息
   - 去重和排序结果

3. **搜索分析阶段 (Search Analysis)**
   - LLM 分析搜索结果质量
   - 识别信息缺口
   - 决定是否需要补充搜索
   - 如需要，生成新的搜索查询

4. **迭代阶段 (Iteration)** - 可选
   - 根据分析结果执行补充搜索
   - 最多 2 轮迭代

5. **深度分析阶段 (Deep Analysis)**
   - 对所有收集的信息进行综合分析
   - 识别主题、趋势、模式
   - 分析不同观点间的关系
   - 评估证据质量

6. **内容抓取阶段 (Scraping)**
   - 抓取前 5 个关键来源的详细内容
   - 提取完整文章内容

7. **综合总结阶段 (Synthesizing)**
   - 基于深度分析洞察生成报告
   - 结构化输出 (摘要/发现/分析/参考文献)
   - 每个论断标注来源引用

## API 文档

### 启动研究

```http
POST /api/research
Content-Type: application/json

{
  "query": "研究问题",
  "settings": {
    "api_key": "your_api_key",
    "model": "deepseek-ai/DeepSeek-V3.2",
    "search_days": 30,
    "max_results": 10,
    "enable_pdf": true,
    "language": "zh"
  }
}
```

返回 SSE 流，事件类型：
- `status` - 状态更新 (规划/搜索/分析/总结)
- `tool_call` - 工具调用 (search_web/scrape_url)
- `tool_result` - 工具结果
- `thinking` - LLM 思考/分析摘要
- `complete` - 研究完成
- `error` - 错误信息

### 获取模型列表

```http
GET /api/models
```

### 健康检查

```http
GET /health
```

## 开发计划

- [x] MVP 版本：基础搜索 + 报告生成
- [x] 实时控制台与流式输出
- [x] DuckDuckGo 搜索集成
- [x] 超长文本输入支持 (50,000 字符)
- [x] 多阶段迭代研究工作流
- [ ] 多轮对话支持
- [ ] 研究历史保存
- [ ] 报告导出 (PDF/Markdown)
- [ ] 高级搜索筛选
- [ ] 团队协作功能
- [ ] 自定义提示词

## 常见问题

### Q: API Key 安全吗？
A: API Key 仅存储在浏览器本地存储中，不会发送到除 SiliconFlow 之外的任何服务器。

### Q: 研究需要多长时间？
A: 通常需要 30-180 秒，取决于查询复杂度、迭代次数和网络状况。

### Q: 支持哪些语言？
A: 目前主要支持中文和英文研究。

### Q: 为什么使用 DuckDuckGo 而不是 Google？
A: DuckDuckGo 提供免费的搜索 API，无需注册即可使用，保护用户隐私。

### Q: 超长文本输入有什么限制？
A: 目前支持最多 50,000 字符，输入框会自动调整高度，超过 400px 后显示滚动条。

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 致谢

- [SiliconFlow](https://siliconflow.cn/) - 提供大模型 API
- [LangChain](https://langchain.com/) - LLM 应用框架
- [shadcn/ui](https://ui.shadcn.com/) - UI 组件库
- [DuckDuckGo](https://duckduckgo.com/) - 隐私保护搜索引擎

---

Made with ❤️ by DeepResearch Team
