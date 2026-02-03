## 问题诊断报告

**根本原因分析：**
DuckDuckGo 在中国大陆网络环境下存在 TLS 握手失败问题，错误信息显示 `TLS handshake failed unexpected EOF`，这是由于网络防火墙对境外搜索引擎的阻断导致。

**当前架构问题：**
1. 仅支持 DuckDuckGo 和 SerpAPI 两种搜索引擎
2. 无搜索引擎切换功能
3. 日志系统不完善，难以追踪问题

---

## 实施方案

### 阶段一：后端搜索引擎集成

**1. 创建 Bing 搜索模块** (`tools/search_bing.py`)
- 使用 Bing Web Search API v7.0
- 需要配置 `BING_SEARCH_API_KEY` 环境变量
- 支持中文搜索和结果过滤
- 实现与现有接口兼容的数据格式

**2. 创建百度搜索模块** (`tools/search_baidu.py`)
- 使用百度搜索 API（需要申请开发者账号）
- 或实现百度搜索结果页面解析（备用方案）
- 配置 `BAIDU_API_KEY` 环境变量
- 针对中文内容优化

**3. 重构搜索主模块** (`tools/search.py`)
- 添加搜索引擎枚举类型：`bing`, `baidu`, `duckduckgo`, `serpapi`
- 实现统一的 `search_web()` 接口，支持 `engine` 参数
- 添加搜索引擎自动回退机制
- 完善错误处理和日志记录

**4. 更新配置模型** (`models/schemas.py`)
```python
class SearchEngine(str, Enum):
    BING = "bing"
    BAIDU = "baidu"
    DUCKDUCKGO = "duckduckgo"
    SERPAPI = "serpapi"

class Settings(BaseModel):
    # ... 现有字段
    search_engine: SearchEngine = Field(
        default=SearchEngine.BING,
        description="搜索引擎选择"
    )
```

**5. 更新工作流** (`agent/workflow.py`)
- 接收并传递搜索引擎参数
- 根据选择的引擎调用对应搜索方法

---

### 阶段二：前端搜索引擎切换功能

**1. 更新类型定义** (`types/index.ts`)
```typescript
export type SearchEngine = 'bing' | 'baidu' | 'duckduckgo' | 'serpapi'

export interface Settings {
  // ... 现有字段
  searchEngine: SearchEngine
}
```

**2. 创建设置面板组件** (`components/SearchEngineSelector.tsx`)
- 下拉菜单选择搜索引擎
- 显示各引擎状态（可用/不可用）
- 保存用户偏好到 localStorage

**3. 更新 API 服务** (`services/api.ts`)
- 在请求中传递搜索引擎参数

**4. 更新状态管理** (`stores/researchStore.ts`)
- 添加搜索引擎状态
- 持久化用户选择

---

### 阶段三：日志系统建设

**1. 后端日志模块** (`utils/logger.py`)
- 统一的日志格式（JSON）
- 分级日志：DEBUG, INFO, WARNING, ERROR
- 分类日志：
  - `api_requests.log` - API 请求/响应
  - `errors.log` - 错误日志
  - `user_actions.log` - 用户操作
  - `system.log` - 系统状态

**2. 日志中间件** (`middleware/logging.py`)
- 自动记录所有 API 请求
- 记录请求参数、响应状态、耗时

**3. 前端日志面板** (`components/LogViewer.tsx`)
- 实时显示后端日志
- 支持日志过滤和搜索
- 日志级别筛选

---

### 阶段四：测试与优化

**1. 功能测试**
- Bing 搜索功能验证
- 百度搜索功能验证
- 搜索引擎切换功能验证
- 回退机制验证

**2. 错误处理测试**
- 网络异常场景
- API 限制场景
- 无效 API Key 场景

**3. 性能测试**
- 搜索响应时间
- 并发搜索稳定性

---

## 环境变量配置

```bash
# Bing Search API
BING_SEARCH_API_KEY=your_bing_api_key

# Baidu Search API
BAIDU_API_KEY=your_baidu_api_key
BAIDU_SECRET_KEY=your_baidu_secret_key

# 默认搜索引擎
DEFAULT_SEARCH_ENGINE=bing

# 日志级别
LOG_LEVEL=INFO
```

## 文件变更清单

**新增文件：**
- `backend/tools/search_bing.py`
- `backend/tools/search_baidu.py`
- `backend/utils/logger.py`
- `backend/middleware/logging.py`
- `frontend/src/components/SearchEngineSelector.tsx`
- `frontend/src/components/LogViewer.tsx`

**修改文件：**
- `backend/tools/search.py` - 重构搜索引擎调度
- `backend/models/schemas.py` - 添加搜索引擎配置
- `backend/agent/workflow.py` - 支持搜索引擎参数
- `backend/main.py` - 添加日志中间件
- `frontend/src/types/index.ts` - 添加搜索引擎类型
- `frontend/src/services/api.ts` - 传递搜索引擎参数
- `frontend/src/stores/researchStore.ts` - 管理搜索引擎状态
- `frontend/src/components/SettingsPanel.tsx` - 添加搜索引擎选择

**预计工作量：** 约 4-6 小时

请确认此方案后，我将开始实施具体代码修改。