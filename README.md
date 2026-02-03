# DeepResearch Platform

AI 驱动的深度研究平台，基于 SiliconFlow API 和 LangChain 构建，提供可验证、多角度、带溯源的智能研究分析。

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 功能特性

- **智能研究流程**: 规划 → 搜索 → 分析 → 总结，全流程自动化
- **多源验证**: 交叉比对多个权威来源，确保信息准确性
- **透明溯源**: 每个结论都带来源编号，文末附完整参考文献
- **实时流式输出**: SSE 流式返回研究进度和中间结果
- **多模型支持**: 支持 DeepSeek、Qwen、Llama 等多种大模型
- **PDF 分析**: 支持学术论文、财报等 PDF 文档解析
- **安全设计**: API Key 本地存储，XSS 过滤，URL 安全校验

## 技术栈

### 后端
- **FastAPI** - 高性能 Python Web 框架
- **LangChain** - LLM 应用开发框架
- **SiliconFlow API** - 大模型推理服务 (OpenAI 兼容)
- **SerpAPI** - Google 搜索 API
- **Jina AI Reader** - 网页内容提取
- **PyMuPDF** - PDF 文档解析
- **Redis** - 缓存 (可选)

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
- Docker & Docker Compose (可选)

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/deepresearch-platform.git
cd deepresearch-platform
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入你的 API 密钥
nano .env
```

必需的环境变量：
```env
# SiliconFlow API (必需)
SILICONFLOW_API_KEY=your_siliconflow_api_key

# SerpAPI (必需，用于搜索)
SERPAPI_KEY=your_serpapi_key

# Jina AI (可选，用于网页提取)
JINA_API_KEY=your_jina_api_key
```

### 3. 方式一：Docker 部署 (推荐)

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

访问：
- 前端: http://localhost:5173
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs

### 4. 方式二：本地开发

#### 后端

```bash
cd backend

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
python main.py
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

## 使用指南

### 1. 设置 API Key

首次使用时，点击右上角设置按钮，填入你的 SiliconFlow API Key。

获取 API Key: https://cloud.siliconflow.cn/

### 2. 选择模型

在设置中选择合适的模型：
- **DeepSeek-V2.5** (推荐) - 强推理能力，适合复杂分析
- **Qwen2-72B** - 中英双语均衡
- **Llama-3.1-70B** - 英文内容优先
- **GLM-4-9B** - 轻量快速

### 3. 开始研究

在左侧输入框中输入研究问题，例如：
- "2024年人工智能芯片市场发展趋势"
- "新能源汽车电池技术最新突破"
- "量子计算在药物研发中的应用"

点击发送或按 Enter，AI 将自动：
1. 规划研究策略
2. 搜索相关信息
3. 深度分析来源
4. 生成结构化报告

### 4. 查看报告

右侧报告区将显示：
- **核心摘要** - 150字以内的关键结论
- **研究路径** - AI 执行的关键步骤
- **关键发现** - 带来源编号的事实
- **多维分析** - 技术/商业/风险/伦理视角
- **参考文献** - 可点击的完整来源列表

## 项目结构

```
deep-research-platform/
├── backend/                    # FastAPI 后端
│   ├── agent/                  # Agent 工作流
│   │   ├── workflow.py         # 核心研究流程
│   │   ├── llm.py             # LLM 配置
│   │   └── prompts.py         # 提示词管理
│   ├── tools/                  # 工具实现
│   │   ├── search.py          # SerpAPI 搜索
│   │   ├── scrape.py          # Jina AI 网页提取
│   │   └── pdf.py             # PyMuPDF PDF 分析
│   ├── models/                 # Pydantic 模型
│   ├── utils/                  # 工具函数
│   │   ├── cache.py           # 缓存实现
│   │   └── security.py        # 安全工具
│   ├── prompts/                # 系统提示词
│   │   └── system_prompt.txt
│   ├── main.py                 # FastAPI 入口
│   └── requirements.txt
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── components/         # UI 组件
│   │   │   ├── ResearchChat.tsx
│   │   │   ├── ReportViewer.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── SettingsPanel.tsx
│   │   ├── stores/             # Zustand 状态
│   │   ├── services/           # API 服务
│   │   └── types/              # TypeScript 类型
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
├── .env.example
└── README.md
```

## API 文档

### 启动研究

```http
POST /api/research
Content-Type: application/json

{
  "query": "研究问题",
  "settings": {
    "api_key": "your_api_key",
    "model": "deepseek-ai/DeepSeek-V2.5",
    "search_days": 30,
    "max_results": 10,
    "enable_pdf": true,
    "language": "zh"
  }
}
```

返回 SSE 流，事件类型：
- `status` - 状态更新
- `tool_call` - 工具调用
- `tool_result` - 工具结果
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

## 配置说明

### 环境变量

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `SILICONFLOW_API_KEY` | 是 | - | SiliconFlow API 密钥 |
| `SERPAPI_KEY` | 是 | - | SerpAPI 密钥 |
| `JINA_API_KEY` | 否 | - | Jina AI 密钥 |
| `DEFAULT_MODEL` | 否 | deepseek-ai/DeepSeek-V2.5 | 默认模型 |
| `CACHE_TYPE` | 否 | memory | 缓存类型 (memory/redis) |
| `TOOL_TIMEOUT` | 否 | 15 | 工具调用超时(秒) |
| `TOTAL_TIMEOUT` | 否 | 120 | 总流程超时(秒) |

### 模型配置

在 `backend/agent/llm.py` 中添加新模型：

```python
{
    "value": "model/path",
    "label": "显示名称",
    "description": "模型描述"
}
```

## 开发计划

- [x] MVP 版本：基础搜索 + 报告生成
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
A: 通常需要 30-120 秒，取决于查询复杂度和网络状况。

### Q: 支持哪些语言？
A: 目前主要支持中文和英文研究。

### Q: 如何获取 SerpAPI Key？
A: 访问 https://serpapi.com/ 注册获取，每月有免费额度。

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

---

Made with ❤️ by DeepResearch Team
