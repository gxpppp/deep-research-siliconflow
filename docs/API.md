# DeepResearch Platform API 文档

## 基础信息

- **Base URL**: `http://localhost:8000`
- **API 文档**: `http://localhost:8000/docs` (Swagger UI)
- **内容类型**: `application/json`

## 端点概览

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/research` | 启动研究 (SSE) |
| GET | `/api/models` | 获取模型列表 |
| GET | `/health` | 健康检查 |

---

## 1. 启动研究

启动一个新的研究任务，返回 SSE 流式响应。

### 请求

```http
POST /api/research
Content-Type: application/json
```

### 请求体

```typescript
{
  "query": string,           // 研究查询 (必需)
  "settings": {
    "api_key": string,       // SiliconFlow API Key (必需)
    "model": string,         // 模型名称 (可选, 默认: deepseek-ai/DeepSeek-V2.5)
    "search_days": number,   // 搜索时间范围 (可选, 默认: 30)
    "max_results": number,   // 最大搜索结果数 (可选, 默认: 10)
    "enable_pdf": boolean,   // 启用 PDF 分析 (可选, 默认: true)
    "language": string       // 语言 (可选, 默认: "zh")
  }
}
```

### 请求示例

```bash
curl -X POST "http://localhost:8000/api/research" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "2024年人工智能芯片市场发展趋势",
    "settings": {
      "api_key": "sk-your-api-key",
      "model": "deepseek-ai/DeepSeek-V2.5",
      "search_days": 30,
      "max_results": 10,
      "enable_pdf": true,
      "language": "zh"
    }
  }'
```

### SSE 响应

返回 `text/event-stream` 类型的流式响应。

#### 事件类型

##### 1. `status` - 状态更新

```json
{
  "research_id": "uuid-string",
  "status": "planning|searching|analyzing|synthesizing|completed|error",
  "stage": "规划|搜索|分析|总结|完成",
  "progress": 10,
  "message": "正在分析查询并制定研究计划..."
}
```

**示例**:
```
event: status
data: {"research_id": "550e8400-e29b-41d4-a716-446655440000", "status": "planning", "stage": "规划", "progress": 10, "message": "正在分析查询并制定研究计划..."}
```

##### 2. `tool_call` - 工具调用

```json
{
  "tool": "search_web|scrape_url",
  "query": "搜索查询",        // 当 tool 为 search_web 时
  "url": "https://example.com", // 当 tool 为 scrape_url 时
  "progress": 25
}
```

**示例**:
```
event: tool_call
data: {"tool": "search_web", "query": "2024年AI芯片市场规模", "progress": 25}
```

##### 3. `tool_result` - 工具结果

```json
{
  "tool": "search_web|scrape_url",
  "success": true,
  "result_count": 8,          // 当 tool 为 search_web 时
  "data": [...],              // 结果数据
  "error": "错误信息"          // 当 success 为 false 时
}
```

**示例**:
```
event: tool_result
data: {"tool": "search_web", "success": true, "result_count": 8, "data": [{"title": "...", "link": "...", "snippet": "..."}]}
```

##### 4. `thinking` - LLM 思考/分析

```json
{
  "content": "搜索分析摘要或深度分析洞察..."
}
```

**示例**:
```
event: thinking
data: {"content": "搜索分析: 已获取8条相关结果，涵盖市场规模、主要厂商和趋势预测..."}
```

##### 5. `complete` - 研究完成

```json
{
  "research_id": "uuid-string",
  "query": "原始查询",
  "report": {
    "summary": "核心摘要...",
    "research_path": ["步骤1", "步骤2"],
    "key_findings": ["发现1", "发现2"],
    "multi_dimensional_analysis": {},
    "open_questions": ["问题1"],
    "references": ["[1] 来源..."],
    "raw_content": "完整报告 Markdown"
  },
  "sources": [
    {
      "index": 1,
      "title": "来源标题",
      "source_name": "网站名称",
      "date": "2024-01-01",
      "url": "https://example.com"
    }
  ],
  "tool_calls": [...],
  "tool_results": [...],
  "duration_ms": 45000,
  "iterations": 2,
  "total_searches": 15
}
```

##### 6. `error` - 错误

```json
{
  "status": "error|timeout",
  "message": "错误描述"
}
```

**示例**:
```
event: error
data: {"status": "error", "message": "研究过程中出现错误: API 请求失败"}
```

### 完整 SSE 流示例

```
event: status
data: {"research_id": "550e8400-e29b-41d4-a716-446655440000", "status": "planning", "stage": "规划", "progress": 10, "message": "正在分析查询并制定研究计划..."}

event: status
data: {"status": "searching", "stage": "搜索", "progress": 20, "message": "第1轮搜索: 执行 4 个查询..."}

event: tool_call
data: {"tool": "search_web", "query": "2024年人工智能芯片市场发展趋势", "progress": 20}

event: tool_result
data: {"tool": "search_web", "success": true, "result_count": 8, "data": [...]}

event: tool_call
data: {"tool": "search_web", "query": "AI芯片市场规模预测 2024", "progress": 25}

event: tool_result
data: {"tool": "search_web", "success": true, "result_count": 6, "data": [...]}

event: status
data: {"status": "analyzing", "stage": "搜索分析", "progress": 35, "message": "第1轮: 分析搜索结果，判断是否需要补充搜索..."}

event: thinking
data: {"content": "搜索分析: 已获取14条相关结果，涵盖市场规模、主要厂商和趋势预测，信息较为全面..."}

event: status
data: {"status": "analyzing", "stage": "深度分析", "progress": 55, "message": "正在对所有信息进行深度分析..."}

event: thinking
data: {"content": "深度分析完成: 识别出3个关键主题：市场规模增长、技术竞争格局、产业链变化..."}

event: status
data: {"status": "analyzing", "stage": "内容抓取", "progress": 70, "message": "正在抓取关键来源的详细内容..."}

event: tool_call
data: {"tool": "scrape_url", "url": "https://example.com/article", "progress": 70}

event: tool_result
data: {"tool": "scrape_url", "success": true, "title": "文章标题", "data": {"content_length": 3500}}

event: status
data: {"status": "synthesizing", "stage": "综合总结", "progress": 80, "message": "正在生成最终研究报告..."}

event: status
data: {"status": "completed", "stage": "完成", "progress": 100, "message": "研究完成！"}

event: complete
data: {"research_id": "550e8400-e29b-41d4-a716-446655440000", "query": "2024年人工智能芯片市场发展趋势", "report": {...}, "sources": [...], "duration_ms": 52000, "iterations": 1, "total_searches": 14}
```

---

## 2. 获取模型列表

获取可用的 LLM 模型列表。

### 请求

```http
GET /api/models
```

### 响应

```typescript
{
  "models": [
    {
      "value": "deepseek-ai/DeepSeek-V2.5",
      "label": "DeepSeek-V2.5",
      "description": "强推理能力，适合复杂分析"
    },
    {
      "value": "Qwen/Qwen2-72B-Instruct",
      "label": "Qwen2-72B",
      "description": "中英双语均衡"
    }
  ]
}
```

### 示例

```bash
curl "http://localhost:8000/api/models"
```

**响应**:
```json
{
  "models": [
    {
      "value": "deepseek-ai/DeepSeek-V2.5",
      "label": "DeepSeek-V2.5",
      "description": "强推理能力，适合复杂分析"
    },
    {
      "value": "Qwen/Qwen2-72B-Instruct",
      "label": "Qwen2-72B",
      "description": "中英双语均衡"
    },
    {
      "value": "meta-llama/Meta-Llama-3.1-70B-Instruct",
      "label": "Llama-3.1-70B",
      "description": "英文内容优先"
    },
    {
      "value": "THUDM/glm-4-9b-chat",
      "label": "GLM-4-9B",
      "description": "轻量快速"
    }
  ]
}
```

---

## 3. 健康检查

检查服务是否正常运行。

### 请求

```http
GET /health
```

### 响应

```typescript
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 示例

```bash
curl "http://localhost:8000/health"
```

**响应**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## 数据模型

### ResearchRequest

```typescript
interface ResearchRequest {
  query: string;
  settings: ResearchSettings;
}

interface ResearchSettings {
  api_key: string;
  model?: string;
  search_days?: number;
  max_results?: number;
  enable_pdf?: boolean;
  language?: string;
}
```

### ResearchResponse

```typescript
interface ResearchResponse {
  researchId: string;
  status: 'completed' | 'error' | 'timeout';
  query: string;
  report: Report;
  sources: Source[];
  progressPercent: number;
  durationMs: number;
}

interface Report {
  summary: string;
  research_path: string[];
  key_findings: string[];
  multi_dimensional_analysis: Record<string, any>;
  open_questions: string[];
  references: string[];
  raw_content: string;
}

interface Source {
  index: number;
  title: string;
  source_name: string;
  date: string;
  url: string;
}
```

### ToolCall

```typescript
interface ToolCall {
  tool: 'search_web' | 'scrape_url';
  query?: string;
  url?: string;
  timestamp: string;
}
```

### ToolResult

```typescript
interface ToolResult {
  tool: 'search_web' | 'scrape_url';
  success: boolean;
  result_count?: number;
  data?: any;
  error?: string;
  durationMs?: number;
}
```

---

## 前端 SSE 消费示例

### 使用 EventSource

```typescript
function startResearchStream(
  query: string,
  settings: ResearchSettings,
  onEvent: (event: SSEEvent) => void,
  onError: (error: Error) => void
): { close: () => void } {
  const controller = new AbortController();
  
  fetch('http://localhost:8000/api/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, settings }),
    signal: controller.signal,
  })
    .then(response => {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      function read(): Promise<void> {
        return reader?.read().then(({ done, value }) => {
          if (done) return;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          let eventType = '';
          let eventData = '';
          
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7);
            } else if (line.startsWith('data: ')) {
              eventData = line.slice(6);
            } else if (line === '' && eventType && eventData) {
              // 解析事件
              const data = JSON.parse(eventData);
              onEvent({ type: eventType, data });
              
              eventType = '';
              eventData = '';
            }
          }
          
          return read();
        });
      }
      
      return read();
    })
    .catch(onError);
  
  return {
    close: () => controller.abort(),
  };
}
```

### React 使用示例

```typescript
import { useCallback } from 'react';
import { useResearchStore } from '@/stores/researchStore';

function useResearch() {
  const { startResearch, updateStatus, setReport, addConsoleLog } = useResearchStore();
  
  const startResearch = useCallback(async (query: string, settings: ResearchSettings) => {
    const researchId = generateId();
    startResearch(researchId);
    
    const abortRef = startResearchStream(
      query,
      settings,
      (event) => {
        switch (event.type) {
          case 'status':
            updateStatus(event.data.status, event.data.stage, event.data.progress, event.data.message);
            break;
          case 'tool_call':
            addConsoleLog('tool_call', `调用工具: ${event.data.tool}`, event.data);
            break;
          case 'tool_result':
            addConsoleLog('tool_result', `工具结果: ${event.data.success ? '成功' : '失败'}`, event.data);
            break;
          case 'thinking':
            addConsoleLog('thinking', event.data.content, event.data);
            break;
          case 'complete':
            setReport(event.data);
            break;
          case 'error':
            console.error('Research error:', event.data);
            break;
        }
      },
      (error) => {
        console.error('Stream error:', error);
      }
    );
    
    return () => abortRef.close();
  }, [startResearch, updateStatus, setReport, addConsoleLog]);
  
  return { startResearch };
}
```

---

## 错误处理

### 常见错误码

| 状态码 | 描述 | 处理建议 |
|--------|------|----------|
| 400 | 请求参数错误 | 检查请求体格式和必填字段 |
| 422 | 验证错误 | 检查字段类型和约束 |
| 500 | 服务器内部错误 | 查看后端日志 |
| 502 | 上游服务错误 | SiliconFlow API 可能不可用 |

### 错误响应格式

```json
{
  "detail": [
    {
      "loc": ["body", "query"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## 限流与配额

### SiliconFlow API 限制

- **免费用户**: 100 请求/分钟
- **付费用户**: 根据套餐不同

### 建议

- 实现客户端限流
- 缓存模型列表
- 错误时实现退避重试
